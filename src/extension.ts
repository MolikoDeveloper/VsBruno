import * as vscode from "vscode";
import BruCustomEditorProvider from "./BruCustomEditorProvider";

export const activate = (context: vscode.ExtensionContext) => {
  const provider = new BruCustomEditorProvider(context);
  const providerRegistration = vscode.window.registerCustomEditorProvider(
    'vs-bruno.bruEditor',
    provider
  )

  // reopen in text editor
  const openPlainText = vscode.commands.registerCommand(
    "vs-bruno.openPlainText",
    async () => {
      console.log("reopenign")
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) return;

      await vscode.commands.executeCommand(
        "workbench.action.reopenWith",
        activeEditor.document.uri,
        "Default"
      );
    }
  )

  context.subscriptions.push(providerRegistration, openPlainText)
};

export const deactivate = () => { };
