import ReactCodeMirror from "@uiw/react-codemirror";
import type { BruVars } from "src/types/bruno/bruno";

import { useBruContent } from "src/webview/context/BruProvider"

export default function () {
    const { bruContent, setBruContent } = useBruContent();

    const isValidIndex = (arr: unknown[], idx: number) =>
        Number.isInteger(idx) && idx >= 0 && idx < arr.length;

    const updateReqVar = <K extends keyof BruVars>(
        index: number,
        key: K,
        value: BruVars[K]
    ) => {
        setBruContent(prev => {
            if (!prev?.vars?.req || !isValidIndex(prev.vars.req, index)) return prev;

            const updatedReq = prev.vars.req.map((v, i) =>
                i === index ? { ...v, [key]: value } : v
            );

            return {
                ...prev,
                vars: {
                    ...prev.vars,
                    req: updatedReq,
                },
            };
        });
    };

    const removeReqVar = (index: number) => {
        setBruContent(prev => {
            if (!prev?.vars?.req || !isValidIndex(prev.vars.req, index)) return prev;

            const updatedReq = prev.vars.req.filter((_, i) => i !== index);

            return {
                ...prev,
                vars: {
                    ...prev.vars,
                    req: updatedReq,
                },
            };
        });
    };

    const updateResVar = <K extends keyof BruVars>(
        index: number,
        key: K,
        value: BruVars[K]
    ) => {
        setBruContent(prev => {
            if (!prev?.vars?.res || !isValidIndex(prev.vars.res, index)) return prev;

            const updatedReq = prev.vars.res.map((v, i) =>
                i === index ? { ...v, [key]: value } : v
            );

            return {
                ...prev,
                vars: {
                    ...prev.vars,
                    res: updatedReq,
                },
            };
        });
    };

    const removeResVar = (index: number) => {
        setBruContent(prev => {
            if (!prev?.vars?.res || !isValidIndex(prev.vars.res, index)) return prev;

            const updatedReq = prev.vars.res.filter((_, i) => i !== index);

            return {
                ...prev,
                vars: {
                    ...prev.vars,
                    res: updatedReq,
                },
            };
        });
    };

    return (
        <section className="w-full flex-[1] flex-col">
            <div className="w-full flex-[1] flex-col">
                <table className="br-table w-full">
                    <thead>
                        <tr>
                            <td className="w-[30%]">Name</td>
                            <td>Value</td>
                            <td className="w-[70px]"></td>
                        </tr>
                    </thead>
                    <tbody>
                        {bruContent?.vars?.req?.map((e, i) => <>
                            <tr key={`requestVars-${i}`}>
                                <td className="w-[30%]">
                                    <input className="w-full h-full m-0 p-2 placeholder:font-thin font-normal"
                                        style={{ outline: "0px" }} type="text" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false" value={e.name}
                                        onChange={(ev) => {
                                            updateReqVar(i, "name", ev.target.value)
                                        }}></input>
                                </td>
                                <td>
                                    <div className="flex flex-row justify-between w-full overflow-x-auto">
                                        <ReactCodeMirror value={e.value} theme="none" basicSetup={false} editable className="CM-Table w-available"
                                            onChange={(val) => {
                                                updateReqVar(i, "value", val)
                                            }} />
                                    </div>
                                </td>
                                <td className="w-[70px]">
                                    <div className="flex items-center w-fit">
                                        <input type="checkbox" tabIndex={-1} className="mr-3" checked={e.enabled} onChange={(ev) => { updateReqVar(i, "enabled", ev.currentTarget.checked) }} />
                                        <button tabIndex={-1} className="cursor-pointer" onClick={() => { removeReqVar(i) }}>
                                            <svg width={20} height={20} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
                                                fill="none" strokeLinecap="round" strokeLinejoin="round">
                                                <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                                                <line x1="4" y1="7" x2="20" y2="7"></line>
                                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                                <line x1="14" y1="11" x2="14" y2="17"></line>
                                                <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"></path>
                                                <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3"></path>
                                            </svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </>)}
                    </tbody>
                </table>
                <button className="pr-2 py-3 mt-2 select-none cursor-pointer font-[0.8125rem] text-[#569cd6] hover:[&>span]:underline"
                    onClick={() => {
                        const blankVariable: BruVars = {
                            enabled: true,     // o false, como prefieras
                            name: "",
                            value: "",
                            local: false
                        };
                        setBruContent(prev => ({
                            ...prev,
                            vars: {
                                ...prev?.vars,
                                req: [...prev?.vars?.req!, blankVariable]
                            }
                        }))
                    }}>+&nbsp;<span>Add</span></button>
            </div>
            <div className="w-full flex-[1] flex-col">
                <table className="br-table w-full">
                    <thead>
                        <tr>
                            <td className="w-[30%]">Name</td>
                            <td>Value</td>
                            <td className="w-[70px]"></td>
                        </tr>
                    </thead>
                    <tbody>
                        {bruContent?.vars?.res?.map((e, i) => <>
                            <tr key={`requestVars-${i}`}>
                                <td className="w-[30%]">
                                    <input className="w-full h-full m-0 p-2 placeholder:font-thin font-normal"
                                        style={{ outline: "0px" }} type="text" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false" value={e.name}
                                        onChange={(ev) => {
                                            updateResVar(i, "name", ev.target.value)
                                        }}></input>
                                </td>
                                <td>
                                    <div className="flex flex-row justify-between w-full overflow-x-auto">
                                        <ReactCodeMirror value={e.value} theme="none" basicSetup={false} editable className="CM-Table w-available"
                                            onChange={(val) => {
                                                updateResVar(i, "value", val)
                                            }} />
                                    </div>
                                </td>
                                <td className="w-[70px]">
                                    <div className="flex items-center w-fit">
                                        <input type="checkbox" tabIndex={-1} className="mr-3" checked={e.enabled} onChange={(ev) => { updateResVar(i, "enabled", ev.currentTarget.checked) }} />
                                        <button tabIndex={-1} className="cursor-pointer" onClick={() => { removeResVar(i) }}>
                                            <svg width={20} height={20} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
                                                fill="none" strokeLinecap="round" strokeLinejoin="round">
                                                <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                                                <line x1="4" y1="7" x2="20" y2="7"></line>
                                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                                <line x1="14" y1="11" x2="14" y2="17"></line>
                                                <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"></path>
                                                <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3"></path>
                                            </svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </>)}
                    </tbody>
                </table>
                <button className="pr-2 py-3 mt-2 select-none cursor-pointer font-[0.8125rem] text-[#569cd6] hover:[&>span]:underline"
                    onClick={() => {
                        const blankVariable: BruVars = {
                            enabled: true,
                            name: "",
                            value: "",
                            local: false
                        };
                        setBruContent(prev => ({
                            ...prev,
                            vars: { ...prev?.vars, res: [...prev?.vars?.res || [], blankVariable] }
                        }))
                    }}>+&nbsp;<span>Add</span></button>
            </div>
        </section>
    )
}