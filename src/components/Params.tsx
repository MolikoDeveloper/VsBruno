import React, { useEffect, useState } from "react";

export type Entry = { method: string; value: string; active: boolean };

interface EditableListProps {
    value: Entry[];
    onChange?: (items: Entry[]) => void;
}

export const Params: React.FC<EditableListProps> = ({ value, onChange }) => {
    const [entries, setEntries] = useState<Entry[]>(value);

    useEffect(() => {
        setEntries(value);
    }, [value]);

    const updateEntry = (index: number, field: keyof Entry, val: string | boolean) => {
        const updated = [...entries];
        updated[index] = { ...updated[index], [field]: val };
        setEntries(updated);
        onChange?.(updated);
    };

    const addEntry = () => {
        const updated = [...entries, { method: "", value: "", active: true }];
        setEntries(updated);
        onChange?.(updated);
    };

    const removeEntry = (index: number) => {
        const updated = entries.filter((_, i) => i !== index);
        setEntries(updated);
        onChange?.(updated);
    };

    return (
        <div className="w-full">
            <table className="w-full table-fixed border border-collapse text-sm">
                <thead>
                    <tr className="text-left">
                        <th className="border px-2 py-1 w-[200px]">Name</th>
                        <th className="border px-2 py-1">Value</th>
                        <th className="border px-2 py-1 w-[70px]"></th>
                    </tr>
                </thead>
                <tbody>
                    {entries.map((entry, i) => (
                        <tr key={i} className="bg-[var(--vscode-input-background)] max-h-4">
                            <td className="border py-1">
                                <input
                                    type="text"
                                    value={entry.method}
                                    onChange={(e) => updateEntry(i, "method", e.target.value)}
                                    className="w-full outline-none bg-transparent appearance-none px-2"
                                    style={{ outline: "0px" }}
                                    placeholder="name"
                                />
                            </td>
                            <td className="border">
                                <input
                                    type="text"
                                    value={entry.value}
                                    onChange={(e) => updateEntry(i, "value", e.target.value)}
                                    className="!w-[100%] !h-[100%] bg-transparent px-2"
                                    style={{ outline: "0px" }}
                                    placeholder="value"
                                />
                            </td>
                            <td className="border py-1 text-center flex gap-3 justify-center">
                                <input
                                    type="checkbox"
                                    checked={entry.active}
                                    style={{ outline: "0px" }}
                                    onChange={(e) => updateEntry(i, "active", e.target.checked)}
                                />

                                <button
                                    className="text-red-500 font-bold text-[20px]"
                                    onClick={() => removeEntry(i)}
                                >
                                    ×
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <button
                onClick={addEntry}
                className="mt-2 text-[#358cd6] hover:text-[#799dbd] text-sm"
            >
                + Add Param
            </button>
        </div>
    );
};
