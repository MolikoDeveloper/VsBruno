/* ────────────────────────────── imports  ───────────────────────────── */
import { Clear, Print } from "src/extension";
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


/* ────────────────────────────── clase  ─────────────────────────────── */
export class SandboxNode implements Sandbox {
    /* 1‑shot state */
    private didInit = false;
    private rollup: typeof import("rollup") | null = null;
    private SMC: typeof SourceMapConsumerType | null = null;
    private readonly originalPrepare = Error.prepareStackTrace;

    /* recursos por última ejecución (para stop) */
    private lastSmc: SourceMapConsumerType | null = null;

    constructor(private readonly extensionUri: vscode.Uri) {
        /* desactivar WASM en source‑map siempre */
        process.env.SOURCE_MAP_DISABLE_WASM = "1";
    }

    /* ───────────── API pública ───────────── */
    /** Ejecuta el script y devuelve exports + logs */
    async run(
        opts: RunOptions,
        emit: (evt: any) => void
    ): Promise<ScriptResult> {
        const {
            banner,
            code,
            currentFilePath,
            collectionRoot,
            resolveDir,
            args,
            bruContent,
            scriptStartLine,
            isPre,
        } = opts;

        if (!bruContent) {
            Print("script", "Error getting Bruno Config");
            return { 'logs': [], 'exports': [], 'inbound': () => { } };
        }

        await this.ensureSetup();                       // tsconfig + carpetas
        const rollup = await this.getRollupv2();          // singleton Rollup
        const SourceMapConsumer = await this.getSMC();  // impl JS pura

        const ENTRY_ID = currentFilePath;
        const logs: LogEntry[] = [];

        const pushLog = (kind: LogEntry["kind"], ...values: any[]) => {
            console.log(values)
            const text = values
                .map((v) => (typeof v === "string" ? v : safeStringify(v) || "undefined"))
                .join(" ");
            logs.push({ kind, values: [text] });
            Print("script", `[${kind}] ${text}`);
        };

        /* ── plugin fs via vscode ── */
        const fsPlugin: import("rollup").Plugin = {
            name: "vscode-fs",
            async resolveId(source, importer) {
                if (!source.startsWith(".")) return null;
                const base =
                    !importer || importer === ENTRY_ID || importer.startsWith("\0")
                        ? resolveDir
                        : path.dirname(importer);
                const exts = [".ts", ".js"];
                for (const ext of exts) {
                    const abs = path.resolve(base, source.endsWith(ext) ? source : source + ext);
                    if (abs.startsWith(collectionRoot.fsPath + path.sep)) {
                        try {
                            await vscode.workspace.fs.stat(vscode.Uri.file(abs));
                            return abs;
                        } catch {
                            /* ignore */
                        }
                    }
                }
                return null;
            },
            async load(id) {
                if (!id.startsWith(collectionRoot.fsPath + path.sep)) return null;
                const buf = await vscode.workspace.fs.readFile(vscode.Uri.file(id));
                return buf.toString();
            },
        };

        /* ── entrada virtual ── */
        const virtualPlugin: import("rollup").Plugin = {
            name: "virtual-entry",
            resolveId: (id) => (id === ENTRY_ID ? ENTRY_ID : null),
            load: (id) => {
                if (id !== ENTRY_ID) return null;
                const { outputText } = ts.transpileModule(code, {
                    compilerOptions: {
                        module: ts.ModuleKind.ESNext,
                        target: ts.ScriptTarget.ESNext,
                        esModuleInterop: true,
                    },
                    fileName: currentFilePath,
                });

                const finalCode = `${banner}\n${outputText}\n
                ${isPre ? "" : "module.exports = {__SKIP__: globalThis.__SKIP__, __STOP_ALL__: globalThis.__STOP_ALL__}"}`;
                const lines = finalCode.split(/\r?\n/).length;
                return {
                    code: finalCode,
                    map: {
                        version: 3,
                        file: currentFilePath,
                        sources: [currentFilePath],
                        sourcesContent: [code],
                        names: [],
                        mappings: ";".repeat(lines),
                    },
                };
            },
        };

        /* ── resolución de módulos ── */
        const workspaceRoot =
            vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || resolveDir;
        const modulePaths = vscode.workspace
            .getConfiguration("vs-bruno")
            .get<string[]>("moduleResolutionOrder", ["global", "workspace", "extension"])!
            .map((p) =>
                p === "global"
                    ? path.join(process.cwd(), "node_modules")
                    : p === "workspace"
                        ? path.join(workspaceRoot, "node_modules")
                        : path.join(this.extensionUri.fsPath, "node_modules")
            );

        /* ── bundling ── */
        let cjsCode = "";
        let rawMap: RawSourceMap | null = null;

        try {
            const bundle = await rollup.rollup({
                input: ENTRY_ID,
                external: (id) => !id.startsWith(".") && !path.isAbsolute(id),
                plugins: [
                    virtualPlugin,
                    fsPlugin,
                    nodeResolve({ preferBuiltins: true, moduleDirectories: ["node_modules"], modulePaths }),
                    commonjs(),
                    json({ namedExports: true, preferConst: true, compact: true }),
                    typescript({
                        tsconfig: vscode.Uri.joinPath(this.extensionUri, "dist/sandbox-tsconfig.json").fsPath,
                        tslib: "node_modules/tslib",
                        typescript: ts
                    }),
                ],
                onwarn: (w) => pushLog("warn", new Error(w.message)),
            });
            const { output } = await bundle.generate({
                format: "cjs",
                exports: "auto",
                sourcemap: "inline",
            });
            cjsCode = `${output[0].code}\n//# sourceURL=${currentFilePath.replace(/\\/g, "/")}`;
            rawMap = output[0].map as unknown as RawSourceMap;
        } catch (err: any) {
            pushLog("error", err.message);
            return emptyResult();
        }

        /* ── consumer ── */
        let smc: SourceMapConsumerType | null = null;
        if (rawMap) smc = await new SourceMapConsumer(rawMap);
        this.lastSmc = smc; // para stop()

        Error.prepareStackTrace = (error, frames) => {
            if (!smc) return this.originalPrepare?.(error, frames) ?? String(error);
            return frames
                .map((f) => {
                    const { line, column, source } = smc!.originalPositionFor({
                        line: f.getLineNumber() || 1,
                        column: f.getColumnNumber() || 0,
                    });
                    return `${source}:${(line ?? 0) + scriptStartLine - 1}:${column}`;
                })
                .join("\n");
        };

        /* ── VM ── */
        const sandboxRequire = createRequire(pathToFileURL(currentFilePath).href);
        const context = vm.createContext({
            console: makeConsole(pushLog),
            module: { exports: {} },
            exports: {},
            require: sandboxRequire,
            __dirname: path.dirname(currentFilePath),
            __filename: currentFilePath,
            args,
            bruContent,
            cwd: collectionRoot.fsPath,
            isPre,
            __bruOutbound: (e: any) => emit(e),
        });

        (context as any).__bruInbound = (e: any) => {
            vm.runInContext(`globalThis.__bruInbound(${JSON.stringify(e)})`, context);
        };

        vm.runInContext("globalThis.__bruQueued?.splice(0).forEach(globalThis.__bruOutbound);", context);

        try {
            new vm.Script(cjsCode, { filename: currentFilePath }).runInContext(context);
        } catch (execErr: any) {
            pushLog("error", execErr.message);
        } finally {
            Error.prepareStackTrace = this.originalPrepare;
        }

        return {
            exports: unwrapDefault((context as any).module.exports),
            logs,
            inbound: (e: any) => (context as any).__bruInbound(e),
        };

        /* helper vacío */
        function emptyResult(): ScriptResult {
            return { exports: [], logs, inbound: () => { } };
        }
    }

