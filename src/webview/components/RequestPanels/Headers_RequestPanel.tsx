import ReactCodeMirror from "@uiw/react-codemirror";
import type { BruHeaders } from "src/bruno/bruno";
import { headersAutocomplete } from "src/common/headersCompletion";
import { useBruContent } from "src/webview/context/BruProvider"

export default function () {
    const { bruContent, setBruContent } = useBruContent();

    const updateParam = <K extends keyof BruHeaders>(
        index: number,
        key: K,
        value: BruHeaders[K]
    ) => {
        setBruContent(prev => {
            if (!prev?.headers) return prev;
            const next = [...prev.headers];
            next[index] = { ...next[index], [key]: value };  // modify solo el índice
            return { ...prev, headers: next };
        });
    };

    const removeParam = (index: number) => {
        setBruContent(prev => {
            if (!prev?.headers) return prev;
            const next = prev.headers.filter((_, i) => i !== index);
            return { ...prev, headers: next };
        });
    };

    return (
        <div className="w-full flex flex-col">
            <div className="flex-1 mt-2 w-full">
                <table className="br-table w-full">
                    <thead>
                        <tr>
                            <td className="w-[30%]">key</td>
                            <td>Value</td>
                            <td className="w-[70px]"></td>
                        </tr>
                    </thead>
                    <tbody>
                        {bruContent?.headers?.map((h, i) => (
                            <tr>
                                <td className="w-[30%]">
                                    <ReactCodeMirror value={h.name} extensions={headersAutocomplete} theme="none" basicSetup={false} editable className="CM-Table w-available" onChange={(e) => updateParam(i, 'name', e)} />
                                </td>
                                <td>
                                    <div className="flex flex-row justify-between w-full overflow-x-auto">
                                        <ReactCodeMirror value={h.value} theme="none" basicSetup={false} editable className="CM-Table w-available" onChange={(e) => updateParam(i, 'value', e)} />
                                    </div>
                                </td>
                                <td className="w-[70px]">
                                    <div className="flex items-center w-fit">
                                        <input type="checkbox" tabIndex={-1} className="mr-3" checked={h.enabled} onChange={(e) => updateParam(i, 'enabled', e.currentTarget.checked)} />
                                        <button tabIndex={-1} className="cursor-pointer" onClick={() => removeParam(i)}>
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
                        ))}
                    </tbody>
                </table>
                <button className="pr-2 py-3 mt-2 select-none cursor-pointer font-[0.8125rem] text-[#569cd6] hover:[&>span]:underline"
                    onClick={() => {
                        const blank: BruHeaders = {
                            enabled: true,
                            name: "",
                            value: ""
                        };
                        setBruContent(prev => ({
                            ...prev,
                            headers: [...(prev?.headers ?? []), blank]
                        }))
                    }}>+&nbsp;<span>Add Param</span></button>
            </div>
        </div>
    )
}