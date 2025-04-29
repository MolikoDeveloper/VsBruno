// src/sandbox/SandboxNode.ts
import * as vscode from "vscode";
import { rollup, type Plugin } from "rollup";
import { createFilter } from "@rollup/pluginutils";
import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import ts from "typescript";
import type { RunOptions, Sandbox, ScriptResult, LogEntry } from "./types";
import { unwrapDefault } from "./unwrapDefault";
import { bruPrelude } from "./bruPrelude";
import { Print } from "src/extension";
import path from "path";

export class SandboxNode implements Sandbox {
    async run(opts: RunOptions, emit: (evt: any) => void): Promise<ScriptResult> {
        const { code, virtualPath = "inline.ts", collectionRoot, resolveDir, args } = opts;
        const logs: LogEntry[] = [];

        // 1) plugin para leer archivos del workspace y transpilar TS
        const fsPlugin: Plugin = {
            name: "vscode-fs",
            async resolveId(source: string, importer: string | undefined) {
                // sólo rutas relativas
                if (!source.startsWith(".")) return null;

                // ① determinar el directorio base
                let baseDir: string;
                if (!importer || importer === ENTRY_ID || importer.startsWith("\0")) {
                    // caso inicial: partimos de la carpeta del .bru
                    baseDir = resolveDir;
                } else {
                    // importer es un path absoluto de un archivo ya resuelto
                    baseDir = path.dirname(importer);
                }

                // ② construir path absoluto y normalizar extensión
                const rel = source.endsWith(".js") ? source : `${source}.js`;
                const absFs = path.resolve(baseDir, rel);

                // ③ perímetro: sólo dentro de collectionRoot
                if (!absFs.startsWith(collectionRoot.fsPath + path.sep)) {
                    throw new Error(`Fuera de la carpeta collection.bru: ${absFs}`);
                }

                return absFs;
            },

            async load(id: string) {
                // sólo cargamos archivos dentro del perímetro
                if (!id.startsWith(collectionRoot.fsPath + path.sep)) return null;

                // leer y transpilar TS→JS
                const buf = await vscode.workspace.fs.readFile(vscode.Uri.file(id));
                const src = buf.toString();
                const { outputText } = ts.transpileModule(src, {
                    compilerOptions: {
                        module: ts.ModuleKind.ESNext,
                        target: ts.ScriptTarget.ES2019,
                        esModuleInterop: true,
                    },
                    fileName: id,
                });
                return outputText;
            },
        };

        // 2) plugin virtual para el código inline
        const ENTRY_ID = "\0virtual-entry";
        const virtualPlugin = {
            name: "virtual-entry",
            resolveId(id: string) { return id === ENTRY_ID ? ENTRY_ID : null; },
            load(id: string) {
                if (id === ENTRY_ID) {
                    const transpiled = ts.transpileModule(code, {
                        compilerOptions: {
                            module: ts.ModuleKind.ESNext,
                            target: ts.ScriptTarget.ES2019,
                            esModuleInterop: true
                        },
                        fileName: virtualPath
                    }).outputText;
                    return bruPrelude + "\n" + transpiled;
                }
                return null;
            }
        };

        // 3) generar bundle con Rollup
        const bundle = await rollup({
            input: ENTRY_ID,
            plugins: [
                virtualPlugin,
                fsPlugin,
                nodeResolve({ preferBuiltins: true }),
                commonjs()
            ],
            onwarn: () => { }
        });
        const { output } = await bundle.generate({ format: "cjs" });
        const cjs = output[0].code;

        // 4) preparar VM context y proxy de console
        const pushLog = (k: LogEntry["kind"], ...vals: any[]) => {
            logs.push({ kind: k, values: vals });
            Print('script',
                `[${k}] ${vals.map(x => JSON.stringify(x)).join(" ")}`
            );
        };
        const consoleProxy = {
            log: (...v: any[]) => pushLog("log", ...v),
            warn: (...v: any[]) => pushLog("warn", ...v),
            error: (...v: any[]) => pushLog("error", ...v),
            info: (...v: any[]) => pushLog("info", ...v),
        };

        const vm = await import("vm");
        const context = vm.createContext({
            console: consoleProxy,
            module: { exports: {} },
            exports: {},
            args,
            __bruOutbound: (e: any) => emit(e)
        });

        // 5) vaciar eventos tempranos de bruPrelude
        vm.runInContext(
            "globalThis.__bruQueued?.splice(0).forEach(globalThis.__bruOutbound);",
            context
        );

        // 6) ejecutar el bundle final
        new vm.Script(cjs, { filename: virtualPath }).runInContext(context);

        return {
            exports: unwrapDefault((context as any).module.exports),
            logs
        };
    }
}
