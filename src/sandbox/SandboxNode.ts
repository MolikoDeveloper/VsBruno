// src/sandbox/sandboxNode.ts

import * as vscode from "vscode";
import type { RunOptions, Sandbox, ScriptResult, LogEntry } from "./types";
import { unwrapDefault } from "./unwrapDefault";
import { Print } from "src/extension";
import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import ts from "typescript";
import path from "path";
import { pathToFileURL } from "url";
import vm from "vm";
import { prelude } from "./prelude";
import { rollup } from "rollup";

export const SandboxNode: Sandbox = {
    /**
     * Bundles and runs a snippet in a Node VM, capturing exports and console logs.
     */
    async run(
        opts: RunOptions,
        emit: (evt: any) => void
    ): Promise<ScriptResult> {
        const {
            code,
            virtualPath = "inline.ts",
            collectionRoot,
            resolveDir,
            args,
            extensionUri,
        } = opts;

        const logs: LogEntry[] = [];
        const ENTRY_ID = "\0virtual-entry";

        // 1) Carga dinámica de Rollup desde dist/vendor/rollup.cjs
        let rollupModule: typeof import("rollup");
        try {
            rollupModule = await import("rollup");
        } catch (err) {
            vscode.window.showErrorMessage(
                "Rollup no está disponible. Funcionalidades deshabilitadas."
            );
            return { logs: [], exports: [], inbound: () => { } };
        }

        // 2) fsPlugin para cargar .js desde el workspace y transpilar TS->ESNext
        const fsPlugin: any = {
            name: "vscode-fs",
            async resolveId(source: string, importer: string) {
                if (!source.startsWith(".")) return null;
                const baseDir =
                    !importer || importer === ENTRY_ID || importer.startsWith("\0")
                        ? resolveDir
                        : path.dirname(importer);
                const rel = source.endsWith(".js") ? source : source + ".js";
                const absFs = path.resolve(baseDir, rel);
                if (!absFs.startsWith(collectionRoot.fsPath + path.sep)) {
                    throw new Error(`Fuera de la carpeta collection.bru: ${absFs}`);
                }
                return absFs;
            },
            async load(id: string) {
                if (!id.startsWith(collectionRoot.fsPath + path.sep)) return null;
                const buf = await vscode.workspace.fs.readFile(vscode.Uri.file(id));
                const { outputText } = ts.transpileModule(buf.toString(), {
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

        // 3) virtualPlugin para inyectar el código + prelude
        const virtualPlugin: any = {
            name: "virtual-entry",
            resolveId(id: string) {
                return id === ENTRY_ID ? ENTRY_ID : null;
            },
            load(id: string) {
                if (id === ENTRY_ID) {
                    const transpiled = ts
                        .transpileModule(code, {
                            compilerOptions: {
                                module: ts.ModuleKind.ESNext,
                                target: ts.ScriptTarget.ES2019,
                                esModuleInterop: true,
                            },
                            fileName: virtualPath,
                        })
                        .outputText;
                    return prelude + "\n" + transpiled;
                }
                return null;
            },
        };

        // 4) Bundle con Rollup
        const bundle = await rollupModule.rollup({
            input: ENTRY_ID,
            plugins: [
                virtualPlugin,
                fsPlugin,
                nodeResolve({ preferBuiltins: true }),
                commonjs(),
            ],
            onwarn: () => { },
        });
        const { output } = await bundle.generate({ format: "cjs" });
        const cjs = output[0].code;

        // 5) Proxy para capturar console.*
        const pushLog = (kind: LogEntry["kind"], ...vals: any[]) => {
            logs.push({ kind, values: vals });
            Print("script", `[${kind}] ${vals.map((x) => JSON.stringify(x)).join(" ")}`);
        };
        const consoleProxy = {
            log: (...v: any[]) => pushLog("log", ...v),
            warn: (...v: any[]) => pushLog("warn", ...v),
            error: (...v: any[]) => pushLog("error", ...v),
            info: (...v: any[]) => pushLog("info", ...v),
        };

        // 6) Ejecutar en un VM context
        const context = vm.createContext({
            console: consoleProxy,
            module: { exports: {} },
            exports: {},
            args,
            __bruOutbound: (e: any) => emit(e),
        });

        // give the host a way to push events INTO the sandbox
        context.__bruInbound = (e: any) => {
            // run the small dispatcher defined in the prelude
            vm.runInContext(`globalThis.__bruInbound(${JSON.stringify(e)})`, context);
        };

        // Vacia la cola de prelude
        vm.runInContext(
            "globalThis.__bruQueued?.splice(0).forEach(globalThis.__bruOutbound);",
            context
        );

        // Ejecuta el bundle CJS
        new vm.Script(cjs, { filename: virtualPath }).runInContext(context);

        return {
            exports: unwrapDefault((context as any).module.exports),
            logs,
            inbound: (e: any) => (context as any).__bruInbound(e)
        };
    },
};
