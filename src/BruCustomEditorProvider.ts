import * as vscode from "vscode";
import type { SerializedResponse } from "src/types/shared";
//@ts-ignore
import { bruToJsonV2, jsonToBruV2 } from '@usebruno/lang';

class BruCustomEditorProvider implements vscode.CustomTextEditorProvider {
    constructor(private readonly context: vscode.ExtensionContext) { }

    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        panel: vscode.WebviewPanel,
        token: vscode.CancellationToken
    ): Promise<void> {
        panel.title = "a"
        const { webview } = panel;

        webview.options = { enableScripts: true };

        webview.html = this.getHtmlForWebView(webview);

        const changeDoc = vscode.workspace.onDidChangeTextDocument((e) => {
            if (e.document.uri.toString() === document.uri.toString()) {
                webview.postMessage({
                    type: "update",
                    data: bruToJsonV2(document.getText()),
                });
            }
        });

        webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case "edit":
                    this.handleEditMessage(message);
                    break;
                case "loaded":

                    webview.postMessage({
                        type: "open",
                        //data: parseBru(document.getText()),
                        data: bruToJsonV2(document.getText())
                    });
                    break;
                case "fetch":
                    await this.handleFetchMessage(message, webview);
                    break;
            }
        });

        panel.onDidDispose(() => changeDoc.dispose());
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
        const getUri = (path: string[]) =>
            webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, ...path));

        const cssUri = getUri(["dist", "tailwind.css"]);
        const scriptUri = getUri(["dist", "webview", "Hydrate.cjs"]);
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
}

export default BruCustomEditorProvider;
