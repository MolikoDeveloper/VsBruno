import { useState } from "react";

interface Props {
    className?: string
}

const tabs = ["Response", "Headers", "Timeline", "Tests"];

export default function ({ className }: Props) {
    const [currentTab, setCurrentTab] = useState<string>("Response");
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
            </section>
            <section>
                {
                    {
                        "Response": <>WIP</>,
                        "Headers": <>WIP</>,
                        "Timeline": <>WIP</>,
                        "Tests": <>WIP</>
                    }[currentTab]
                }
            </section>
        </div>
    )
}