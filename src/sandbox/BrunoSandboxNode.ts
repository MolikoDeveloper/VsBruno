// src/sandbox/BrunoSandboxNode.ts
import * as vscode from "vscode";
import * as path from "path";
import * as vm from "vm";
import type { RunOptions, Sandbox, LogEntry, ScriptResult } from "./types";
import { transpileToCjs, isEsmSyntax } from "./utils";
import { Print } from "src/extension";
import { unwrapDefault } from "./unwrapDefault";
import esbuild from "esbuild";


// Se crea UNA instancia por ejecución, por lo que no hay “memoria” entre runs
export class SandboxNode implements Sandbox {
    async run({ collectionRoot, code, virtualPath = "inline.js", args }: RunOptions): Promise<ScriptResult> {
      const logs: LogEntry[] = [];
  
      /* ① — plugin para leer archivos del workspace — */
      const fsPlugin: esbuild.Plugin = {
        name: "vscode-fs",
        setup(build) {
          build.onResolve({ filter: /^\.{1,2}\// }, args => {
            const abs = vscode.Uri.joinPath(vscode.Uri.file(args.resolveDir), args.path);
            if (!abs.fsPath.startsWith(collectionRoot.fsPath))
              throw new Error("Access outside collection.bru");
            return { path: abs.fsPath };
          });
          build.onLoad({ filter: /\.[jt]sx?$/ }, async args => {
            const buf = await vscode.workspace.fs.readFile(vscode.Uri.file(args.path));
            return { contents: buf.toString(), loader: "ts" };
          });
        }
      };
  
      /* ② — bundle a CommonJS en memoria — */
      const result = await esbuild.build({
        stdin: { contents: code, resolveDir: collectionRoot.fsPath, sourcefile: virtualPath, loader: "ts" },
        bundle: true,
        platform: "node",
        format: "cjs",
        write: false,
        plugins: [fsPlugin]
      });
  
      const cjs = result.outputFiles[0].text;
  
      /* ③ — proxy de consola para recoger logs — */
      const makeConsole = (kind: LogEntry["kind"]) => (...v: any[]) => {
        logs.push({ kind, values: v });
        Print("script",`[${kind}] ${v.map(x => JSON.stringify(x)).join(" ")}`);
      };
      const consoleProxy = { log: makeConsole("log"), warn: makeConsole("warn"), error: makeConsole("error"), info: makeConsole("info") };
  
      /* ④ — ejecutar con vm — */
      const module = { exports: {} };
      const context = vm.createContext({ module, exports: module.exports, console: consoleProxy, args });
      new vm.Script(cjs, { filename: virtualPath }).runInContext(context);
  
      return { exports: unwrapDefault(module.exports), logs };
    }
  }