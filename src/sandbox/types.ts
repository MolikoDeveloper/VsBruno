import * as vscode from "vscode"

// src/sandbox/types.ts
export type LogEntry = { kind: "log" | "warn" | "error" | "info"; values: any[] };

export interface RunOptions {
  collectionRoot: vscode.Uri;
  code: string;
  /** Nombre lógico del archivo inline: scripts/getuser.js, users/foo.ts…  opcional  */
  virtualPath?: string;
  resolveDir: string;
  args?: any;
}

export interface Sandbox {
  run(opts: RunOptions, emit: (evt: any) => void): Promise<ScriptResult>;
}

export type ScriptResult = { exports: any; logs: LogEntry[] };