import * as vscode from "vscode"
import { bruToEnvJsonV2, envJsonToBruV2 } from "@usebruno/lang"

type msgT = {
    type: "edit" | "init",
    data: any
}

export default class BruEnvironmentsEditorProvider
    implements vscode.CustomTextEditorProvider {
    constructor(private readonly context: vscode.ExtensionContext) { }

    public async resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken) {
        const { webview } = webviewPanel;
        webview.options = { enableScripts: true };
        webview.html = this.html(webview)

        const watcher = vscode.workspace.onDidChangeTextDocument((docEv) => {
            if (docEv.document.uri.toString() === document.uri.toString()) {
                webview.postMessage({
                    type: "update",
                    data: bruToEnvJsonV2(docEv.document.getText())
                })
            }
        })

        webview.onDidReceiveMessage((msg: msgT) => {
            switch (msg.type) {
                case "init":
                    webview.postMessage({
                        type: "init",
                        data: bruToEnvJsonV2(document.getText())
                    })
                    break;
                case "edit":
                    envJsonToBruV2(msg.data);
                    break;
                default:
                    break;
            }
        })


        webviewPanel.onDidDispose(() => {
            watcher.dispose();
        })

    }

    private html(webview: vscode.Webview) {
        const getUri = (path: string[]) => webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, ...path));

        const cssUri = getUri(["dist", "tailwind.css"]);
        const scriptUri = getUri(["dist", "webview", "HydrateEnvironments.cjs"]);
        const highlightJsUri = getUri(["dist", "common", "highlight.min.cjs"]);

        return /*html */`<!DOCTYPE html>
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
    WIP
    <div id="root"></div>
    <script src="${highlightJsUri}"></script>
    <script src="${scriptUri}"></script>
</body>
</html>
            `
    }
}