import * as vscode from "vscode";
import type { SerializedResponse } from "src/types/shared";
//@ts-ignore
import { bruToJsonV2, jsonToBruV2, collectionBruToJson, jsonToCollectionBru } from '@usebruno/lang';
import type { RunOptions } from "./sandbox/types";
import { SandboxImpl } from "./sandbox";

class BruCustomEditorProvider implements vscode.CustomTextEditorProvider {
    constructor(private readonly context: vscode.ExtensionContext) { }

    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        panel: vscode.WebviewPanel,
        token: vscode.CancellationToken
    ): Promise<void> {
        const { webview } = panel;
        webview.options = { enableScripts: true };
        webview.html = this.getHtmlForWebView(webview);

        const nearest = await this.findNearestCollection(document.uri);
        let currentCollectionUri: string | null = nearest?.uri ?? null;

        const changeDoc = vscode.workspace.onDidChangeTextDocument(async (e) => {
            const uriStr = e.document.uri.toString();

            /* ① Cambios en el .bru que el usuario edita */
            if (uriStr === document.uri.toString()) {
                webview.postMessage({
                    type: "update",
                    data: bruToJsonV2(e.document.getText()),
                });
                return;
            }

            /* ② Cambios en la colección actualmente seleccionada */
            if (uriStr === currentCollectionUri) {
                webview.postMessage({
                    type: "collection",
                    data: collectionBruToJson(e.document.getText()),
                });
            }
        });

        /* ───── ② Creación / borrado / renombrado de collection.bru ───── */
        const watcher = vscode.workspace.createFileSystemWatcher("**/collection.bru");
        const refreshNearest = async () => {
            const nearestNow = await this.findNearestCollection(document.uri);
            const newUri = nearestNow?.uri ?? null;

            if (newUri !== currentCollectionUri) {
                currentCollectionUri = newUri;
                webview.postMessage({
                    type: "collection",
                    data: nearestNow?.data ?? null,   // puede ser null si ya no hay colección
                });
            }
        };
        watcher.onDidCreate(refreshNearest);
        watcher.onDidDelete(refreshNearest);

        webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case "edit":
                    this.handleEditMessage(message);
                    break;
                case "init":
                    webview.postMessage({
                        type: "open",
                        data: bruToJsonV2(document.getText())
                    });
                    webview.postMessage({
                        type: "collection",
                        data: await this.findNearestCollection(document.uri) ?? null
                    });
                    break;
                case "fetch":
                    await this.handleFetchMessage(message, webview);
                    break;
                case "run-script":
                    if (!currentCollectionUri) {
                        webview.postMessage({ type: "script-error", data: "collection.bru not found." })
                        break;
                    }

                    const { code, entryRel, args } = message.data as { code: string, entryRel: string, args?: any };

                    const opt: RunOptions = {
                        collectionRoot: vscode.Uri.joinPath(vscode.Uri.parse(currentCollectionUri), '..'),
                        code,
                        entryRel,
                        args
                    }

                    try {
                        const { exports, logs } = await SandboxImpl.run(opt);
                        webview.postMessage({ type: "script-result", data: { exports, logs } });
                    }
                    catch (err) {
                        webview.postMessage({ type: "script-error", data: String(err) });
                    }
                    break;

            }
        });

        panel.onDidDispose(() => {
            changeDoc.dispose()
            watcher.dispose()
        });
    }

    private handleEditMessage(message: { text: string }) {
        try {
            const data = JSON.parse(message.text);
            const bru = jsonToBruV2(data);
            console.log(bru);
        } catch (err) {
            console.error("Invalid BRU content", err);
        }
    }

    private async handleFetchMessage(
        message: { data: { uri: string; init?: RequestInit } },
        webview: vscode.Webview
    ) {
        const { uri, init } = message.data;
        if (!uri) return;

        try {
            const res = await fetch(uri.toString(), init);
            const headers: Record<string, string> = {};
            res.headers.forEach((v, k) => (headers[k] = v));

            const contentType = headers["content-type"] ?? "";
            let body: unknown;
            let parsedAs: "json" | "text" | "binary";

            if (contentType.includes("application/json")) {
                body = await res.json();
                parsedAs = "json";
            } else if (contentType.startsWith("text/")) {
                body = await res.text();
                parsedAs = "text";
            } else {
                const buffer = Buffer.from(await res.arrayBuffer());
                body = buffer.toString("base64");
                parsedAs = "binary";
            }

            const payload: SerializedResponse = {
                ok: res.ok,
                status: res.status,
                statusText: res.statusText,
                url: res.url,
                headers,
                parsedAs,
                body,
            };

            webview.postMessage({ type: "fetch", data: payload });
        } catch (err) {
            webview.postMessage({ type: "fetch-error", data: String(err) });
        }
    }

    private getHtmlForWebView(webview: vscode.Webview): string {
        const getUri = (path: string[]) => webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, ...path));

        const cssUri = getUri(["dist", "tailwind.css"]);
        const scriptUri = getUri(["dist", "webview", "HydrateBruno.cjs"]);
        const highlightJsUri = getUri(["dist", "common", "highlight.min.cjs"]);

        return /*html*/ `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="
      default-src 'none';
      img-src ${webview.cspSource} data:;
      style-src ${webview.cspSource} 'unsafe-inline';
      script-src ${webview.cspSource};
    "/>
    <link rel="stylesheet" href="${cssUri}" />
    <title>.bru Editor</title>
</head>
<body>
    <div id="root"></div>
    <script src="${highlightJsUri}" crossorigin></script>
    <script src="${scriptUri}"></script>
  </body>
</html>
    `;
    }

    /** Devuelve la collection.bru más cercana o null (sin usar 'path') */
    private async findNearestCollection(
        docUri: vscode.Uri
    ): Promise<{ uri: string; data: any } | null> {
        const wsFolder = vscode.workspace.getWorkspaceFolder(docUri);
        if (!wsFolder) return null;                           // archivo fuera del workspace

        // ① Dir actual donde está el documento
        let current = this.parentUri(docUri);                 // carpeta que contiene al .bru

        // ② Mientras sigamos dentro del workspace
        while (current.path.startsWith(wsFolder.uri.path)) {
            const candidate = vscode.Uri.joinPath(current, "collection.bru");

            try {
                // Si existe -> la devolvemos
                await vscode.workspace.fs.stat(candidate);

                const bytes = await vscode.workspace.fs.readFile(candidate);
                const text = Buffer.from(bytes).toString("utf8");
                return {
                    uri: candidate.toString(),
                    data: collectionBruToJson(text),
                };
            } catch {
                /* no existe aquí: seguimos subiendo */
            }

            const next = this.parentUri(current);
            if (next.path === current.path) break;              // ya estábamos en la raíz
            current = next;
        }

        return null;                                          // no se encontró ninguna
    }

    /* Helper pequeñito para subir un nivel usando sólo vscode.Uri */
    private parentUri(uri: vscode.Uri): vscode.Uri {
        const segments = uri.path.split("/");
        if (segments.length <= 2)               // ['', '']  ó ['', 'folder']
            return uri;                           // ya no podemos subir más

        const parentPath = segments.slice(0, -1).join("/") || "/";
        return uri.with({ path: parentPath });
    }
}

export default BruCustomEditorProvider;
