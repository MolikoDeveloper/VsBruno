import * as vscode from "vscode";
import BruCustomEditorProvider from "./Editor_Providers/BruCustomEditorProvider";
import BruCollectionEditorProvider from "./Editor_Providers/BruCollectionEditorProvider";
import BruEnvironmentsEditorProvider from "./Editor_Providers/BruEnviromentEditorProvider"

let scriptChannel: vscode.OutputChannel;
let brunoChannel: vscode.OutputChannel;

export const activate = (context: vscode.ExtensionContext) => {
  scriptChannel = vscode.window.createOutputChannel("VsBruno · Script");
  brunoChannel = vscode.window.createOutputChannel("VsBruno");

  const bruCollectionProvider = new BruCollectionEditorProvider(context);
  const bruEnvProvider = new BruEnvironmentsEditorProvider(context);
  const bruProvider = new BruCustomEditorProvider(context);

  const bruCollectionProviderRegistration = vscode.window.registerCustomEditorProvider(
    'vs-bruno.collectionEditor',
    bruCollectionProvider,
    {
      webviewOptions: {
        retainContextWhenHidden: false,
        enableFindWidget: false
      },
      supportsMultipleEditorsPerDocument: false,
    },
  )

  const bruEnviromentProviderRegistration = vscode.window.registerCustomEditorProvider(
    'vs-bruno.environmentEditor',
    bruEnvProvider,
    {
      webviewOptions: {
        retainContextWhenHidden: false,
        enableFindWidget: false
      },
      supportsMultipleEditorsPerDocument: false,
    },
  )

  /** custom editor */
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

  context.subscriptions.push(bruCollectionProviderRegistration, bruEnviromentProviderRegistration, bruProviderRegistration)
};

export const deactivate = () => { };

export function Print(channel: "script" | "bruno", msg: string) {
  switch (channel) {
    case "script":
      scriptChannel.appendLine(msg)
      break;
    case "bruno":
      brunoChannel.appendLine(msg)
      break;
  }
}