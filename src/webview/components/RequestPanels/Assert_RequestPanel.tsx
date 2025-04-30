import ReactCodeMirror from "@uiw/react-codemirror";
import { useBruContent } from "src/webview/context/BruProvider";
import { AssertionOperators, ParseAssertToValue, ParseValueToAssert } from "./utils/assertUtils";
import { useCallback } from "react";


export default function () {
    const { bruContent, setBruContent } = useBruContent();

    const updateAssertAt = useCallback((
        index: number,
        payload: { newKey: "name" | "value" | "enabled"; newValue: string | boolean }
    ) => {
        setBruContent(prev => {
            const assertions = [...(prev?.assertions ?? [])];
            const current = { ...assertions[index] };

            if (payload.newKey === "value" && typeof payload.newValue === "string") {
                // re-parse & re-serialize to keep operator/operand split correct
                const parsed = ParseAssertToValue(current.value);
                parsed.operand = payload.newValue;
                current.value = ParseValueToAssert(parsed);
            } else if (payload.newKey === "name") {
                current.name = payload.newValue as string;
            } else if (payload.newKey === "enabled") {
                current.enabled = Boolean(payload.newValue);
            }

            assertions[index] = current;
            return { ...prev, assertions };
        });
    }, [setBruContent]);

    const removeAssertAt = useCallback((index: number) => {
        setBruContent(prev => {
            const assertions = [...(prev?.assertions ?? [])];
            assertions.splice(index, 1);
            return { ...prev, assertions };
        });
    }, [setBruContent]);

    const addEmptyAssert = useCallback(() => {
        setBruContent(prev => {
            const assertions = [...(prev?.assertions ?? [])];
            assertions.push({ name: "", value: "", enabled: true });
            return { ...prev, assertions };
        });
    }, [setBruContent]);

    return (
        <section className="w-full h-full">
            <div className="w-full flex-[1] flex-col">
                <table className="br-table w-full">
                    <thead>
                        <tr>
                            <td className="w-[30%]">Name</td>
                            <td className="w-[30%]">operator</td>
                            <td>Value</td>
                            <td className="w-[70px]"></td>
                        </tr>
                    </thead>
                    <tbody>
                        {bruContent?.assertions?.map((e, i) => <>
                            <tr key={`requestVars-${i}`}>
                                <td className="w-[30%]">
                                    <input className="w-full h-full m-0 p-2 placeholder:font-thin font-normal"
                                        style={{ outline: "0px" }} type="text" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false" value={e.name}
                                        onChange={(ev) => {
                                            updateAssertAt(i, { newKey: "name", newValue: ev.target.value })
                                        }}></input>
                                </td>
                                <td>
                                    <select>
                                        {AssertionOperators.map((op, ind) => (
                                            <option value={op.value}>{op.label}</option>
                                        ))

                                        }
                                    </select>
                                </td>
                                <td>
                                    <div className="flex flex-row justify-between w-full overflow-x-auto">
                                        <ReactCodeMirror value={ParseAssertToValue(e.value).operand} theme="none" basicSetup={false} editable className="CM-Table w-available"
                                            onChange={(val) => {
                                                updateAssertAt(i, { newKey: "value", newValue: val })
                                            }} />
                                    </div>
                                </td>
                                <td className="w-[70px]">
                                    <div className="flex items-center w-fit">
                                        <input type="checkbox" tabIndex={-1} className="mr-3" checked={e.enabled} onChange={(ev) => { updateAssertAt(i, { newKey: "enabled", newValue: ev.currentTarget.checked }) }} />
                                        <button tabIndex={-1} className="cursor-pointer" onClick={() => { removeAssertAt(i) }}>
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
                        addEmptyAssert()
                    }}>+&nbsp;<span>Add</span></button>
            </div>
        </section>
    )
}