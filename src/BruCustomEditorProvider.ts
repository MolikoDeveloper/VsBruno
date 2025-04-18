import * as vscode from "vscode";
import { parseBru, stringifyBru } from "./bruno/bruno";
import type { SerializedResponse } from "./@types/shared";

class BruCustomEditorProvider implements vscode.CustomTextEditorProvider {
    constructor(private readonly context: vscode.ExtensionContext) { }

    /**
     * called when the user opens a .bru file that we are the default editor for.
     * We show a WebviewPanel with React inside it.
     */
    public async resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): Promise<void> {

        /*const webviewUri = webviewPanel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, "media", "monaco")
        );*/

        //setup basic webview options
        webviewPanel.webview.options = {
            enableScripts: true
        }

        // provide HTML for webview
        webviewPanel.webview.html = this.getHtmlForWebView(
            webviewPanel.webview,
            document
        )

        //webviewPanel.title = `GET - ${document.uri.path.split('/').pop()}`;

        //Optionally, respond to changes in the doc's text
        const changeDoc = vscode.workspace.onDidChangeTextDocument((e) => {
            if (e.document.uri.toString() === document.uri.toString()) {
                // Re-render or post a message to the webview with updated text
                webviewPanel.webview.postMessage({
                    type: "update",
                    data: parseBru(document.getText())
                });
            }
        });

        //listen
        webviewPanel.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case "edit":
                    const bru_string = stringifyBru(JSON.parse(message.text))
                    console.log(bru_string)
                    break;
                case "loaded":
                    webviewPanel.webview.postMessage({
                        type: "open",
                        data: parseBru(document.getText())
                    });
                    break;
                case "fetch":
                    const { uri, init } = message.data as { uri: string | URL; init?: RequestInit };
                    if (!uri) { return; }

                    try {
                        const res = await fetch(uri.toString(), init);

                        // ── serializar cabeceras ──
                        const headers: Record<string, string> = {};
                        res.headers.forEach((v, k) => (headers[k] = v));

                        // ── serializar cuerpo ──
                        const ct = headers["content-type"] ?? "";
                        let parsedAs: "json" | "text" | "binary";
                        let body: unknown;

                        if (ct.includes("application/json")) {
                            body = await res.json();
                            parsedAs = "json";
                        } else if (ct.startsWith("text/")) {
                            body = await res.text();
                            parsedAs = "text";
                        } else {
                            // binario → base64 para no corromperlo en el postMessage
                            const ab = await res.arrayBuffer();
                            body = Buffer.from(ab).toString("base64");
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

                        webviewPanel.webview.postMessage({ type: "fetch", data: payload });
                    } catch (err) {
                        webviewPanel.webview.postMessage({
                            type: "fetch-error",
                            data: String(err),
                        });
                    }
            }
        })

        //cleanup
        webviewPanel.onDidDispose(() => {
            changeDoc.dispose();
        });

    }

    private getHtmlForWebView(webview: vscode.Webview, doc: vscode.TextDocument): string {
        // serve App.cjs
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview", "App.cjs")
        );

        //serve tailwind.css
        const cssUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, "dist", "tailwind.css")
        )

        const highlightMinJs = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, "dist", "common", "highlight.min.cjs")
        )



        return /*html*/`
<!DOCTYPE html>
<html lang="en">
  <head>
      <meta charset="UTF-8" />
      <meta http-equiv="Content-Security-Policy" 
      content="
  default-src 'none';
  img-src    ${webview.cspSource} data:;
  style-src  ${webview.cspSource} 'unsafe-inline';
  script-src ${webview.cspSource};
"
      content="
      default-src 'none';
      img-src ${webview.cspSource} data:; 
      style-src ${webview.cspSource} 'unsafe-inline'; 
      script-src ${webview.cspSource};" />
      <link rel="stylesheet" href="${cssUri}"/>
      <script crossorigin src=${highlightMinJs}></script>
    <title>.bru Editor</title>
  </head>
  <body>
    <div id="root"></div>
    <script src="${scriptUri}"></script>
  </body>
</html>
        `
    }
}

export default BruCustomEditorProvider

//vscode-file://vscode-app/c:/Users/aarriagadac/AppData/Local/Programs/Microsoft%20VS%20Code/resources/app/out/vs/workbench/workbench.desktop.main.css