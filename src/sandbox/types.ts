import * as vscode from "vscode"

// src/sandbox/types.ts
export type LogEntry = { kind: "log" | "warn" | "error" | "info"; values: any[] };

export interface RunOptions {
  collectionRoot: vscode.Uri;
  code: string;
  /** Nombre lógico del archivo inline: scripts/getuser.js, users/foo.ts…  opcional  */
  virtualPath?: string;
  args?: any;
}

export interface Sandbox {
  run(opts: RunOptions): Promise<{ exports: any; logs: LogEntry[] }>;
}

export type ScriptResult = { exports: any; logs: LogEntry[] };