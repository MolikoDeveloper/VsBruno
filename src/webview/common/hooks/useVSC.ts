import { useEffect } from "react";
import type { BruFile, BruCollection, BruHeaders } from "src/types/bruno/bruno";
import type { BrunoConfig } from "src/types/bruno/bruno.config";
import type { SerializedResponse, WorkSpaceScripts } from "src/types/shared";

type providerMsg =
    { type: "theme", data: 1 | 2 | 3 } |
    { type: "update", data: BruFile } |
    { type: "open", data: BruFile } |
    { type: "fetch", data: SerializedResponse } |
    { type: "collection", data: BruCollection } |
    { type: "bruno-config", data: BrunoConfig } |
    { type: "bru-event", data: { type: string; payload: any } } |
    { type: "script-error", data: any } |
    { type: "script-result", data: { isPre: boolean, exports: Record<string, string> & { req: { headers: BruHeaders[] | undefined, body: any | undefined } }, inbound: (ev: any) => void } } |
    { type: "script-state", data: any } |
    { type: "vscode-theme-data", data: { base: string, colors: any, tokenColors: any } } |
    { type: "bruno-scripts", data: WorkSpaceScripts[] }

export function useVSC<T extends providerMsg["type"]>(
  type: T,
  callback: (data: Extract<providerMsg, { type: T }>["data"]) => void
) {
  useEffect(() => {
    const handler = (e: MessageEvent<providerMsg>) => {
      if (e.data.type === type) {
        callback(e.data.data as any);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [type, callback]);
}