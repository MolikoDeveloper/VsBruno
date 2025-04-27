import * as vscode from "vscode";
import BruCustomEditorProvider from "./BruCustomEditorProvider";
import BruCollectionEditorProvider from "./BruCollectionEditorProvider";

let scriptChannel: vscode.OutputChannel;

export const activate = (context: vscode.ExtensionContext) => {
  scriptChannel = vscode.window.createOutputChannel(
    "VsBruno · Script"
  );

  const bruProvider = new BruCustomEditorProvider(context);
  const bruCollectionProvider = new BruCollectionEditorProvider(context);
  /*custom editor */
  const bruProviderRegistration = vscode.window.registerCustomEditorProvider(
    'vs-bruno.bruEditor',
    bruProvider,
    {
      webviewOptions: {
        retainContextWhenHidden: false,
        enableFindWidget: false
      },
      supportsMultipleEditorsPerDocument: false,
    }
  )

  const bruCollectionProviderRegistration = vscode.window.registerCustomEditorProvider(
    'vs-bruno.collectionEditor',
    bruCollectionProvider,
    {
      webviewOptions: {
        retainContextWhenHidden: false,
        enableFindWidget: false
      },
      supportsMultipleEditorsPerDocument: false,
    }
  )

  context.subscriptions.push(bruProviderRegistration, bruCollectionProviderRegistration)
};

export const deactivate = () => { };

export function Print(channel: "script" | "request", msg: string){
  switch(channel){
    case "script":
      scriptChannel.appendLine(msg)
      break;
  }
}