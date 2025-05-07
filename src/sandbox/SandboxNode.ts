import { prelude } from "./prelude";
import { Print } from "src/extension";
import { unwrapDefault } from "./unwrapDefault";
import * as vscode from "vscode";
import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import json from "@rollup/plugin-json";
import path from "path";
import ts from "typescript";
import vm from "vm";
import { createRequire } from "module";
import { pathToFileURL } from "url";
import type { RunOptions, Sandbox, ScriptResult, LogEntry } from "./types";
import type { RawSourceMap, SourceMapConsumer as SourceMapConsumerType } from "source-map";

//   ────────────────────────────────────────────────────────────────────────────
//   Tipos auxiliares
//   ────────────────────────────────────────────────────────────────────────────
export interface RunOptionsWithFile extends RunOptions {
    /** Ruta absoluta del archivo actual en ejecución */
    currentFilePath: string;
    /** URI de la extensión */
    extensionUri: vscode.Uri;
    /** Línea (1‑based) donde empieza el bloque de script en el documento */
    scriptStartLine: number;
}

//   ────────────────────────────────────────────────────────────────────────────
//   Estado global (cache)
//   ────────────────────────────────────────────────────────────────────────────
let didInit = false;                                  // tsconfig + dir creados
let rollupSingleton: typeof import("rollup") | null = null; // instancia de Rollup
let SMC: typeof SourceMapConsumerType | null = null; // impl. JS pura

// Guardamos `prepareStackTrace` original para restaurarlo después de cada run
const originalPrepareStackTrace = Error.prepareStackTrace;

// Forzamos a la lib `source-map` a **no** usar WASM (por si se carga indirectamente)
process.env.SOURCE_MAP_DISABLE_WASM = "1";

