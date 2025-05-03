import * as vscode from "vscode";
import * as fs from 'fs';
import * as path from 'path';
import BruCustomEditorProvider from "./Editor_Providers/BruCustomEditorProvider";
import BruCollectionEditorProvider from "./Editor_Providers/BruCollectionEditorProvider";
import BruEnvironmentsEditorProvider from "./Editor_Providers/BruEnviromentEditorProvider"
import { Downloader } from "./sandbox/Downloader";

let scriptChannel: vscode.OutputChannel;
let brunoChannel: vscode.OutputChannel;

export const activate = async (context: vscode.ExtensionContext) => {
  const gs = context.globalState;
  const storeDir = context.globalStorageUri;
  const rollupVersion = require('package.json').dependencies.rollup;
  const binaryPath = path.join(storeDir.fsPath, 'rollup.node');

  scriptChannel = vscode.window.createOutputChannel("VsBruno · Script");
  brunoChannel = vscode.window.createOutputChannel("VsBruno");

  if (context.extensionMode === vscode.ExtensionMode.Development) {
    await gs.update('rollupEnabled', undefined);
  }

  let enabled = gs.get<boolean>('rollupEnabled');
  brunoChannel.appendLine(__dirname)

  brunoChannel.appendLine(`rollup enabled: ${enabled}`)
  brunoChannel.appendLine(`finding rollup: ${storeDir.fsPath}`)
  if (enabled === undefined) {
    if (fs.existsSync(binaryPath)) {
      // Si ya existe, lo damos por bueno sin preguntar
      brunoChannel.appendLine(`rollup found: ${binaryPath}`)
      enabled = true;
      await gs.update('rollupEnabled', true);
    } else {
      // No existe: pedimos al usuario
      const choice = await vscode.window.showInformationMessage(
        'No se encontró el binario de Rollup. ¿Quieres descargarlo para habilitar bundling?',
        'Sí, descargar',
        'No, desactivar'
      );
      if (choice === 'Sí, descargar') {
        const downloader = new Downloader(storeDir.fsPath, rollupVersion);
        try {
          await downloader.download();
          const ok = await downloader.testBinary();
          if (!ok) throw new Error('El binario no respondió correctamente');
          enabled = true;
          await gs.update('rollupEnabled', true);
          vscode.window.showInformationMessage('Rollup descargado y validado ✅');
        } catch (err: any) {
          enabled = false;
          await gs.update('rollupEnabled', false);
          vscode.window.showErrorMessage('Error al descargar Rollup: ' + err.message);
        }
      } else {
        enabled = false;
        await gs.update('rollupEnabled', false);
      }
    }
  }

  if (enabled) {
    const disposable = vscode.commands.registerCommand('vs-bruno.bundle.req', async () => {
      // Aquí iría la lógica que invoque tu Runner o execFile
      vscode.window.showInformationMessage('Ejecutando Script...');
      // e.g.: await runner.runBundle([...]);
    });
    context.subscriptions.push(disposable);
  }

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