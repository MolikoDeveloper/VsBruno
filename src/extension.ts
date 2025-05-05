import * as vscode from "vscode";
import * as fs from 'fs';
import * as path from 'path';
import BruCollectionEditorProvider from "./Editor_Providers/BruCollectionEditorProvider";
import BruEnvironmentsEditorProvider from "./Editor_Providers/BruEnviromentEditorProvider"
import { Downloader } from "./sandbox/Downloader";
import { bindingsByPlatformAndArch } from "./sandbox/archs";

let scriptChannel: vscode.OutputChannel;
let brunoChannel: vscode.OutputChannel;

export const activate = async (context: vscode.ExtensionContext) => {
  const gs = context.globalState;
  const rollupVersion = require('package.json').dependencies.rollup;
  const ver = (bindingsByPlatformAndArch as any)[process.platform][process.arch] as string
  const binaryPath = path.join(__dirname, `${ver}`);

  scriptChannel = vscode.window.createOutputChannel("VsBruno · Script");
  brunoChannel = vscode.window.createOutputChannel("VsBruno");

  const bruCollectionProvider = new BruCollectionEditorProvider(context);
  const bruEnvProvider = new BruEnvironmentsEditorProvider(context);

  //** Collection Editor */
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

  //** Environment Editor */
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

  await new Promise<void>(async (res, rej) => {
    if (context.extensionMode === vscode.ExtensionMode.Development) {
      //await gs.update('rollupEnabled', undefined);
      //brunoChannel.appendLine("rollup enabled set to undefined.")
    }

    const enabled = gs.get<boolean>('rollupEnabled');

    if (enabled === undefined || enabled === true) {
      console.log(binaryPath)
      if (fs.existsSync(binaryPath+".node")) {
        // Si ya existe, lo damos por bueno sin preguntar
        brunoChannel.appendLine(`rollup found: ${binaryPath}`)
        await gs.update('rollupEnabled', true);
        res();
      } else {
        // No existe: pedimos al usuario
        const choice = await vscode.window.showInformationMessage(
          'No se encontró el binario de Rollup. ¿Quieres descargarlo para habilitar bundling?',
          'Sí, descargar',
          'No, desactivar'
        );
        if (choice === 'Sí, descargar') {
          const downloader = new Downloader(__dirname, rollupVersion);
          try {
            await downloader.download().then(async d => {
              if (d) {
                const ok = await downloader.testBinary()
                if (!ok) throw new Error('El binario no respondió correctamente');
              }
            });

            await gs.update('rollupEnabled', true);
            vscode.window.showInformationMessage('Rollup descargado y validado ✅');
          } catch (err: any) {
            await gs.update('rollupEnabled', false);
            vscode.window.showErrorMessage('Error al descargar Rollup: ' + err.message);
            rej()
          }
        } else {
          await gs.update('rollupEnabled', false);
          res()
        }
      }
    }
    res()
  })

  /** Bruno editor */
  const BruCustomEditorProvider = (await import("./Editor_Providers/BruCustomEditorProvider")).default;
  const bruProvider = new BruCustomEditorProvider(context);
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