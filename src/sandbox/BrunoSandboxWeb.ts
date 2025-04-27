import type { RunOptions, Sandbox, LogEntry, ScriptResult } from "./types";
import { unwrapDefault } from "./unwrapDefault";
import { Print } from "src/extension";

// ① — Worker source (string) — incluye esbuild-wasm
const workerSrc = `
importScripts("https://unpkg.com/esbuild-wasm@0.20.0/esbuild.wasm.js");
let service;
onmessage = async (ev) => {
  const { id, root, code, vpath, args } = ev.data;
  if (!service) service = await esbuild.startService({ wasmURL: "https://unpkg.com/esbuild-wasm@0.20.0/esbuild.wasm" });

  const logs = [];
  const makeConsole = k => (...v)=>{ logs.push({kind:k,values:v}); postMessage({ id, type:"log", entry:{kind:k,values:v}}); };
  const fsPlugin = {
    name:"vscode-fs",
    setup(build){
      build.onResolve({filter:/^\\.\\.?\\//}, args=>{
        return { path: new URL(args.path, "file://"+args.resolveDir+"/").pathname };
      });
      build.onLoad({filter:/\\.[jt]sx?$/}, async args=>{
        const res = await fetch("vscode://file"+args.path);      // VS Code FileSystemProvider
        const txt = await res.text();
        return { contents: txt, loader:"ts" };
      });
    }
  };

  try {
    const out = await service.build({
      stdin:{ contents:code, sourcefile:vpath, resolveDir:root, loader:"ts" },
      bundle:true, format:"cjs", write:false, plugins:[fsPlugin]
    });
    const cjs = out.outputFiles[0].text;
    const module={exports:{}};
    const fn = new Function("module","exports","console","args", cjs);
    await fn(module, module.exports, {
      log: makeConsole("log"), warn: makeConsole("warn"),
      error: makeConsole("error"), info: makeConsole("info")
    }, args);
    postMessage({ id, type:"result", exports: module.exports, logs });
  } catch(e){ postMessage({id,type:"error", error:String(e)}) }
};
`;

export class SandboxWeb implements Sandbox {
  async run({ collectionRoot, code, virtualPath = "inline.js", args }: RunOptions): Promise<ScriptResult> {
    const blob = new Blob([workerSrc], { type: "text/javascript" });
    const worker = new Worker(URL.createObjectURL(blob), { type: "module" });

    return new Promise((resolve, reject) => {
      const id = Math.random();
      worker.onmessage = ev => {
        if (ev.data.id !== id) return;
        if (ev.data.type === "log") {
          const entry: LogEntry = ev.data.entry;
          Print("script",`[${entry.kind}] ${entry.values.map(x=>JSON.stringify(x)).join(" ")}`);
        }
        if (ev.data.type === "result") {
          resolve({ exports: unwrapDefault(ev.data.exports), logs: ev.data.logs });
          worker.terminate();
        }
        if (ev.data.type === "error") {
          reject(ev.data.error); worker.terminate();
        }
      };
      worker.postMessage({ id, root: collectionRoot.fsPath, code, vpath: virtualPath, args });
    });
  }
}
