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
import type { LogEntry } from "src/sandbox/types";

type msg = {
    type: "update" | "open" | "fetch" | "collection" | "script-error" | "script-result"
    data: unknown
}

export default function () {
    const { bruContent, setBruContent, bruCollection, setBruCollection } = useBruContent();
    const [response, setResponse] = useState<SerializedResponse | null>(null)

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
                    setBruContent(message.data as BruFile)
                    break;
                case "fetch":
                    setResponse(message.data as SerializedResponse)
                    break;
                case "collection":
                    setBruCollection(message.data as BruCollection)
                    break;
                case "script-result":
                    const logs = ((message.data as any).logs as LogEntry[]);
                    console.log(logs)
                    console.log("exports →", (message.data as any).exports); // función getUserById

                    logs.forEach((log) => {
                        switch (log.kind) {
                            case "log":
                                console.log(log.values);
                                break;
                            case "info":
                                console.info(log.values);
                                break;
                            case "error":
                                console.error(log.values)
                                break
                            case "warn":
                                console.warn(log.values)
                                break
                            default:
                                console.log(log)
                                break
                        }
                    })

                    break;
                case "script-error":
                    console.log('error', message.data);
                    break;
                default:
                    console.log(message.type);
                    break;
            }
        }
        window.addEventListener("message", listener);

        vscode.postMessage({
            type: "run-script",
            data: {
                entryRel: "scripts/getuser.js",
                code: `
const users = [
    {id: 1, name: "John Doe"},
    {id: 2, name: "Jane Smith"},
    {id: 3, name: "Sam Brown"}
]

const getUserById = (id) => {
    return users.find(user => user.id === id);
}

console.log(getUserById(2));
console.log("Hola!");

module.exports = getUserById;
                `,
                args: { id: 1 }
            }
        });

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