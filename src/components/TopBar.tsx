import React, { useCallback, useEffect, useState } from "react";

interface Props {
    value?: { mehtod: string; uri?: string };
    onChange?: ({ mehtod, uri }: { mehtod: string; uri?: string }) => void;
}

export default function MethodUriPicker({ value = { mehtod: "GET", uri: "" }, onChange, }: Props) {
    const httpMethods = ["get", "post", "put", "delete", "patch", "options", "head"];
    const [method, setMethod] = useState<string>(value.mehtod);
    const [uri, setUri] = useState<string>(value.uri ?? "");

    useEffect(() => {
        setMethod(value.mehtod);
        setUri(value.uri ?? "");
    }, [value.mehtod, value.uri]);

    const handleMethodChange = useCallback(
        (newMethod: string) => {
            setMethod(newMethod);
            onChange?.({ mehtod: newMethod, uri });
        },
        [onChange, uri],
    );

    const handleUriChange = useCallback(
        (newUri: string) => {
            setUri(newUri);
            onChange?.({ mehtod: method, uri: newUri });
        },
        [onChange, method],
    );

    return (
        <div className="bg-[var(--vscode-input-background)] h-[30px] text-[15px] font-bold flex m-0 rounded-[10px]">
            <div className="self-center select-none px-4">
                <select name="method" style={{ outline: 0 }}
                    value={method.toLowerCase()}
                    onChange={(e) => handleMethodChange(e.currentTarget.value)}
                >
                    {httpMethods.map((m, index) => (
                        <option key={m + index} className="bg-[var(--vscode-input-background)] px-2" value={m}>
                            {m.toUpperCase()}
                        </option>
                    ))}
                </select>
            </div>

            <input
                type="text"
                style={{ outline: "0px" }}
                placeholder="http://www.example.com/api/version"
                className="w-full h-full m-0 p-2 placeholder:font-thin font-normal"
                value={uri}
                onChange={(e) => handleUriChange(e.currentTarget.value)}
            />
        </div>
    );
}
