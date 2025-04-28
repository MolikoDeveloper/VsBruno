import * as vscode from "vscode";
import * as vm from "vm";
import esbuild from "esbuild";
import type { RunOptions, Sandbox, ScriptResult, LogEntry } from "./types";
import { unwrapDefault } from "./unwrapDefault";
import { readFileSync } from "fs";
import * as path from "path"
import { Print } from "src/extension";


export class SandboxNode implements Sandbox {
  async run(opts: RunOptions, emit: (evt: any) => void): Promise<ScriptResult> {
    const { code, virtualPath = "inline.js", collectionRoot, resolveDir, args } = opts;
    const logs: LogEntry[] = [];


    const preludeSrc = readFileSync(
      path.join(__dirname, "sandbox", "prelude.cjs"),      // se compila en empaquetado
      "utf8"
    );

    /* Plugin de lectura */
    const fsPlugin: esbuild.Plugin = {
      name: "vscode-fs",
      setup(build) {
        build.onResolve({ filter: /^\.{1,2}\// }, args2 => {
          const abs = vscode.Uri.joinPath(vscode.Uri.file(args2.resolveDir), args2.path);
          if (!abs.fsPath.startsWith(collectionRoot.fsPath))
            throw new Error("Access outside collection.bru");
          return { path: abs.fsPath };
        });
        build.onLoad({ filter: /\.[jt]sx?$/ }, async args2 => {
          const buf = await vscode.workspace.fs.readFile(vscode.Uri.file(args2.path));
          return { contents: buf.toString(), loader: "ts" };
        });
      }
    };

    const out = await esbuild.build({
      stdin: { contents: code, sourcefile: virtualPath, resolveDir, loader: "ts" },
      bundle: true,
      format: "cjs",
      platform: "node",
      write: false,
      banner: { js: preludeSrc },
      plugins: [fsPlugin],
    });

    const fullScript = out.outputFiles[0].text;

    /* Proxy console */
    const push = (k: LogEntry["kind"], ...v: any[]) => {
      logs.push({ kind: k, values: v });
      Print("script", `[${k}] ${v.map(x => JSON.stringify(x)).join(" ")}`);
    };
    const consoleProxy = {
      log: (...v: any[]) => push("log", ...v),
      warn: (...v: any[]) => push("warn", ...v),
      error: (...v: any[]) => push("error", ...v),
      info: (...v: any[]) => push("info", ...v)
    };

    /* Outbound handler */
    let queued: any[] = [];
    const context = vm.createContext({
      console: consoleProxy,
      module: { exports: {} },
      exports: {},
      args,
      __bruOutbound: (e: any) => emit(e)
    });

    /* vaciar eventos tempranos */
    vm.runInContext("globalThis.__bruQueued?.splice(0).forEach(globalThis.__bruOutbound);", context);

    new vm.Script(fullScript, { filename: virtualPath }).runInContext(context);

    return { exports: unwrapDefault((context as any).module.exports), logs };
  }
}
