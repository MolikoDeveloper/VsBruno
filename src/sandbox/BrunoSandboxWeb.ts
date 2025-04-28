import type { RunOptions, Sandbox, ScriptResult, LogEntry } from "./types";
import { unwrapDefault } from "./unwrapDefault";

const workerSource = /*  */ `
importScripts("https://unpkg.com/esbuild-wasm@0.20.0/esbuild.wasm.js");
let service;
onmessage = async (ev) => {
  const { id, root, resolveDir, code, vpath, args } = ev.data;
  if (!service) service = await esbuild.startService({ wasmURL:"https://unpkg.com/esbuild-wasm@0.20.0/esbuild.wasm" });
  const fsPlugin = {
    name:"fs",
    setup(b){
      b.onResolve({filter:/^\\.\\.?\\//}, a=>({path:new URL(a.path,"file://"+a.resolveDir+"/").pathname}));
      b.onLoad({filter:/\\.[jt]sx?$/}, async a=>{
        const r = await fetch("vscode://file"+a.path); const t = await r.text();
        return { contents:t, loader:"ts" };
      });
    }
  };
  try{
    const out = await service.build({
      stdin:{contents:code,sourcefile:vpath,resolveDir,loader:"ts"},
      bundle:true,format:"cjs",write:false,plugins:[fsPlugin]
    });
    globalThis.__bruOutbound = e=> postMessage({id,type:"evt",evt:e});
    globalThis.__bruQueued?.splice(0).forEach(globalThis.__bruOutbound);
    const final = bruPrelude + "\\n" + out.outputFiles[0].text;
    const module={exports:{}};
    await new Function("module","exports","args","console", final)(
      module, module.exports, args, console
    );
    postMessage({id,type:"done",exports:module.exports});
  }catch(e){ postMessage({id,type:"err",err:String(e)}) }
};
`;

export class SandboxWeb implements Sandbox {
  async run(opts: RunOptions, emit: (evt: any) => void): Promise<ScriptResult> {
    const { collectionRoot, code, virtualPath = "inline.js", resolveDir, args } = opts;
    const logs: LogEntry[] = [];
    const blob = new Blob([workerSource], { type: "module" });
    const worker = new Worker(URL.createObjectURL(blob), { type: "module" });

    return new Promise((res, rej) => {
      const id = Math.random();

      worker.onmessage = async ev => {
        if (ev.data.id !== id) return;
        if (ev.data.type === "evt") { emit(ev.data.evt); return; }
        if (ev.data.type === "done") {
          res({ exports: unwrapDefault(ev.data.exports), logs });
          worker.terminate();
        }
        if (ev.data.type === "err") { rej(ev.data.err); worker.terminate(); }
      };

      worker.postMessage({ id, root: collectionRoot.fsPath, resolveDir, code, vpath: virtualPath, args });
    });
  }
}
