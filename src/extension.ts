import * as vscode from "vscode";
import * as fs from 'fs';
import * as path from 'path';
import BruCollectionEditorProvider from "./Editor_Providers/BruCollectionEditorProvider";
import BruEnvironmentsEditorProvider from "./Editor_Providers/BruEnviromentEditorProvider"
import { Downloader } from "./sandbox/Downloader";
import { bindingsByPlatformAndArch } from "./sandbox/archs";
import { watchFolders } from "./common/watcher";

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
  if (enabled === undefined || enabled == true) {
    await new Promise<void>(async (res, rej) => {
      if (fs.existsSync(binaryPath)) {
        brunoChannel.appendLine(`rollup Binary found: ${binaryPath}`)
        await gs.update('rollupEnabled', true);
        res();
      } else {
        const choice = await vscode.window.showInformationMessage(
          'Rollup binary not found. do you want to download Rollup?\n(only applies to the extension)',
          'Yes, Download.',
          'No, Disable.'
        );
        if (choice === 'Yes, Download.') {
          const downloader = new Downloader(__dirname, rollupVersion);
          try {
            await downloader.download().then(async d => {
              if (d) {
                const ok = await downloader.testBinary()
                if (!ok) throw new Error('the binary does not respond.');
              }
            });

            await gs.update('rollupEnabled', true);
            vscode.window.showInformationMessage('Rollup downloaded ✅');
          } catch (err: any) {
            await gs.update('rollupEnabled', undefined);
            vscode.window.showErrorMessage('Error downloading Rollup: ' + err.message);
            rej()
          }
        } else if (choice === 'No, Disable.') {
          await gs.update('rollupEnabled', false);
        }
        else {
          await gs.update("rollupEnabled", undefined)
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

export function Clear(channel: "script" | "bruno") {
  switch (channel) {
    case "script":
      scriptChannel.clear()
      break;
    case "bruno":
      brunoChannel.clear()
      break;
  }
}


function CreateCommands(gs: vscode.Memento & { setKeysForSync(keys: readonly string[]): void; }) {

  vscode.commands.registerCommand("vs-bruno.disable.rollup", () => {
    gs.update('rollupEnabled', false);
    vscode.window.showInformationMessage("Reloading extensions");
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
            vscode.window.showInformationMessage("Reloading vscode");
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