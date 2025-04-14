import * as vscode from "vscode";

class BruCustomEditorProvider implements vscode.CustomTextEditorProvider {
    constructor(private readonly context: vscode.ExtensionContext) { }

    /**
     * called when the user opens a .bru file that we are the default editor for.
     * We show a WebviewPanel with React inside it.
     */
    public async resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): Promise<void> {
        //setup basic webview options
        webviewPanel.webview.options = {
            enableScripts: true
        }

        // provide HTML for webview
        webviewPanel.webview.html = this.getHtmlForWebView(
            webviewPanel.webview,
            document
        )

        //Optionally, respond to changes in the doc's text
        const changeDoc = vscode.workspace.onDidChangeTextDocument((e) => {
            if (e.document.uri.toString() === document.uri.toString()) {
                // Re-render or post a message to the webview with updated text
                webviewPanel.webview.postMessage({ type: "update", text: document.getText() });
            }
        });

        //listen
        webviewPanel.webview.onDidReceiveMessage((message) => {
            switch (message.type) {
                case "edit":
                    console.log(message)
                    break;
                case "loaded":
                    webviewPanel.webview.postMessage({
                        type: "open",
                        text: document.getText()
                    });
                    break;
            }
        })

        //cleanup
        webviewPanel.onDidDispose(() => {
            changeDoc.dispose();
        });

    }

    private getHtmlForWebView(webview: vscode.Webview, doc: vscode.TextDocument): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview/App.cjs")
        );

        console.log(scriptUri)

        return /*html*/`
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" 
          content="default-src 'none'; img-src ${webview.cspSource} data:; 
                   style-src ${webview.cspSource} 'unsafe-inline'; 
                   script-src ${webview.cspSource};" />
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