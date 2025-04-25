import BottomBar from "src/components/BottomBar";
import { Panel } from "src/components/Panel/Panel";
import { PanelGroup } from "src/components/Panel/PanelGroup";
import RequestPanel from "src/components/RequestPanels/RequestPanel";
import TopBar from "src/components/TopBar";
import { useBruContent } from "./context/BruProvider";
import { useEffect, useState } from "react";
import type { SerializedResponse } from "src/types/shared";
import { vscode } from "src/common/vscodeapi";
import ResponsePanel from "src/components/ResponsePanels/ResponsePanel";
import type { BruCollection, BruFile } from "src/bruno/bruno";

type msg = {
    type: "update" | "open" | "fetch" | "collection"
    data: unknown
}

export default function () {
    const { bruContent, setBruContent, bruCollection, setBruCollection } = useBruContent();
    const [response, setResponse] = useState<SerializedResponse | null>(null)

    useEffect(() => {
        vscode.postMessage({ type: "init" });

        const listener = (event: MessageEvent) => {
            const message: msg = event.data;
            switch (message.type) {
                case "open":
                    setBruContent(message.data as BruFile)
                    break;
                case "update":
                    setBruContent(message.data as BruFile)
                    break;
                case "fetch":
                    setResponse(message.data as SerializedResponse)
                    break;
                case "collection":
                    setBruCollection(message.data as BruCollection)
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
            <BottomBar>
                <a className="cursor-default">{bruContent?.meta?.type}</a>
                <a className="cursor-default">{bruContent?.meta?.name}</a>
            </BottomBar>
        </div>
    )
}