//   ────────────────────────────────────────────────────────────────────────────
//   Implementación principal
//   ────────────────────────────────────────────────────────────────────────────
export const SandboxNode: Sandbox = {
    async run(opts: RunOptionsWithFile, emit: (evt: any) => void): Promise<ScriptResult> {
        const {
            code, currentFilePath, collectionRoot,
            resolveDir, args, bruContent,
            extensionUri, scriptStartLine,
        } = opts;

        const logs: LogEntry[] = [];
        const ENTRY_ID = currentFilePath;

        /* ─────────── Helper Logging ─────────── */
        const pushLog = (kind: LogEntry["kind"], ...values: any[]) => {
            const text = values.map(v => typeof v === "string" ? v : safeStringify(v)).join(" | ");
            logs.push({ kind, values: [text] });
            Print("script", `[${kind}] ${text}`);
        };

        /* ─────────── Rollup singleton ───────── */
        if (!rollupSingleton) {
            try { rollupSingleton = await import("rollup"); }
            catch (err) {
                const error = err as Error;
                vscode.window.showErrorMessage(`Rollup not available: ${error.message}`);
                pushLog("error", error);
                return emptyResult();
            }
        }
        const rollup = rollupSingleton!;

        /* ─────────── One‑time setup ─────────── */
        if (!didInit) {
            await ensureSandboxSetup(extensionUri);
            didInit = true;
        }

        /* ─────────── Source‑map consumer (JS) ─── */
        if (!SMC) {
            const mod = await import("source-map-js");
            SMC = mod.SourceMapConsumer as unknown as typeof SourceMapConsumerType;
        }

        /* ─────────── Plugin: FS via VSCode ───── */
        // FIX!
        const fsPlugin: import("rollup").Plugin = {
            name: "vscode-fs",
            async resolveId(source: string, importer?: string) {
                if (source.startsWith(".")) {
                    const base = !importer || importer === ENTRY_ID || importer.startsWith("\0") ? resolveDir : path.dirname(importer!);
                    const exts = [".ts", ".js"];
                    for (const ext of exts) {
                        const abs = path.resolve(base, source.endsWith(ext) ? source : source + ext);
                        if (abs.startsWith(collectionRoot.fsPath + path.sep)) {
                            try {
                                await vscode.workspace.fs.stat(vscode.Uri.file(abs));
                                return abs;
                            } catch {/* ignore */ }
                        }
                    }
                }
                return null;
            },
            async load(id) {
                if (!id.startsWith(collectionRoot.fsPath + path.sep)) return null;
                const buf = await vscode.workspace.fs.readFile(vscode.Uri.file(id));
                return buf.toString();
            }
        };

        /* ─────────── Plugin: entrada virtual ─── */
        const virtualPlugin: import("rollup").Plugin = {
            name: "virtual-entry",
            resolveId(id) { return id === ENTRY_ID ? ENTRY_ID : null; },
            load(id) {
                if (id !== ENTRY_ID) return null;
                const { outputText } = ts.transpileModule(code, {
                    compilerOptions: {
                        module: ts.ModuleKind.ESNext,
                        target: ts.ScriptTarget.ESNext,
                        esModuleInterop: true,
                    },
                    fileName: currentFilePath,
                });
                const jsonString = JSON.stringify(bruContent ?? null)
                    .replace(/<\/script/gi, "<\\/script")
                    .replace(/<!--/g, "<\\!--");
                const injected = prelude
                    .replace("___BRU_CONTENT___", jsonString)
                    .replace("___cwd___", `\"${collectionRoot.fsPath}\"`);
                //return `${injected}\n${outputText}`;
                const finalCode = `${injected}\n${outputText}`;
                const lineCount = finalCode.split(/\r?\n/).length;
                const mappings = ";".repeat(lineCount);
                return {
                    code: finalCode,
                    map: {
                        version: 3,
                        file: currentFilePath,
                        sources: [currentFilePath],
                        sourcesContent: [code],
                        names: [],
                        mappings,
                    }
                };
            }
        };

        /* ─────────── Resolución de módulos ───── */
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const projectRootPath = workspaceFolders?.[0]?.uri.fsPath || resolveDir;
        const moduleOrder = vscode.workspace.getConfiguration("vs-bruno")
            .get<string[]>("moduleResolutionOrder", ["global", "workspace", "extension"]);

        const moduleDirectories = moduleOrder.map(loc => {
            switch (loc) {
                case "global": return "node_modules";
                case "workspace": return path.join(projectRootPath, "node_modules");
                case "extension": return path.join(extensionUri.fsPath, "node_modules");
                default: return loc;
            }
        });

        /* ─────────── Bundling ──────────────── */
        let cjsCode = "";
        let rawMap: RawSourceMap | null = null;
        try {
            const bundle = await rollup.rollup({
                input: ENTRY_ID,
                external: id => !id.startsWith(".") && !path.isAbsolute(id),
                plugins: [
                    virtualPlugin,
                    fsPlugin,
                    nodeResolve({ preferBuiltins: true, moduleDirectories }),
                    commonjs(),
                    json({ namedExports: true, preferConst: true, compact: true }),
                    typescript({
                        tsconfig: vscode.Uri.joinPath(extensionUri, "dist/sandbox-tsconfig.json").fsPath,
                        tslib: "node_modules/tslib",
                    }),
                ],
                onwarn: w => pushLog("warn", new Error(w.message)),
            });
            const { output } = await bundle.generate({ format: "cjs", exports: "auto", sourcemap: "inline" });
            cjsCode = `${output[0].code}\n//# sourceURL=${currentFilePath.replace(/\\/g, "/")}`;
            rawMap = output[0].map as unknown as RawSourceMap;
            console.log(output)
        } catch (err) {
            pushLog("error", err as Error, { phase: "bundle" });
            return emptyResult();
        }

        /* ─────────── Crear consumer ─────────── */
        let smc: SourceMapConsumerType | null = null;
        if (rawMap) smc = await new SMC!(rawMap);

        Error.prepareStackTrace = (error, frames) => {
            if (!smc) return originalPrepareStackTrace?.(error, frames) ?? String(error);
            const out = frames.map(f => {
                const pos = smc!.originalPositionFor({
                    line: f.getLineNumber() || 1,
                    column: f.getColumnNumber() || 0,
                });
                const line = (pos.line ?? 0) + (scriptStartLine - 1);
                return `${pos.source}:${line}:${pos.column}`;
            }).join("\n");
            return out;
        };

        /* ─────────── Contexto de VM ─────────── */
        const sandboxRequire = createRequire(pathToFileURL(currentFilePath).href);
        const context = vm.createContext({
            console: {
                log: (...v: any[]) => pushLog("log", ...v),
                warn: (...v: any[]) => pushLog("warn", ...v),
                error: (...v: any[]) => pushLog("error", ...v),
                info: (...v: any[]) => pushLog("info", ...v),
            },
            module: { exports: {} },
            exports: {},
            require: sandboxRequire,
            __dirname: path.dirname(currentFilePath),
            __filename: currentFilePath,
            args,
            __bruOutbound: (e: any) => emit(e),
        });

        (context as any).__bruInbound = (e: any) => {
            vm.runInContext(`globalThis.__bruInbound(${JSON.stringify(e)})`, context);
        };

        vm.runInContext("globalThis.__bruQueued?.splice(0).forEach(globalThis.__bruOutbound);", context);

        /* ─────────── Ejecución ─────────────── */
        try {
            new vm.Script(cjsCode, { filename: currentFilePath }).runInContext(context);
        } catch (execErr) {
            pushLog("error", execErr as Error, { phase: "execution" });
        } finally {
            Error.prepareStackTrace = originalPrepareStackTrace;
            if (smc && typeof (smc as any).destroy === "function") {
                (smc as any).destroy();
            }
        }

        return {
            exports: unwrapDefault((context as any).module.exports),
            logs,
            inbound: (e: any) => (context as any).__bruInbound(e),
        };

        /* ─────────── Helper vacío ─────────── */
        function emptyResult(): ScriptResult {
            return { exports: [], logs, inbound: () => { } };
        }
    },
};

//   ────────────────────────────────────────────────────────────────────────────
//   Funciones auxiliares
//   ────────────────────────────────────────────────────────────────────────────
async function ensureSandboxSetup(extensionUri: vscode.Uri) {
    const tsconfigUri = vscode.Uri.joinPath(extensionUri, "dist/sandbox-tsconfig.json");
    try { await vscode.workspace.fs.stat(tsconfigUri); }
    catch {
        const cfg = {
            compilerOptions: {
                target: "ES2019",
                module: "ESNext",
                moduleResolution: "node",
                allowJs: true,
                esModuleInterop: true,
                skipLibCheck: true,
                lib: ["ES2019"],
            },
        };
        await vscode.workspace.fs.writeFile(tsconfigUri, Buffer.from(JSON.stringify(cfg, null, 2)));
    }

    const nm = vscode.Uri.joinPath(extensionUri, "dist/node_modules");
    try { await vscode.workspace.fs.stat(nm); }
    catch { await vscode.workspace.fs.createDirectory(nm); }
}

function safeStringify(val: any) {
    try { return JSON.stringify(val); }
    catch { return String(val); }
}
