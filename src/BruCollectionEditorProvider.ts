import * as vscode from "vscode";
//@ts-ignore
import { collectionBruToJson, jsonToCollectionBru } from "@usebruno/lang";

export default class BruCollectionEditorProvider
    implements vscode.CustomTextEditorProvider {
    constructor(private readonly context: vscode.ExtensionContext) { }

    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        panel: vscode.WebviewPanel
    ) {
        const { webview } = panel;
        webview.options = { enableScripts: true };
        webview.html = this.html(webview);

        /* Apertura */
        webview.postMessage({
            type: "open",
            data: collectionBruToJson(document.getText()),
        });

        /* Cambios en el archivo */
        const change = vscode.workspace.onDidChangeTextDocument((e) => {
            if (e.document.uri.toString() === document.uri.toString()) {
                webview.postMessage({
                    type: "update",
                    data: collectionBruToJson(e.document.getText()),
                });
            }
        });

        /* Mensajes desde la WebView */
        webview.onDidReceiveMessage((msg) => {
            switch (msg.type) {
                case "edit":
                    const bru = jsonToCollectionBru(JSON.parse(msg.text));
                    // …guardar/validar si procede
                    break;
                case "init":
                    webview.postMessage({
                        type: "open",
                        data: collectionBruToJson(document.getText())
                    })
            }
        });

        panel.onDidDispose(() => change.dispose());
    }

    private html(webview: vscode.Webview) {
        const getUri = (path: string[]) => webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, ...path));

        const cssUri = getUri(["dist", "tailwind.css"]);
        const scriptUri = getUri(["dist", "webview", "HydrateCollection.cjs"]);
        const highlightJsUri = getUri(["dist", "common", "highlight.min.cjs"]);

        return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta http-equiv="Content-Security-Policy"
            content="default-src 'none'; img-src ${webview.cspSource} data:;
                     style-src ${webview.cspSource} 'unsafe-inline';
                     script-src ${webview.cspSource};" />
          <link rel="stylesheet" href="${cssUri}" />
        </head>
        <body>
          <div id="root"></div>
          <script src="${highlightJsUri}"></script>
          <script src="${scriptUri}"></script>
        </body>
      </html>`;
    }
}