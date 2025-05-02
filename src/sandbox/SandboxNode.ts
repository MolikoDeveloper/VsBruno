// src/sandbox/SandboxNode.ts
import * as vscode from "vscode";
import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import ts from "typescript";
import path from "path";
import { pathToFileURL } from "url";

import type { RunOptions, Sandbox, ScriptResult, LogEntry } from "./types";
import { unwrapDefault } from "./unwrapDefault";
import { bruPrelude } from "./bruPrelude";
import { Print } from "src/extension";

export const SandboxNode: Sandbox = {
  async run(opts: RunOptions, emit: (evt: any) => void): Promise<ScriptResult> {
    const { code, virtualPath = "inline.ts", collectionRoot, resolveDir, args, extensionUri } = opts;
    const logs: LogEntry[] = [];
    const ENTRY_ID = "\0virtual-entry";

    let rollup;
    try {
      // aquí ya no necesitas getExtension()
      const uri = vscode.Uri.joinPath(extensionUri, "dist", "vendor", "rollup.cjs");
      console.log(uri)
      if(uri){
        ({ rollup } = await import(pathToFileURL(uri.fsPath).toString()));
      }
    } catch(err) {
      console.log(err)
      vscode.window.showErrorMessage("Rollup is not available. Some features may be disabled.");
      return { logs: [], exports: [] };
    }

    const fsPlugin: any = {
      name: "vscode-fs",
      async resolveId(source:any, importer:any) {
        if (!source.startsWith(".")) return null;

        let baseDir: string;
        if (!importer || importer === ENTRY_ID || importer.startsWith("\0")) {
          baseDir = resolveDir;
        } else {
          baseDir = path.dirname(importer);
        }

        const rel = source.endsWith(".js") ? source : `${source}.js`;
        const absFs = path.resolve(baseDir, rel);

        if (!absFs.startsWith(collectionRoot.fsPath + path.sep)) {
          throw new Error(`Fuera de la carpeta collection.bru: ${absFs}`);
        }

        return absFs;
      },

      async load(id:any) {
        if (!id.startsWith(collectionRoot.fsPath + path.sep)) return null;
        const buf = await vscode.workspace.fs.readFile(vscode.Uri.file(id));
        const src = buf.toString();
        const { outputText } = ts.transpileModule(src, {
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2019,
            esModuleInterop: true
          },
          fileName: id
        });
        return outputText;
      }
    };

    const virtualPlugin: any = {
      name: "virtual-entry",
      resolveId(id:any) { return id === ENTRY_ID ? ENTRY_ID : null; },
      load(id:any) {
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

    const bundle = await rollup({
      input: ENTRY_ID,
      plugins: [virtualPlugin, fsPlugin, nodeResolve({ preferBuiltins: true }), commonjs()],
      onwarn: () => {}
    });
    const { output } = await bundle.generate({ format: "cjs" });
    const cjs = output[0].code;

    const pushLog = (k: LogEntry["kind"], ...vals: any[]) => {
      logs.push({ kind: k, values: vals });
      Print("script", `[${k}] ${vals.map(x => JSON.stringify(x)).join(" ")}`);
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

    vm.runInContext("globalThis.__bruQueued?.splice(0).forEach(globalThis.__bruOutbound);", context);
    new vm.Script(cjs, { filename: virtualPath }).runInContext(context);

    return {
      exports: unwrapDefault((context as any).module.exports),
      logs
    };
  }
};
