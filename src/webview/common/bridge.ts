/* src/webview/common/bridge.ts
 * Helpers for talking to the VS Code provider & sandbox VM
 * ------------------------------------------------------------------------- */

import { vscode } from 'src/common/vscodeapi';
import type { BruFile } from 'src/types/bruno/bruno';


/**
 * Handle 'bru-get' events coming from the sandbox (forwarded by the provider)
 */
export function handleBruGet(
  { id, key }: { id: string; key: string },
  bruContent: BruFile | null
) {
  const value = localGetter(key, bruContent);

  vscode.postMessage({
    type: 'bru-get-reply',
    data: { id, payload: value }
  });
}

/* ------------------------------------------------------------------ */
/* 2.  set.req.* mutations ------------------------------------------ */
/* ------------------------------------------------------------------ */

type ReqMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'PATCH'
  | 'OPTIONS'
  | 'HEAD'
  | 'CONNECT'
  | 'TRACE';
  
/**
 * Ask the running sandbox VM for a value and get the reply as a Promise.
 *   const userAgent = await queryVM('req.header', 'user-agent');
 */
export function queryVM<T = unknown>(
  type: string,
  payload: any
): Promise<T> {
  const requestId = crypto.randomUUID();

  return new Promise<T>(resolve => {
    const listener = (event: MessageEvent) => {
      const msg = event.data;
      if (
        msg?.type === 'bru-vm-reply' &&
        msg.data?.id === requestId
      ) {
        window.removeEventListener('message', listener);
        resolve(msg.data.payload as T);
      }
    };
    window.addEventListener('message', listener);

    vscode.postMessage({
      type: 'bru-vm-query',
      data: { id: requestId, type, payload }
    });
  });
}
