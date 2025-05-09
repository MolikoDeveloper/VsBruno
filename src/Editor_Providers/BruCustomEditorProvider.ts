import * as vscode from "vscode";
import type { SerializedResponse } from "../types/shared";
import { bruToJsonV2, jsonToBruV2, bruToEnvJsonV2, envJsonToBruV2, collectionBruToJson, jsonToCollectionBru } from "@usebruno/lang";
import type { BruFile } from "src/types/bruno/bruno";
import { Print } from "src/extension";
import type { RunOptions, Sandbox } from "src/sandbox/types";
import { humanDuration, humanSize } from "src/common/humanSize";
import * as path from 'path';
import * as fs from 'fs';

/* ──────────────────────────── Tipos auxiliares ───────────────────────────── */
type WebviewMsg =
    | { type: "edit"; data: BruFile }
    | { type: "init" }
    | { type: "fetch"; data: { uri: string; init?: RequestInit } }
    | { type: "run-script"; data: { code: string; virtualPath?: string; args: any, bruContent: BruFile, when: "#script-pre" | "#script-post" } }
    | { type: "bru-get-reply"; data: { id: string; payload: any } }
    | { type: "stop-script" };

type ScriptState =
    | "idle"      // no hay ejecución en curso  
    | "starting"  // justo al recibir run-script  
    | "running"   // dentro de Sandbox.run(...)  
    | "stopping"  // al recibir stop-script  
    | "stopped";  // ejecución finalizada o interrumpida  

const prod = process.env.NODE_ENV === 'production';

/* ──────────────────────── Clase principal del editor ─────────────────────── */
export default class BruCustomEditorProvider implements vscode.CustomTextEditorProvider {

    private source: "provider" | "webview" = "provider"
    private currentInbound: ((e: any) => void) | null = null;
    private lastBruContent = {}
    private sandboxNode: Sandbox | undefined;
    private SandboxState?: ScriptState = "idle"

    constructor(private readonly ctx: vscode.ExtensionContext) {
        this.ctx.globalState.get<string>("SandboxState")
    }

    /* ───────────── API de CustomTextEditorProvider ───────────── */
    public async resolveCustomTextEditor(
        doc: vscode.TextDocument,
        panel: vscode.WebviewPanel,
    ): Promise<void> {
        const path = doc.uri.path;
        if (/collection\.bru$/.test(path)) {
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
            await vscode.commands.executeCommand('vscode.openWith', doc.uri, 'vs-bruno.collectionEditor');
            return;
        }

        if (/\/environments\//.test(path)) {
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
            await vscode.commands.executeCommand('vscode.openWith', doc.uri, 'vs-bruno.environmentEditor');
            return;
        }

        if (/folder\.bru$/.test(path)) {
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
            //await vscode.commands.executeCommand('vscode.openWith', doc.uri, 'vs-bruno.environmentEditor');
            return;
        }

        /**
         * @alias 1 Light
         * @alias 2 Dark
         * @alias 3 HightContrast
         */
        this.setupWebviewPanel(panel);
        this.sendCurrentThemeToWebview(panel)

        const { webview } = panel;
        webview.options = { enableScripts: true };
        webview.html = this.html(webview);

        /* Rutas de proyecto */
        let collectionUri = (await this.findNearestCollection(doc.uri))?.uri ?? null;
        let configUri = (await this.findNearestJsonConfig(doc.uri))?.uri ?? null;

        /* Watchers ------------------------------------------------------------- */
        const disposables: vscode.Disposable[] = [];


        /* Cambios en cualquier .bru, collection.bru o bruno.json */
        disposables.push(
            vscode.workspace.onDidChangeTextDocument(async (e) => {
                const uri = e.document.uri.toString();

                /* ① Fichero que estamos editando */
                if (uri === doc.uri.toString()) {
                    if (this.source === "webview") {
                        this.source = "provider";
                        return;
                    }
                    this.lastBruContent = bruToJsonV2(e.document.getText())
                    webview.postMessage({ type: "update", data: this.lastBruContent });
                    return;
                }

                /* ② Colección */
                if (uri === collectionUri) {
                    webview.postMessage({
                        type: "collection",
                        data: collectionBruToJson(e.document.getText()),
                    });
                    return;
                }

                /* ③ Config */
                if (uri === configUri) {
                    webview.postMessage({
                        type: "bruno-config",
                        data: await this.findNearestJsonConfig(e.document.uri),
                    });
                }
            }),
        );

        /* Nuevas collection.bru creadas/borradas */
        const watcher = vscode.workspace.createFileSystemWatcher("**/collection.bru");
        disposables.push(watcher);
        watcher.onDidCreate(() => refreshNearestCollection(this));
        watcher.onDidDelete(() => refreshNearestCollection(this));

        /* Mensajes de la Webview ---------------------------------------------- */
        webview.onDidReceiveMessage((msg: WebviewMsg) => this.handleWebviewMessage(msg, doc, webview));

        /* Limpieza al cerrar el panel ----------------------------------------- */
        panel.onDidDispose(() => disposables.forEach((d) => d.dispose()));

        /* Helpers ------------------------------------------------------------- */
        async function refreshNearestCollection(self: any) {
            const nearest = await self.findNearestCollection(doc.uri);
            const newUri = nearest?.uri ?? null;
            if (newUri !== collectionUri) {
                collectionUri = newUri;
                webview.postMessage({ type: "collection", data: nearest?.data ?? null });
            }
        }
    }

