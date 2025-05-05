import { vscode } from "src/common/vscodeapi";
import type { BruFile } from "src/types/bruno/bruno";

export function GetRequest(payload: { id: string; key: any }, { bruContent }: { bruContent: BruFile | null }) {
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
    }
}