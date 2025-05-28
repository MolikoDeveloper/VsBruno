import * as vscode from "vscode";
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import BruCollectionEditorProvider from "./Editor_Providers/BruCollectionEditorProvider";
import BruEnvironmentsEditorProvider from "./Editor_Providers/BruEnviromentEditorProvider"
import { Downloader } from "./sandbox/Downloader";
import { bindingsByPlatformAndArch } from "./sandbox/archs";
import * as crypto from 'crypto';
//import { TsLibDownloader } from "./sandbox/tslibDownloader";

let scriptChannel: vscode.OutputChannel;
let brunoChannel: vscode.OutputChannel;
const prod = process.env.NODE_ENV === 'production';

export const activate = async (context: vscode.ExtensionContext) => {
  scriptChannel = vscode.window.createOutputChannel("VsBruno · Script");
  brunoChannel = vscode.window.createOutputChannel("VsBruno");

  watcher_(context);
  const gs = context.globalState;
  CreateCommands(gs);
  const _package = require('package.json')
  const rollupVersion = _package.dependencies.rollup;
  const tsVersion = _package.peerDependencies.typescript;

  const ver = (bindingsByPlatformAndArch as any)[process.platform][process.arch].base as string
  const binaryPath = path.join(__dirname, "vendor", "rollup", `rollup.${ver}.node`);

  const bruCollectionProvider = new BruCollectionEditorProvider(context);
  const bruEnvProvider = new BruEnvironmentsEditorProvider(context);

  //** Collection Editor */
  const bruCollectionProviderRegistration = vscode.window.registerCustomEditorProvider(
    'vs-bruno.collectionEditor',
    bruCollectionProvider,
    {
      webviewOptions: {
        retainContextWhenHidden: true,
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
        retainContextWhenHidden: true,
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
          const Rollupdownloader = new Downloader(__dirname, rollupVersion);
          try {
            await Rollupdownloader.download().then(async d => {
              if (d) {
                const ok = await Rollupdownloader.testBinary();

                if (!ok) throw new Error('the binary does not respond.');

                await gs.update('rollupEnabled', true);
                vscode.window.showInformationMessage('Rollup downloaded ✅');
                res();
              }
            });
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
      /*if (!fs.existsSync(path.join(__dirname, "lib.es2019.d.ts"))) {
        try {
          await new TsLibDownloader(__dirname, tsVersion).download();
        } catch (err: any) {
          vscode.window.showErrorMessage("Failed to download TS libs: " + err.message);
        }
      }*/
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
        retainContextWhenHidden: true,
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
  if (ctx.extensionMode !== vscode.ExtensionMode.Development) return;

  const root = ctx.extensionPath;                       //  ← FIX 1
  const folders = ["src", "scripts"].map(d => path.join(root, d));
  const triggersFullReload = ["Editor_Providers", "extension.ts", "scripts", "sandbox"];

  const fileHashes = new Map<string, string>();
  let debounce: NodeJS.Timeout | undefined;

  const handle = async (uri: vscode.Uri) => {
    const fp = uri.fsPath;
    let changed = false;

    try {
      const buf = await fsPromises.readFile(fp);
      const h = crypto.createHash("sha256").update(buf).digest("hex");
      if (h !== fileHashes.get(fp)) {
        fileHashes.set(fp, h);
        changed = true;
      }
    } catch {
      fileHashes.delete(fp);          // borrado o ilegible
      changed = true;
    }

    if (!changed) return;

    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(async () => {
      const needsWindowReload = triggersFullReload.some(t =>
        fp.toLowerCase().includes(t.toLowerCase()),
      );

      if (needsWindowReload) {
        Print("bruno", `⟳ Reload Window: ${fp}`);
        await vscode.commands.executeCommand("workbench.action.reloadWindow");
      } else {
        Print("bruno", `⟳ Reload Webviews: ${fp}`);
        await vscode.commands.executeCommand(
          "workbench.action.webview.reloadWebviewAction"
        );
      }
    }, 2000);
  };

  // crea un FileSystemWatcher por carpeta
  for (const dir of folders) {
    const pattern = new vscode.RelativePattern(dir, "**/*");
    const w = vscode.workspace.createFileSystemWatcher(pattern, false, false, false);
    w.onDidChange(handle, null, ctx.subscriptions);
    w.onDidCreate(handle, null, ctx.subscriptions);
    w.onDidDelete(handle, null, ctx.subscriptions);
    ctx.subscriptions.push(w);
  }

  Print("bruno", `File-watcher activo en: ${folders.join(", ")}`);
}