    /* ──────────────────────────── Mensajes Webview ─────────────────────────── */
    private async handleWebviewMessage(msg: WebviewMsg, doc: vscode.TextDocument, webview: vscode.Webview) {
        if (this.ctx.globalState.get<boolean>("rollupEnabled") == true) {
            const sandbox = (await import("src/sandbox/SandboxNode")).SandboxNode
            this.sandboxNode = new sandbox(this.ctx.extensionUri);
        }

        switch (msg.type) {
            case "edit":
                this.source = "webview"
                const newString = jsonToBruV2(msg.data);

                const fullRange = new vscode.Range(
                    doc.positionAt(0),
                    doc.positionAt(doc.getText().length)
                )

                const edit = new vscode.WorkspaceEdit();
                edit.replace(doc.uri, fullRange, newString);
                await vscode.workspace.applyEdit(edit);

                break;

            case "init":
                webview.postMessage({ type: "open", data: bruToJsonV2(doc.getText()) });
                webview.postMessage({ type: "collection", data: await this.findNearestCollection(doc.uri) });
                webview.postMessage({ type: "bruno-config", data: await this.findNearestJsonConfig(doc.uri) });
                break;

            case "fetch":
                await this.handleFetch(msg.data, webview);
                break;

            case "run-script":
                if (!this.ctx.globalState.get<boolean>("rollupEnabled")) {
                    webview.postMessage({ type: "script-error", data: "JavaScript Disabled" });
                    const choice = await vscode.window.showInformationMessage(
                        'JS desactivado, quieres activarlo? (requiere reinicio)',
                        'Sí, Reiniciar',
                        'No'
                    );

                    if (choice === "Sí, Reiniciar") {
                        this.ctx.globalState.update("rollupEnabled", undefined);
                        vscode.window.showInformationMessage("Reloading vscode");
                        vscode.commands.executeCommand("workbench.action.reloadWindow")
                    }
                    break;
                }
                if (!this.sandboxNode) break;

                this.setScriptState("starting", webview)
                const nearest = await this.findNearestCollection(doc.uri);
                if (!nearest) {
                    webview.postMessage({ type: "script-error", data: "collection.bru not found" });
                }
                const emitEvent = (evt: any) => webview.postMessage({ type: "bru-event", data: evt });

                try {

                    //const SandboxNode = (await import("src/sandbox/SandboxNode")).SandboxNode;
                    //const { exports, logs } = await SandboxNode.run(opt, emitEvent);
                    const { code, virtualPath, args, bruContent, when } = msg.data;
                    const opt: RunOptions = {
                        code,
                        virtualPath,
                        args,
                        collectionRoot: vscode.Uri.joinPath(vscode.Uri.parse(nearest?.uri ?? ""), ".."),
                        resolveDir: vscode.Uri.joinPath(doc.uri, "..").fsPath,
                        extensionUri: this.ctx.extensionUri,
                        bruContent,
                        currentFilePath: doc.uri.fsPath,
                        scriptStartLine: this.getScriptStart(doc, when),
                        isPre: when === "#script-pre"
                    };


                    this.setScriptState("running", webview);
                    const { exports, logs, inbound } = await this.sandboxNode.run(opt, emitEvent);
                    this.currentInbound = inbound;

                    this.setScriptState("stopped", webview);
                }
                catch (err) {
                    Print('script', `[error] ${String(err)}`)
                    webview.postMessage({ type: "script-error", data: String(err) })
                    this.setScriptState("stopped", webview)
                }

                break;

            case "bru-get-reply":
                if (!this.currentInbound) break;
                this.currentInbound({
                    type: "bru-get-result",
                    payload: msg.data
                })
                break;

            case "stop-script":
                if (!this.sandboxNode) break;
                if (this.SandboxState === "running" || this.SandboxState === "starting") {
                    this.sandboxNode.stop()
                }
                break;
        }
    }

