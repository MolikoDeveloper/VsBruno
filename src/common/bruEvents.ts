import { vscode } from "src/common/vscodeapi";
import type { BruFile } from "src/types/bruno/bruno";

export function GetRequest(payload: { id: string; key: string }, { bruContent }: { bruContent: BruFile | null }) {
    switch (payload.key) {
        case "req.method":
            vscode.postMessage({
                type: "bru-get-reply",
                data: {
                    id: payload.id,
                    data: "GET"
                }
            })
            break
        case "CollectionLocation":
            vscode.postMessage({
                type: "bru-get-reply",
                data: {
                    id: payload.id,
                    data: "aaa"
                }
            })
            break;
    }
}

type req =
    { type: "set.req.method", payload: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD" | "CONNECT" | "TRACE" } |
    { type: string, payload: any }

export function SetRequest({ type, payload }: req, bruContent: BruFile | null, setBruContent: React.Dispatch<React.SetStateAction<BruFile | null>>) {
    switch (type) {
        case "set.req.method":
            setBruContent(prev => ({
                ...prev,
                http: {
                    ...prev?.http!,
                    method: payload.toLowerCase()
                }
            }))
            break;
        case "set.req.body":
            setBruContent(prev => ({
                ...prev,
                http: {
                    ...prev?.http!,
                    method: payload.toLowerCase()
                }
            }))
            break;
    }
}