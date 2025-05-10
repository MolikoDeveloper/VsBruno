import { useState } from "react";
import RequestParamsPanel from "./Params_RequestPanel";
import BodyParamsPanel from "./Body_RequestPanel";
import Headers_RequestPanel from "./Headers_RequestPanel";
import Auth_RequestPanel from "./Auth_RequestPanel";
import { useBruContent } from "src/webview/context/BruProvider";
import Scripts_RequestPanel from "./Scripts_RequestPanel";
import Vars_RequestPanel from "./Vars_RequestPanel";
import Assert_RequestPanel from "./Assert_RequestPanel";

interface Props {
    className?: string
}
const tabs = ["Params", "Body", "Headers", "Auth", "Vars", "Script", "Assert", "Test", "Docs"];


export default function ({ className }: Props) {
    const { bruContent } = useBruContent();
    const [currentTab, setCurrentTab] = useState<string>("Params");

    const activeStyle = "!border-b-[2px] border-b-[#569cd6] text-[var(--vscode-tab-activeForeground)]";
    const inactiveStyle = "text-[var(--vscode-tab-inactiveForeground)]";

    return (
        <div className={className}>
            <section className="flex flex-wrap items-center w-full" role="tablist">
                {tabs.map((t, index) => (
                    <div key={"Reqtab" + index}
                        className={`select-none px-0 py-[6px] cursor-pointer mr-5 ${currentTab === t ? activeStyle : inactiveStyle}`}
                        onClick={(e) => setCurrentTab(t)}
                    >
                        {t}
                        <>{
                            {
                                "Params": <sup className="ml-1 font-medium">{bruContent?.params?.length || ""}</sup>,
                                "Body": <sup className="ml-1 font-medium">{bruContent?.body?.json && <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" className="inline-block"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M12 7a5 5 0 1 1 -4.995 5.217l-.005 -.217l.005 -.217a5 5 0 0 1 4.995 -4.783z" strokeWidth="0" fill="currentColor"></path></svg>}</sup>,
                                "Headers": <sup className="ml-1 font-medium">{bruContent?.headers?.length || ""}</sup>,
                                "Auth": <sup className="ml-1 font-medium">{(bruContent?.http?.auth !== "none" as any) && <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" className="inline-block"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M12 7a5 5 0 1 1 -4.995 5.217l-.005 -.217l.005 -.217a5 5 0 0 1 4.995 -4.783z" strokeWidth="0" fill="currentColor"></path></svg>}</sup>,
                                "Vars": <sup className="ml-1 font-medium">{((bruContent?.vars?.req?.length || 0) + (bruContent?.vars?.res?.length || 0)) || ""}</sup>,
                                "Script": <sup className="ml-1 font-medium">{(bruContent?.script?.req?.length || 0) + (bruContent?.script?.res?.length || 0) && <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" className="inline-block"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M12 7a5 5 0 1 1 -4.995 5.217l-.005 -.217l.005 -.217a5 5 0 0 1 4.995 -4.783z" strokeWidth="0" fill="currentColor"></path></svg>}</sup>,
                                "Assert": <sup className="ml-1 font-medium">{Object.keys(bruContent?.assert ?? {}).length || ""}</sup>,
                                "Test": <></>,
                                "Docs": <sup className="ml-1 font-medium">{bruContent?.docs && <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" className="inline-block"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M12 7a5 5 0 1 1 -4.995 5.217l-.005 -.217l.005 -.217a5 5 0 0 1 4.995 -4.783z" strokeWidth="0" fill="currentColor"></path></svg>}</sup>,
                            }[t]
                        }</>
                    </div>
                ))}
            </section>
            <section className="flex w-full h-full flex-1">
                {
                    {
                        "Params": <RequestParamsPanel />,
                        "Body": <BodyParamsPanel />,
                        "Headers": <Headers_RequestPanel />,
                        "Auth": <Auth_RequestPanel />,
                        "Vars": <Vars_RequestPanel />,
                        "Script": <Scripts_RequestPanel />,
                        "Assert": <Assert_RequestPanel />,
                        "Test": <>WIP</>,
                        "Docs": <>WIP</>,
                    }[currentTab]
                }
            </section>
        </div>
    )
}