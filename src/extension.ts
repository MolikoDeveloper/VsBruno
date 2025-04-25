import * as vscode from "vscode";
import BruCustomEditorProvider from "./BruCustomEditorProvider";

export const activate = (context: vscode.ExtensionContext) => {
  const provider = new BruCustomEditorProvider(context);

  const providerRegistration = vscode.window.registerCustomEditorProvider(
    'vs-bruno.bruEditor',
    provider,
    {
      webviewOptions: {
        retainContextWhenHidden: false,
        enableFindWidget: true
      },
      supportsMultipleEditorsPerDocument: false,
    }
  )

  context.subscriptions.push(providerRegistration)
};

export const deactivate = () => { };
