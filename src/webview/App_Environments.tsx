import { useEffect } from "react";
import { useBruContent } from "./context/BruProvider"
import { vscode } from "src/common/vscodeapi";
import type { BruEnvFile } from "src/types/bruno/bruno";

type msg = {
    type: "update" | "init" | "fetch" | "collections"
    data: unknown
}

export default function () {
    const { bruEnvironment, setBruEnvironment } = useBruContent();

    useEffect(() => {
        vscode.postMessage({ type: 'init' })

        const listener = (event: MessageEvent) => {
            const message: msg = event.data;

            switch (message.type) {
                case "init":
                    setBruEnvironment(message.data as BruEnvFile)
                    break;
                case "update":
                    setBruEnvironment(message.data as BruEnvFile)
                    break;
            }
        }
        window.addEventListener("message", listener)

        return () => {
            window.removeEventListener("message", listener)
        }
    }, [])

    return <>{JSON.stringify(bruEnvironment, null, 1)}</>
}