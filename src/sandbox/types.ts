import * as vscode from "vscode";

export type LogEntry = { kind: "log" | "warn" | "error" | "info"; values: any[] };

export interface RunOptions {
    collectionRoot: vscode.Uri;
    resolveDir: string;        // carpeta del .bru activo
    code: string;              // código inline o TS/JS
    virtualPath?: string;      // nombre lógico, p.ej. "script.ts"
    args?: any;
}

export interface ScriptResult {
    exports: any;
    logs: LogEntry[];
}

export interface Sandbox {
    run(opts: RunOptions, emit: (evt: any) => void): Promise<ScriptResult>;
}
