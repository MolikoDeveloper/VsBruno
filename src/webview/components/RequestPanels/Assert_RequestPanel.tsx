import ReactCodeMirror from "@uiw/react-codemirror";
import { useBruContent } from "src/webview/context/BruProvider";


export default function () {
    const { bruContent, setBruContent } = useBruContent();
    /* ───────── helpers ───────── */
    const asEntries = (obj: Record<string, string> | undefined) =>
        Object.entries(obj ?? {});                            // -> [ [key,value], ... ]

    const toRecord = (entries: [string, string][]) =>
        Object.fromEntries(entries) as Record<string, string>;

    const isValidIdx = (arr: unknown[], i: number) =>
        Number.isInteger(i) && i >= 0 && i < arr.length;

    const updateAssertAt = (
        index: number,
        { newKey, newValue }: { newKey?: string; newValue?: any }
    ) => {
        setBruContent(prev => {
            const entries = asEntries(prev?.assert);
            if (!isValidIdx(entries, index)) return prev;

            const [oldKey, oldVal] = entries[index];
            entries[index] = [
                newKey ?? oldKey,
                newValue ?? oldVal,
            ];

            return { ...prev, assert: toRecord(entries) };
        });
    };


    const removeAssertAt = (index: number) => {
        setBruContent(prev => {
            const entries = asEntries(prev?.assert);
            if (!isValidIdx(entries, index)) return prev;

            entries.splice(index, 1);
            return { ...prev, assert: toRecord(entries) };
        });
    };

    const addEmptyAssert = (index?: number) => {
        setBruContent(prev => {
            const entries = Object.entries(prev?.assert ?? {});      // ← mantiene orden
            const newEntry: [string, string] = ["", ""];            // ← slot vacío

            const pos =
                index !== undefined && index >= 0 && index <= entries.length
                    ? index
                    : entries.length;                                   // fuera de rango → push

            entries.splice(pos, 0, newEntry);                       // inserta

            return { ...prev, assert: Object.fromEntries(entries) };
        });
    };

    const moveAssert = (from: number, to: number) => {
        setBruContent(prev => {
            const entries = asEntries(prev?.assert);
            if (!isValidIdx(entries, from) || !isValidIdx(entries, to)) return prev;

            const [item] = entries.splice(from, 1);
            entries.splice(to, 0, item);

            return { ...prev, assert: toRecord(entries) };
        });
    };

    return (
        <section className="w-full h-full">
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
                                            updateAssertAt(i, { newKey: "name", newValue: ev.target.value })
                                        }}></input>
                                </td>
                                <td>
                                    <div className="flex flex-row justify-between w-full overflow-x-auto">
                                        <ReactCodeMirror value={e.value} theme="none" basicSetup={false} editable className="CM-Table w-available"
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