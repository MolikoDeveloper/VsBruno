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
import { loader } from "@monaco-editor/react";
import { useEditorConfig } from "./context/EditorProvider";

type providerMsg =
    { type: "theme", data: 1 | 2 | 3 } |
    { type: "update", data: BruFile } |
    { type: "open", data: BruFile } |
    { type: "fetch", data: SerializedResponse } |
    { type: "collection", data: BruCollection } |
    { type: "bruno-config", data: BrunoConfig } |
    { type: "bru-event", data: { type: string; payload: any } } |
    { type: "script-error", data: any } |
    { type: "script-result", data: any } |
    { type: "script-state", data: any } |
    { type: "vscode-theme-data", data: { base: string, colors: any, tokenColors: any } }

export default function () {
    const { bruContent, setBruContent, bruCollection, setBruCollection, setBruConfig, setBruResponse } = useBruContent();
    const [scriptStatus, SetScriptStatus] = useState<"starting" | "running" | "stopping" | "stopped">("stopped");
    const { themeKind, setThemeKind } = useEditorConfig();
    const [firstLoad, setFirstLoad] = useState(true);

    //monaco loader.
    useEffect(() => {
        loader.config({
            paths: { vs: (globalThis as any).MONACO_BASE_PATH },
        });
    }, [])

    useEffect(() => {
        vscode.postMessage({ type: "init" });

        const listener = (event: MessageEvent) => {
            const message: providerMsg = event.data;
            switch (message.type) {
                case "open":
                    setBruContent(message.data)
                    break;
                case "update":
                    setFirstLoad(true);
                    setBruContent(message.data);
                    break;
                case "fetch":
                    setBruResponse(message.data)
                    break;
                case "collection":
                    setBruCollection(message.data)
                    break;
                case "script-result":
                    break;
                case "script-error":
                    console.log(`error`, message.data)
                    break;
                case "bruno-config":
                    setBruConfig(message.data)
                    break;
                case "bru-event":
                    /*//console.log("event:", message.data)
                    //const evt = message.data;
                    if (evt.type === "bru-get") {
                        //GetRequest(evt.payload, { bruContent: bruContent })
                    }
                    else {
                        //SetRequest({ type: evt.type, payload: evt.payload }, bruContent, setBruContent);
                    }*/
                    break;
                case "script-state":
                    SetScriptStatus(message.data)
                    break;
                case "theme":
                    setThemeKind(message.data)
                    break;
                case "vscode-theme-data":
                    console.log(message.data)
                    break;
                default:
                    //console.log(message);
                    break;
            }
        }
        window.addEventListener("message", listener);

        return () => {
            window.removeEventListener("message", listener)
        }
    }, [])

    // on everyChange
    useEffect(() => {
        if (!bruContent) return;
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
                        <Panel className="min-w-[350px] h-full relative">
                            <RequestPanel className="px-4 h-full w-full flex flex-col" />
                        </Panel>
                        <Panel className="min-w-[350px] h-full relative">
                            <ResponsePanel className="px-4 h-full w-full flex flex-col" />
                        </Panel>
                    </PanelGroup>
                </div>
            </div>
            <BottomBar></BottomBar>
        </div>
    )
}