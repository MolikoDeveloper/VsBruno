import * as vscode from "vscode";

export type LogEntry = { kind: "log" | "warn" | "error" | "info"; values: any[] };

export interface RunOptions {
    code: string;
    virtualPath?: string;
    collectionRoot: vscode.Uri;
    resolveDir: string;
    args: any;
    extensionUri: vscode.Uri;
    bruContent: any;
}


export interface ScriptResult {
    exports: any;
    logs: LogEntry[];
    inbound: (e: any) => any
}

export interface Sandbox {
    run(opts: RunOptions, emit: (evt: any) => void): Promise<ScriptResult>;
}
