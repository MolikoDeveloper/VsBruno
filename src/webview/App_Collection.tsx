import { useEffect } from "react";
import { useBruContent } from "./context/BruProvider"
import { vscode } from "src/common/vscodeapi";
import type { BruCollection } from "src/bruno/bruno";

type msg = {
    type: "update" | "open" | "fetch" | "collections"
    data: unknown
}

export default function () {
    const { bruCollection, setBruCollection } = useBruContent();

    useEffect(() => {
        vscode.postMessage({ type: 'init' })

        const listener = (event: MessageEvent) => {
            const message: msg = event.data;

            switch (message.type) {
                case "open":
                    setBruCollection(message.data as BruCollection)
                    break;
                case "update":
                    setBruCollection(message.data as BruCollection)
                    break;
            }
        }
        window.addEventListener("message", listener)

        return () => {
            window.removeEventListener("message", listener)
        }
    }, [])

    return <>{JSON.stringify(bruCollection, null, 1)}</>
}