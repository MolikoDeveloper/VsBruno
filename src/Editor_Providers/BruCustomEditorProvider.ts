import * as vscode from "vscode";
import type { SerializedResponse } from "../types/shared";
import { bruToJsonV2, jsonToBruV2, bruToEnvJsonV2, envJsonToBruV2, collectionBruToJson, jsonToCollectionBru } from "@usebruno/lang";
import type { RunOptions } from "../sandbox/types";
import { SandboxImpl } from "../sandbox";

/* ──────────────────────────── Tipos auxiliares ───────────────────────────── */
type BruStateKind = "state" | "console" | "evt" | "get";
type WebviewMsg =
    | { type: "edit"; text: string }
    | { type: "init" }
    | { type: "fetch"; data: { uri: string; init?: RequestInit } }
    | { type: "run-script"; data: { code: string; virtualPath?: string; args: any } }
    | { type: "bru-get-reply"; data: { id: string; payload: any } }
    | { type: "stop-script" };

type ScriptState =
    | "idle"      // no hay ejecución en curso  
    | "starting"  // justo al recibir run-script  
    | "running"   // dentro de Sandbox.run(...)  
    | "stopping"  // al recibir stop-script  
    | "stopped";  // ejecución finalizada o interrumpida  

/* ──────────────────────── Clase principal del editor ─────────────────────── */
export default class BruCustomEditorProvider implements vscode.CustomTextEditorProvider {
    private scriptState: ScriptState = "idle";

    constructor(private readonly ctx: vscode.ExtensionContext) { }

    /* ───────────── API de CustomTextEditorProvider ───────────── */
    public async resolveCustomTextEditor(
        doc: vscode.TextDocument,
        panel: vscode.WebviewPanel,
    ): Promise<void> {

        const path = doc.uri.path;
        if (/collection\.bru$/.test(path)) {
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
            await vscode.commands.executeCommand('vscode.openWith', doc.uri, 'vs-bruno.collectionEditor');
            return;
        }

        if (/\/environments\//.test(path)) {
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
            await vscode.commands.executeCommand('vscode.openWith', doc.uri, 'vs-bruno.environmentEditor');
            return;
        }

        if (/folder\.bru$/.test(path)) {
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
            //await vscode.commands.executeCommand('vscode.openWith', doc.uri, 'vs-bruno.environmentEditor');
            return;
        }

        const { webview } = panel;
        webview.options = { enableScripts: true };
        webview.html = this.html(webview);

        /* Rutas de proyecto */
        let collectionUri = (await this.findNearestCollection(doc.uri))?.uri ?? null;
        let configUri = (await this.findNearestJsonConfig(doc.uri))?.uri ?? null;

        /* Watchers ------------------------------------------------------------- */
        const disposables: vscode.Disposable[] = [];

        /* Cambios en cualquier .bru, collection.bru o bruno.json */
        disposables.push(
            vscode.workspace.onDidChangeTextDocument(async (e) => {
                const uri = e.document.uri.toString();

                /* ① Fichero que estamos editando */
                if (uri === doc.uri.toString()) {
                    webview.postMessage({ type: "update", data: bruToJsonV2(e.document.getText()) });
                    return;
                }

                /* ② Colección */
                if (uri === collectionUri) {
                    webview.postMessage({
                        type: "collection",
                        data: collectionBruToJson(e.document.getText()),
                    });
                    return;
                }

                /* ③ Config */
                if (uri === configUri) {
                    webview.postMessage({
                        type: "bruno-config",
                        data: await this.findNearestJsonConfig(e.document.uri),
                    });
                }
            }),
        );

        /* Nuevas collection.bru creadas/borradas */
        const watcher = vscode.workspace.createFileSystemWatcher("**/collection.bru");
        disposables.push(watcher);
        watcher.onDidCreate(() => refreshNearestCollection(this));
        watcher.onDidDelete(() => refreshNearestCollection(this));

        /* Mensajes de la Webview ---------------------------------------------- */
        webview.onDidReceiveMessage((msg: WebviewMsg) => this.handleWebviewMessage(msg, doc, webview));

        /* Limpieza al cerrar el panel ----------------------------------------- */
        panel.onDidDispose(() => disposables.forEach((d) => d.dispose()));

        /* Helpers ------------------------------------------------------------- */
        async function refreshNearestCollection(self: any) {
            const nearest = await self.findNearestCollection(doc.uri);
            const newUri = nearest?.uri ?? null;
            if (newUri !== collectionUri) {
                collectionUri = newUri;
                webview.postMessage({ type: "collection", data: nearest?.data ?? null });
            }
        }
    }

