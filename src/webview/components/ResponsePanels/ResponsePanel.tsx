import { useState } from "react";
import Response_ResponsePanel from "./Response_ResponsePanel";
import Headers_ResponsePanel from "./Headers_ResponsePanel";
import Timeline_ResponsePanel from "./Timeline_ResponsePanel";
import Eraser from "../icons/Eraser";
import { useBruContent } from "src/webview/context/BruProvider";
import { useTimelineContext } from "src/webview/context/TimeLineProvider";

interface Props {
    className?: string
}

const tabs = ["Response", "Headers", "Timeline", "Tests"];

export default function ({ className }: Props) {
    const [currentTab, setCurrentTab] = useState<string>("Response");
    const { bruResponse, setBruResponse } = useBruContent()
    const { setEvents } = useTimelineContext()
    const activeStyle = "!border-b-[2px] border-b-[#569cd6] text-[var(--vscode-tab-activeForeground)]"
    const inactiveStyle = "text-[var(--vscode-tab-inactiveForeground)]"

    return (
        <div className={className}>
            <section className="flex flex-wrap items-center" role="tablist">
                {tabs.map((t, index) => (
                    <div key={`Response-${index}`}
                        className={`select-none px-0 py-[6px] cursor-pointer mr-5 ${currentTab === t ? activeStyle : inactiveStyle}`}
                        onClick={(e) => setCurrentTab(t)}>
                        {t}
                        <sup className="ml-1 font-medium"></sup>
                    </div>
                ))}
                {bruResponse &&
                    <div className="flex flex-grow items-center text-center justify-end gap-3 font-bold">
                        <button className="cursor-pointer hover:text-red-500"
                            onClick={() => {
                                setBruResponse(null);
                                setEvents([]);
                            }}>
                            <Eraser />
                        </button>
                        <div className={bruResponse?.ok ? "text-green-600" : "text-red-600"}>
                            <p>{bruResponse?.status} {bruResponse?.ok ? "ok" : "Error"}</p>
                        </div>
                        <p>{bruResponse.time}</p>
                        <p>{bruResponse.size}</p>
                    </div>
                }
            </section>
            <section className="w-full h-full">
                {
                    {
                        "Response": <Response_ResponsePanel />,
                        "Headers": <Headers_ResponsePanel />,
                        "Timeline": <Timeline_ResponsePanel />,
                        "Tests": <>WIP</>
                    }[currentTab]
                }
            </section>
        </div>
    )
}