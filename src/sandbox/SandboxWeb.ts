// src/sandbox/SandboxWeb.ts
import type { Sandbox, RunOptions, ScriptResult, LogEntry } from "./types";
import { unwrapDefault } from "./unwrapDefault";
import { bruPrelude } from "./bruPrelude";

export const SandboxWeb: Sandbox = {
  async run(opts: RunOptions, emit: (evt: any) => void): Promise<ScriptResult> {
    const logs: LogEntry[] = [];
    const { code, args } = opts;

    const pushLog = (kind: LogEntry["kind"], ...vals: any[]) => {
      logs.push({ kind, values: vals });
    };

    const consoleProxy = {
      log: (...v: any[]) => pushLog("log", ...v),
      warn: (...v: any[]) => pushLog("warn", ...v),
      error: (...v: any[]) => pushLog("error", ...v),
      info: (...v: any[]) => pushLog("info", ...v),
    };

    try {
      (globalThis as any).console = consoleProxy;
      (globalThis as any).args = args;
      (globalThis as any).__bruOutbound = emit;
      (globalThis as any).__bruQueued?.splice(0).forEach((e: any) => emit(e));

      const finalCode = bruPrelude + "\n" + code;
      const exports = {};
      const module = { exports };

      const fn = new Function("module", "exports", finalCode);
      fn(module, exports);

      return {
        exports: unwrapDefault(module.exports),
        logs
      };

    } catch (err: any) {
      pushLog("error", err.message || String(err));
      return {
        exports: [],
        logs
      };
    }
  }
}