    /* ──────────────────────────── Mensajes Webview ─────────────────────────── */
    private async handleWebviewMessage(msg: WebviewMsg, doc: vscode.TextDocument, webview: vscode.Webview) {
        switch (msg.type) {
            case "edit":
                this.onEdit(msg.text);
                break;

            case "init":
                webview.postMessage({ type: "open", data: bruToJsonV2(doc.getText()) });
                webview.postMessage({ type: "collection", data: await this.findNearestCollection(doc.uri) });
                webview.postMessage({ type: "bruno-config", data: await this.findNearestJsonConfig(doc.uri) });
                break;

            case "fetch":
                await this.handleFetch(msg.data, webview);
                break;

            case "run-script":
                this.setScriptState("starting", webview)
                const nearest = await this.findNearestCollection(doc.uri);
                if (!nearest) {
                    webview.postMessage({ type: "script-error", data: "collection.bru not found" });
                }

                const emitEvent = (evt: any) => webview.postMessage({ type: "bru-event", data: evt });

                try {
                    const { code, virtualPath, args } = msg.data;
                    const opt: RunOptions = {
                        collectionRoot: vscode.Uri.joinPath(vscode.Uri.parse(nearest?.uri ?? ""), '..'),
                        code,
                        virtualPath,
                        resolveDir: vscode.Uri.joinPath(doc.uri, '..').fsPath,
                        args
                    }

                    this.setScriptState("running", webview);
                    const { exports, logs } = await SandboxImpl.run(opt, emitEvent);
                    webview.postMessage({ type: "script-result", data: { exports, logs } });
                    this.setScriptState("stopped", webview);
                }
                catch (err) {
                    webview.postMessage({ type: "script-error", data: String(err) })
                    this.setScriptState("stopped", webview)
                }

                break;

            case "bru-get-reply":

                break;

            case "stop-script":

                break;
        }
    }

    /* ──────────────────────────── Helpers de negocio ──────────────────────── */
    private onEdit(text: string) {
        try {
            const bru = jsonToBruV2(JSON.parse(text));
            console.log(bru);
        } catch {
            console.error("Invalid BRU content");
        }
    }

    private async handleFetch(
        req: { uri: string; init?: RequestInit },
        webview: vscode.Webview,
    ) {
        if (!req.uri) return;
        try {
            const res = await fetch(req.uri, req.init);
            const headers: Record<string, string> = {};
            res.headers.forEach((v, k) => (headers[k] = v));

            const ct = headers["content-type"] ?? "";
            const body =
                ct.includes("application/json")
                    ? await res.json()
                    : ct.startsWith("text/")
                        ? await res.text()
                        : Buffer.from(await res.arrayBuffer()).toString("base64");

            const payload: SerializedResponse = {
                ok: res.ok,
                status: res.status,
                statusText: res.statusText,
                url: res.url,
                headers,
                parsedAs: ct.includes("json") ? "json" : ct.startsWith("text/") ? "text" : "binary",
                body,
            };
            webview.postMessage({ type: "fetch", data: payload });
        } catch (err) {
            webview.postMessage({ type: "fetch-error", data: String(err) });
        }
    }

    /* ──────────────────────────── Utils UI & FS ───────────────────────────── */
    private html(webview: vscode.Webview): string {
        const cssUri = this.getUri(webview, ["dist", "tailwind.css"]);
        const scriptUri = this.getUri(webview, ["dist", "webview", "HydrateBruno.cjs"]);
        const hlUri = this.getUri(webview, ["dist", "common", "highlight.min.cjs"]);

        return /*html*/ `
<!DOCTYPE html><html lang="en"><head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'none';
    img-src ${webview.cspSource} data:;
    style-src ${webview.cspSource} 'unsafe-inline';
    script-src ${webview.cspSource};
  "/>
  <link rel="stylesheet" href="${cssUri}" />
  <title>.bru Editor</title>
</head><body>
  <div id="root"></div>
  <script src="${hlUri}" crossorigin></script>
  <script src="${scriptUri}"></script>
</body></html>`;
    }

    private getUri(webview: vscode.Webview, path: string[]) {
        return webview.asWebviewUri(vscode.Uri.joinPath(this.ctx.extensionUri, ...path));
    }

    private getPath(path: string[]) { return vscode.Uri.joinPath(this.ctx.extensionUri, ...path).fsPath; }

    /* ──── búsqueda up-tree de collection.bru / bruno.json (sin usar 'path') ─── */
    private async findNearestCollection(doc: vscode.Uri) {
        return this.findUpTree(doc, "collection.bru", async (txt) => collectionBruToJson(txt));
    }

    private async findNearestJsonConfig(doc: vscode.Uri) {
        return this.findUpTree(doc, "bruno.json", JSON.parse);
    }

    private async findUpTree(
        doc: vscode.Uri,
        fileName: string,
        parse: (text: string) => any,
    ): Promise<{ uri: string; data: any } | null> {
        const ws = vscode.workspace.getWorkspaceFolder(doc);
        if (!ws) return null;

        let dir = this.parentUri(doc);
        while (dir.path.startsWith(ws.uri.path)) {
            const candidate = vscode.Uri.joinPath(dir, fileName);
            try {
                await vscode.workspace.fs.stat(candidate);
                const txt = Buffer.from(await vscode.workspace.fs.readFile(candidate)).toString("utf8");
                return { uri: candidate.toString(), data: parse(txt) };
            } catch {
                /* sigue subiendo */
            }
            const next = this.parentUri(dir);
            if (next.path === dir.path) break;
            dir = next;
        }
        return null;
    }

    private parentUri(uri: vscode.Uri) {
        const segments = uri.path.split("/");
        if (segments.length <= 2) return uri;
        return uri.with({ path: segments.slice(0, -1).join("/") || "/" });
    }

    private setScriptState(state: ScriptState, webview: vscode.Webview) {
        this.scriptState = state;
        webview.postMessage({ type: "script-state", data: state });
    }
}
