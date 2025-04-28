/// <reference lib="webworker" />

/* Entrypoint que se compila a dist/worker.js (ESM) */
importScripts("esbuild-wasm.js"); // empaqueta el .wasm junto al script (offline)
import type * as esbuild from "esbuild-wasm";
let service: esbuild.Service | undefined;

//let service: import("esbuild-wasm").Service | undefined;

/* cache para incremental builds */
const cache = new Map<string, string>();

// –– util simple –
const textToUint8 = (t: string) =>
    new TextEncoder().encode(t).buffer as ArrayBuffer;

self.onmessage = async (ev) => {
    const { id, cmd } = ev.data;

    // -------- init esbuild --------
    if (!service) {
        postMessage({ id, kind: "state", value: "idle" });
        service = await (self as any).esbuild.startService({
            wasmURL: "esbuild.wasm",
        });
    }

    // -------- detener ----------
    if (cmd === "stop") {
        postMessage({ id, kind: "state", value: "terminated" });
        self.close();
        return;
    }

    // -------- ejecutar ----------
    if (cmd === "run") {
        const { code, vpath = "inline.js", resolveDir, args } = ev.data;
        try {
            postMessage({ id, kind: "state", value: "running" });

            const prelude = await (await fetch("prelude.js")).text();
            const out = await service.build({
                stdin: { contents: code, resolveDir, sourcefile: vpath, loader: "ts" },
                bundle: true,
                format: "cjs",
                banner: { js: prelude },
                write: false,
                platform: "neutral",
                external: ["fs", "path", "net", "child_process", "ws"],
            });

            const module = { exports: {} };
            /* Exponer WebSocket nativo en navegador */
            (globalThis as any).WebSocket =
                (globalThis as any).WebSocket ?? (self as any).WebSocket;

            /* establecer outbound para send/get/console */
            (globalThis as any).__bruOutbound = (evt: any) =>
                postMessage({ id, kind: evt.type === "console" ? "console" : "evt", evt });

            /* despachar cola anterior */
            (globalThis as any).__bruQueued?.splice(0).forEach(
                (e: any) => (globalThis as any).__bruOutbound(e)
            );

            /* evaluar bundle */
            new Function("module", "exports", "args", out.outputFiles[0].text)(
                module,
                module.exports,
                args
            );

            postMessage({ id, kind: "state", value: "done" });
        } catch (e: any) {
            postMessage({
                id,
                kind: "state",
                value: "error",
                message: String(e.message ?? e),
                stack: e.stack,
            });
        }
    }

    // -------- reply ----------
    if (cmd === "reply") {
        (globalThis as any).__bruReply(ev.data.reqId, ev.data.data);
    }
};
