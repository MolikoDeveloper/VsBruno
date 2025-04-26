// src/sandbox/BrunoSandboxWeb.ts
import * as vscode from "vscode";
import type { LogEntry, RunOptions, Sandbox } from "./types";
import { workerSource } from "./workerSource.js";

export class BrunoSandboxWeb implements Sandbox {
    private seq = 0;

    // src/sandbox/BrunoSandboxWeb.ts  (solo la función run actualizada)
    async run({ collectionRoot, code, entryRel, args }: RunOptions) {
        const id = ++this.seq;
        const blobURL = URL.createObjectURL(new Blob([workerSource], { type: "module" }));
        const worker = new Worker(blobURL, { type: "module" });
        const logs: LogEntry[] = [];
        const wSend = (msg: any) => worker.postMessage({ id, msg });

        return new Promise<any>((resolve, reject) => {
            worker.onmessage = async (ev) => {
                if (ev.data.id !== id) return;
                const { ok, data, err, request, log } = ev.data;

                if (log) {
                    // opcional enviar al webview
                    logs.push(log);
                    //scriptChannel.appendLine(`[${log.kind}] ${log.values.map(String).join(" ")}`);
                    //webview?.postMessage({ type: "script-log", data: log }); // UI opcional
                    return;
                }

                // ── Resultado final ─────────────────────────
                if (ok !== undefined) {
                    ok ? resolve(data) : reject(err);
                    worker.terminate();
                    return;
                }

                // ── Petición de archivo (require) ───────────
                if (request?.type === "file") {
                    try {
                        const absUri = vscode.Uri.file(request.path);
                        this.ensureInsideCollection(collectionRoot, absUri);

                        const buff = await vscode.workspace.fs.readFile(absUri);
                        const fileCode = Buffer.from(buff).toString("utf8");

                        wSend({ type: "code", path: request.path, code: fileCode });
                    } catch (e) {
                        /* Devuelve error de lectura al worker */
                        wSend({ type: "code", path: request.path, code: "", error: String(e) });
                    }
                }
            };
            wSend({ type: "exec", entryRel, code, args });
        });
    }

    private ensureInsideCollection(root: vscode.Uri, absUri: vscode.Uri) {
        if (!absUri.fsPath.startsWith(root.fsPath))
            throw new Error("Acceso denegado (fuera de collection.bru)");
    }
}