    /* ──────────────────────────── Helpers de negocio ──────────────────────── */
    private async handleFetch(
        req: { uri: string; init?: RequestInit },
        webview: vscode.Webview,
    ) {
        if (!req.uri) return;
        const t0 = performance.now();

        fetch(req.uri, req.init).then(async (res) => {
            const headers: Record<string, string> = {};
            if (res.ok) {
                res.headers.forEach((v, k) => (headers[k] = v));
                const ct = headers["content-type"] ?? "";
                const body =
                    ct.includes("application/json")
                        ? await res.json()
                        : ct.startsWith("text/")
                            ? await res.text()
                            : Buffer.from(await res.arrayBuffer()).toString("base64");

                const elapsedMs = performance.now() - t0;        // ← fin cronómetro

                const payload: SerializedResponse = {
                    ok: res.ok,
                    status: res.status,
                    statusText: res.statusText,
                    url: res.url,
                    headers,
                    parsedAs: ct.includes("json") ? "json" : ct.startsWith("text/") ? "text" : "binary",
                    body,
                    size: humanSize(Number.parseInt(res.headers.get("content-length") || "0"), 2),
                    time: humanDuration(elapsedMs, 0)
                };
                webview.postMessage({ type: "fetch", data: payload });
            }
            else {
                const elapsedMs = performance.now() - t0;        // ← fin cronómetro

                const payload: SerializedResponse = {
                    ok: res.ok,
                    status: res.status,
                    statusText: res.statusText,
                    url: req.uri,
                    headers: headers,
                    parsedAs: "text",
                    body: undefined,
                    size: humanSize(Number.parseInt(res.headers.get("content-length") || "0"), 2),
                    time: humanDuration(elapsedMs, 0)
                };
                webview.postMessage({ type: "fetch", data: payload });
            }
        }).catch(err => {
            const elapsedMs = performance.now() - t0;        // ← fin cronómetro

            const payload: SerializedResponse = {
                ok: false,
                status: 0,
                statusText: String(err.message ?? err),
                url: req.uri,
                headers: {},
                parsedAs: 'text',
                body: undefined,
                size: "0B",
                time: humanDuration(elapsedMs, 0)
            };
            webview.postMessage({ type: 'fetch', data: payload });
        })

    }

    /* ──────────────────────────── Utils UI & FS ───────────────────────────── */
    private html(webview: vscode.Webview): string {
        const cssUri = this.getUri(webview, ["dist", "tailwind.css"]);
        const reactUri = this.getUri(webview, ['dist', 'vendor', 'react', `${prod ? "react.production.min.js" : "react.development.js"}`]);
        const reactDomUri = this.getUri(webview, ['dist', 'vendor', 'react', `${prod ? "react-dom.production.min.js" : "react-dom.development.js"}`]);
        const hydrate = this.getUri(webview, ["dist", "webview", "HydrateBruno.js"]);
        const hlUri = this.getUri(webview, ["dist", "common", "highlight.min.js"]);
        const monaco = this.getUri(webview, ["dist", "vendor", "monaco-editor", "vs"]);

        //allow certain inline script
        const nonce = crypto.randomUUID().replace(/-/g, '');

        return /*html*/ `
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta http-equiv="Content-Security-Policy" content="
            default-src 'none';
            script-src ${webview.cspSource} 'nonce-${nonce}';
            style-src  ${webview.cspSource} 'unsafe-inline';
            img-src    ${webview.cspSource} data:;
            "/>
        <link rel="stylesheet" href="${cssUri}" />
        
    </head>
    <body>
        <div id="root"></div>
        <script nonce=${nonce}>
            globalThis.MONACO_BASE_PATH = '${monaco}';
        </script>
        <script src="${reactUri}"></script>
        <script src="${reactDomUri}"></script>
        <script src="${hlUri}" crossorigin></script>
        <script src="${hydrate}"></script>
    </body>
</html>`;
    }

