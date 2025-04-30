import BottomBar from "src/webview/components/BottomBar";
import { Panel } from "src/webview/components/Panel/Panel";
import { PanelGroup } from "src/webview/components/Panel/PanelGroup";
import RequestPanel from "src/webview/components/RequestPanels/RequestPanel";
import TopBar from "src/webview/components/TopBar";
import { useBruContent } from "./context/BruProvider";
import { useEffect, useState } from "react";
import type { SerializedResponse } from "src/types/shared";
import { vscode } from "src/common/vscodeapi";
import ResponsePanel from "src/webview/components/ResponsePanels/ResponsePanel";
import type { BruFile, BruCollection } from "src/types/bruno/bruno";
import type { BrunoConfig } from "src/types/bruno/bruno.config";

type msg = {
    type: "update" | "open" | "fetch" | "collection" | "script-error" | "script-result" | "bruno-config" | "bru-event" | "script-state"
    data: unknown
}

export default function () {
    const { bruContent, setBruContent, bruCollection, setBruCollection, bruConfig, setBruConfig } = useBruContent();
    const [response, setResponse] = useState<SerializedResponse | null>(null);
    const [firstLoad, setFirstLoad] = useState(true);

    useEffect(() => {
        vscode.postMessage({ type: "init" });
        //window.addEventListener("click", (e) => console.log(e?.target?.tagName as any, typeof e.target.tagName))

        const listener = (event: MessageEvent) => {
            const message: msg = event.data;
            switch (message.type) {
                case "open":
                    setBruContent(message.data as BruFile)
                    break;
                case "update":
                    setFirstLoad(true);
                    setBruContent(message.data as BruFile);
                    break;
                case "fetch":
                    setResponse(message.data as SerializedResponse)
                    break;
                case "collection":
                    setBruCollection(message.data as BruCollection)
                    break;
                case "script-result":
                    //const logs = ((message.data as any).logs as LogEntry[]);
                    //console.log(logs)
                    //console.log("exports →", (message.data as any).exports); // función getUserById
                    break;
                case "script-error":
                    console.log(message.data)
                    break;
                case "bruno-config":
                    setBruConfig(message.data as BrunoConfig)
                    break;
                case "bru-event":
                    console.log(message.data)
                    break;
                case "script-state":
                    console.log(message.data)
                    break;
                default:
                    console.log(message.type);
                    break;
            }
        }
        window.addEventListener("message", listener);

        return () => {
            window.removeEventListener("message", listener)
        }
    }, [])

    useEffect(() => {
        if (!bruContent) return;
        console.log(bruContent)
        if (firstLoad) { setFirstLoad(false); return; }
        vscode.postMessage({
            type: "edit",
            data: bruContent
        })
    }, [bruContent])

    return (
        <div className="m-0 p-0 relative h-screen w-screen flex flex-col">
            <div className="m-0 p-0 relative h-full w-full flex flex-col px-4">
                <TopBar />
                <div className="h-full">
                    <PanelGroup direction="horizontal" className="h-full w-full">
                        <Panel className="min-w-[350px]">
                            <RequestPanel className="h-full pr-4" />
                        </Panel>
                        <Panel className="min-w-[350px]">
                            <ResponsePanel className="h-full pl-4" />
                        </Panel>
                    </PanelGroup>
                </div>
            </div>
            <BottomBar></BottomBar>
        </div>
    )
}