    /** Libera recursos y revierte `prepareStackTrace` */
    stop() {
        Error.prepareStackTrace = this.originalPrepare;
        if (this.lastSmc && typeof (this.lastSmc as any).destroy === "function") {
            (this.lastSmc as any).destroy();
        }
        this.lastSmc = null;
    }

    /* ────────── helpers internos ────────── */
    private async ensureSetup() {
        if (this.didInit) return;
        await ensureSandboxSetup(this.extensionUri);
        this.didInit = true;
    }

    private async getRollup() {
        if (!this.rollup) {
            try {
                this.rollup = await import("rollup");
            } catch (err: any) {
                vscode.window.showErrorMessage(`Rollup not available: ${err.message}`);
                throw err;
            }
        }
        return this.rollup!;
    }

    private async getRollupv2(): Promise<typeof import("rollup")> {
        if (!this.rollup)// return this.rollup;
        {
            // -- ruta donde Downloader dejó el paquete completo
            const localDir = path.join(this.extensionUri.fsPath, "dist", "vendor", "rollup");
            try {
                // 1. Resolvemos 'rollup' considerando localDir como raíz
                const resolved = createRequire(import.meta.url).resolve("rollup", {
                    paths: [localDir],
                });

                // 2. Lo importamos como ES-module
                this.rollup = await import(pathToFileURL(resolved).href);
                return this.rollup!;
            } catch {
                /* Si falla, probamos la resolución estándar */
            }
        }

        // Fallback: que exista en algún node_modules tradicional
        this.rollup = await import("rollup");
        return this.rollup!;
    }

    private async getSMC() {
        if (!this.SMC) {
            const mod = await import("source-map-js");
            this.SMC = mod.SourceMapConsumer as unknown as typeof SourceMapConsumerType;
        }
        return this.SMC!;
    }
}

/* ───────────────────────── utilidades fuera de la clase ───────────────────── */
async function ensureSandboxSetup(extensionUri: vscode.Uri) {
    const tsconfigUri = vscode.Uri.joinPath(extensionUri, "dist/sandbox-tsconfig.json");
    try {
        await vscode.workspace.fs.stat(tsconfigUri);
    } catch {
        const cfg = {
            compilerOptions: {
                "target": "ES2019",
                "module": "ESNext",
                "moduleResolution": "node",
                "allowJs": true,
                "esModuleInterop": true,
                "skipLibCheck": true,
                "types": ["node"]
            },
        };
        await vscode.workspace.fs.writeFile(
            tsconfigUri,
            Buffer.from(JSON.stringify(cfg, null, 2))
        );
    }

    const nm = vscode.Uri.joinPath(extensionUri, "dist/node_modules");
    try {
        await vscode.workspace.fs.stat(nm);
    } catch {
        await vscode.workspace.fs.createDirectory(nm);
    }
}

function safeStringify(val: any) {
    try {
        return JSON.stringify(val, null, 1);
    } catch {
        return String(val);
    }
}

function makeConsole(push: (k: LogEntry["kind"], ...v: any[]) => void) {
    return {
        log: (...v: any[]) => push("log", ...v),
        warn: (...v: any[]) => push("warn", ...v),
        error: (...v: any[]) => push("error", ...v),
        info: (...v: any[]) => push("info", ...v),
        clear: () => Clear("script")
    };
}