    private async sendCurrentThemeToWebview(panel: vscode.WebviewPanel) {
        const config = vscode.workspace.getConfiguration();
        const currentTheme = config.get<string>('workbench.colorTheme');
        const extensions = vscode.extensions.all;

        for (const ext of extensions) {
            const contributes = ext.packageJSON?.contributes;
            if (!contributes?.themes) continue;

            for (const theme of contributes.themes) {
                if (theme.label === currentTheme) {
                    const themePath = path.join(ext.extensionPath, theme.path);
                    const content = JSON.parse(fs.readFileSync(themePath, 'utf8'));

                    panel.webview.postMessage({
                        type: 'vscode-theme-data',
                        data: {
                            base: theme.uiTheme ?? 'vs-dark',
                            colors: content.colors ?? {},
                            tokenColors: content.tokenColors ?? [],
                        }
                    });

                    return;
                }
            }
        }
    }

    private getUri(webview: vscode.Webview, path: string[]) {
        return webview.asWebviewUri(vscode.Uri.joinPath(this.ctx.extensionUri, ...path));
    }

    private getPath(path: string[]) { return vscode.Uri.joinPath(this.ctx.extensionUri, ...path).fsPath; }

    /* ──── búsqueda up-tree de collection.bru / bruno.json (sin usar 'path') ─── */
    private async findNearestCollection(doc: vscode.Uri) {
        return this.findUpTree(doc, "collection.bru", async (txt) => collectionBruToJson(txt));
    }

    private async findNearestJsonConfig(doc: vscode.Uri) {
        return this.findUpTree(doc, "bruno.json", JSON.parse);
    }

    private async findUpTree(
        doc: vscode.Uri,
        fileName: string,
        parse: (text: string) => any,
    ): Promise<{ uri: string; data: any } | null> {
        const ws = vscode.workspace.getWorkspaceFolder(doc);
        if (!ws) return null;

        let dir = this.parentUri(doc);
        while (dir.path.startsWith(ws.uri.path)) {
            const candidate = vscode.Uri.joinPath(dir, fileName);
            try {
                await vscode.workspace.fs.stat(candidate);
                const txt = Buffer.from(await vscode.workspace.fs.readFile(candidate)).toString("utf8");
                return { uri: candidate.toString(), data: parse(txt) };
            } catch {
                /* sigue subiendo */
            }
            const next = this.parentUri(dir);
            if (next.path === dir.path) break;
            dir = next;
        }
        return null;
    }

    private parentUri(uri: vscode.Uri) {
        const segments = uri.path.split("/");
        if (segments.length <= 2) return uri;
        return uri.with({ path: segments.slice(0, -1).join("/") || "/" });
    }

    private setScriptState(state: ScriptState, webview: vscode.Webview) {
        const gs = this.ctx.globalState;
        gs.update("SandboxState", state)
        this.SandboxState = gs.get<ScriptState>("SandboxState")
        webview.postMessage({ type: "script-state", data: state });
    }

    private getScriptStart(doc: vscode.TextDocument, when: "#script-pre" | "#script-post"): number {
        const marker = when === "#script-pre" ? "script:pre-request" : "script:post-response";
        const lines = doc.getText().split(/\r?\n/);
        const idx = lines.findIndex(l => l.trimStart().startsWith(marker));
        if (idx === -1) return 1;              // fallback
        // El código real empieza en la línea siguiente al marcador
        return idx + 2;                        // +1 para pasar a 1‑based y otra +1 para la siguiente línea
    }

    private setupWebviewPanel(panel: vscode.WebviewPanel) {
        const sendTheme = () => {
            const themeKind = vscode.window.activeColorTheme.kind;
            panel.webview.postMessage({
                type: 'theme',
                data: themeKind, // 1: Light, 2: Dark, 3: High contrast
            });
        };

        sendTheme(); // inicial

        vscode.window.onDidChangeActiveColorTheme(() => {
            sendTheme();
        });

        // Listener desde la WebView si necesitas handshake
        panel.webview.onDidReceiveMessage(msg => {
            if (msg.type === 'get-theme') {
                sendTheme();
            }
        });
    }
}
