import * as vscode from "vscode";

export type LogEntry = { kind: "log" | "warn" | "error" | "info"; values: any[] };

export interface RunOptions {
    banner: string,
    code: string;
    virtualPath?: string;
    collectionRoot: vscode.Uri;
    resolveDir: string;
    args: any;
    bruContent: any;
    currentFilePath: string;
    extensionUri: vscode.Uri;
    scriptStartLine: number;
    isPre: boolean;
}


export interface ScriptResult {
    exports: any;
    inbound: (e: any) => any
}

export interface Sandbox {
    run(opts: RunOptions, emit: (evt: any) => void): Promise<ScriptResult>;
    stop(): void
}
