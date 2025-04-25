import { useEffect, useRef, useState } from "react";
import RequestParamsPanel from "./Params_RequestPanel";
import BodyParamsPanel from "./Body_RequestPanel";
import { useBruContent } from "src/webview/context/BruProvider";

interface Props {
    className?: string
}
const tabs = ["Params", "Body", "Headers", "Auth", "Vars", "Script", "Assert", "Test", "Docs"];

type Mime = {
    name: string,
    values:
    {
        key: string
        mime: string
        name: string
        active: boolean;
    }[]
}

const mimes: Mime[] = [
    {
        name: "Form",
        values: [
            {
                mime: "multipart/form-data",
                key: "multipart-form",
                name: "Multipart Form",
                active: false
            },
            {
                mime: "application/x-www-form-urlencoded",
                key: "form-url-encoded",
                name: "Form URL Encoded",
                active: false
            }
        ]
    },
    {
        name: "Raw",
        values: [
            {
                mime: "application/json",
                key: "json",
                name: "JSON",
                active: false
            },
            {
                mime: "application/ld+json",
                key: "ldjson",
                name: "JSON-LD",
                active: false
            },
            {
                mime: "application/xml",
                key: "xml",
                name: "XML",
                active: false
            },
            {
                mime: "text/plain",
                key: "text",
                name: "Plain Text",
                active: false
            },
            {
                mime: "application/sparql",
                key: "sparql",
                name: "SparQL",
                active: false
            }
        ]
    },
    {
        name: "Others",
        values: [
            {
                mime: "",
                key: "",
                name: "No Body",
                active: true
            }
        ]
    }
]

export default function ({ className }: Props) {
    const { bruContent } = useBruContent();
    const [currentTab, setCurrentTab] = useState<string>("Params");
    const [contentType, setContentType] = useState<string>("");

    const activeStyle = "!border-b-[2px] border-b-[#569cd6] text-[var(--vscode-tab-activeForeground)]"
    const inactiveStyle = "text-[var(--vscode-tab-inactiveForeground)]"

    return (
        <div className={className}>
            <div className="flex flex-col h-full relative">
                <section className="flex flex-wrap items-center" role="tablist">
                    {tabs.map((t, index) => (
                        <div key={"tab" + t + index}
                            className={`select-none px-0 py-[6px] cursor-pointer mr-5 ${currentTab === t ? activeStyle : inactiveStyle}`}
                            onClick={(e) => setCurrentTab(t)}
                        >
                            {t}
                            <sup className="ml-1 font-medium"></sup>
                        </div>
                    ))}
                    {currentTab === "Body" && (
                        <div className="flex flex-grow justify-end items-center">
                            <div className="inline-flex items-center cursor-pointer">
                                <div className="text-amber-300 flex items-center justify-center pl-3 py-1 select-none selected-body-mode" aria-expanded="false">
                                    <select className="bg-transparent text-amber-400 py-1 [&>*]:bg-[var(--vscode-input-background)]"
                                        defaultValue={bruContent.http?.body} onChange={(e) => setContentType(e.currentTarget.value)} style={{ outline: 0 }}>
                                        {mimes.map((m, i) => (
                                            <optgroup key={'ctg' + i} label={m.name}>
                                                {m.values.map((mv, iv) => (
                                                    <option key={"cto" + iv} className={`text-[var(--vscode-tab-activeForeground)] ${!mv.active && "text-red-400"}`} value={mv.key}>{mv.name}</option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <button className="ml-1 cursor-pointer">Prettify</button>
                        </div>
                    )}
                </section>
                <section className="flex w-full flex-1 mt-5">
                    {
                        {
                            "Params": <RequestParamsPanel></RequestParamsPanel>,
                            "Body": <BodyParamsPanel contentType={contentType}></BodyParamsPanel>,
                            "Headers": <>WIP</>,
                            "Auth": <>WIP</>,
                            "Vars": <>WIP</>,
                            "Script": <>WIP</>,
                            "Assert": <>WIP</>,
                            "Test": <>WIP</>,
                            "Docs": <>WIP</>,
                        }[currentTab]
                    }
                </section>
            </div>
        </div>
    )
}