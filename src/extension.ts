import * as vscode from "vscode";
import * as fs from 'fs';
import * as path from 'path';
import BruCollectionEditorProvider from "./Editor_Providers/BruCollectionEditorProvider";
import BruEnvironmentsEditorProvider from "./Editor_Providers/BruEnviromentEditorProvider"
import { Downloader } from "./sandbox/Downloader";
import { bindingsByPlatformAndArch } from "./sandbox/archs";
import { watchFolders } from "./common/watcher";
import { eventNames } from "process";

let scriptChannel: vscode.OutputChannel;
let brunoChannel: vscode.OutputChannel;

export const activate = async (context: vscode.ExtensionContext) => {
  scriptChannel = vscode.window.createOutputChannel("VsBruno · Script");
  brunoChannel = vscode.window.createOutputChannel("VsBruno");

  watcher_(context);
  const gs = context.globalState;
  CreateCommands(gs);
  const rollupVersion = require('package.json').dependencies.rollup;
  const ver = (bindingsByPlatformAndArch as any)[process.platform][process.arch].base as string
  const binaryPath = path.join(__dirname, `rollup.${ver}.node`);


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

  const enabled = gs.get<boolean>('rollupEnabled');
  if (enabled === undefined) {
    await new Promise<void>(async (res, rej) => {
      if (fs.existsSync(binaryPath)) {
        // Si ya existe, lo damos por bueno sin preguntar
        brunoChannel.appendLine(`rollup Binary found: ${binaryPath}`)
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

      res()
    })
  }

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


function CreateCommands(gs: vscode.Memento & { setKeysForSync(keys: readonly string[]): void; }) {

  vscode.commands.registerCommand("vs-bruno.disable.rollup", () => {
    gs.update('rollupEnabled', false);
    vscode.window.showInformationMessage("Reloading vscode");
    vscode.commands.executeCommand("workbench.action.reloadWindow");
  })

  vscode.commands.registerCommand("vs-bruno.enable.rollup", () => {
    gs.update('rollupEnabled', true);
    vscode.window.showInformationMessage("Reloading vscode");
    vscode.commands.executeCommand("workbench.action.reloadWindow");
  })
}

function watcher_(ctx: vscode.ExtensionContext) {
  if (ctx.extensionMode === vscode.ExtensionMode.Development) {
    const basePath = path.join(__dirname, "..");
    const dirs = ["src", "scripts"].map(d => path.join(basePath, d));
    const mains = ["Editor_Providers", "extension.ts", "scripts", "sandbox"];

    let reloadTimer: ReturnType<typeof setTimeout> | undefined;
    let lastFilepath: string;

    watchFolders(dirs, (_event, filepath) => {
      console.log(_event)
      lastFilepath = filepath;
      // reset timer on each event
      if (reloadTimer) {
        clearTimeout(reloadTimer);
      }
      reloadTimer = setTimeout(async () => {
        // determine which reload to perform
        let didReloadWindow = false;
        for (const f of mains) {
          if (lastFilepath.toLowerCase().includes(f.toLowerCase())) {
            Print("bruno", `Reloading Window: ${lastFilepath}`);
            await vscode.commands.executeCommand("workbench.action.reloadWindow");
            didReloadWindow = true;
            break;
          }
        }
        if (!didReloadWindow) {
          Print("bruno", `Reloading WebView: ${lastFilepath}`);
          await vscode.commands.executeCommand("workbench.action.webview.reloadWebviewAction");
        }
      }, 1000); // 1 second debounce
    });
  }
}