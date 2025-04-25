import ReactCodeMirror from "@uiw/react-codemirror";
import { useBruContent } from "src/webview/context/BruProvider"

export interface ParamEntry { method: string; value: string; active: boolean; }

function toParamEntries(raw: Record<string, string> | undefined): ParamEntry[] {
    if (!raw) return [];

    return Object.entries(raw).map(([key, value]) => {
        const inactive = key.startsWith("~");
        return {
            method: inactive ? key.slice(1) : key,
            value,
            active: !inactive,
        };
    });
}

function fromParamEntries(
    entries: ParamEntry[]
): Record<string, string> {
    if (!entries) return {};

    return entries.reduce<Record<string, string>>((acc, { method, value, active }) => {
        const key = active ? method : `~${method}`;
        acc[key] = value;
        return acc;
    }, {});
}

type params_query = { blockName: string, data: Record<string, string> }

export default function () {
    const { bruContent } = useBruContent();

    return (
        <div className="w-full flex flex-col">
            <div className="flex-1 mt-2 w-full">
                <div className="mb-1 text-xs text-[var(--vscode-tab-activeForeground)]">Query</div>
                <table className="br-table w-full">
                    <thead>
                        <tr>
                            <td className="w-[30%]">Name</td>
                            <td>Value</td>
                            <td className="w-[70px]"></td>
                        </tr>
                    </thead>
                    <tbody>
                        {/*entries.map((e: any, i: any) => <>
                            <tr key={`requestParams-${i}`}>
                                <td className="w-[30%]">
                                    <input className="w-full h-full m-0 p-2 placeholder:font-thin font-normal" style={{ outline: "0px" }} type="text" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false" value={e.method}></input>
                                </td>
                                <td>
                                    <div className="flex flex-row justify-between w-full overflow-x-auto">
                                        <ReactCodeMirror value={e.value} theme="none" basicSetup={false} editable className="CM-Table w-available" />
                                    </div>
                                </td>
                                <td className="w-[70px]">
                                    <div className="flex items-center w-fit">
                                        <input type="checkbox" tabIndex={-1} className="mr-3" checked={e.active} />
                                        <button tabIndex={-1}>
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
                        </>)*/}
                    </tbody>
                </table>
                <button className="pr-2 py-3 mt-2 select-none cursor-pointer font-[0.8125rem] text-[#569cd6] hover:[&>span]:underline">+&nbsp;<span>Add Param</span></button>
                <div className="mb-1 text-[var(--vscode-tab-activeForeground)] text-xs">Path</div>
                <table className="br-table w-full">
                    <thead>
                        <tr>
                            <td className="w-[30%]">Name</td>
                            <td>Value</td>
                        </tr>
                    </thead>
                    <tbody>
                    </tbody>
                </table>
            </div>
        </div>
    )
}