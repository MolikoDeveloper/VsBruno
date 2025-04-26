import * as vscode from "vscode"

export interface RunOptions {
    /** collection.bru path */
    collectionRoot: vscode.Uri;
    /** script content */
    code: string;
    /** relative path of the main script @example "scripts/getuser.js"*/
    entryRel: string;
    /** Datos arbitrarios que el host quiere pasarle al script */
    args?: any;
}

export interface Sandbox {
    run(opts: RunOptions): Promise<any>;
}

export type LogEntry = { kind: "log" | "warn" | "error" | "info"; values: any[] };