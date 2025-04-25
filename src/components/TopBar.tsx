import React, { useCallback, useEffect, useState } from "react";
import { useBruContent } from "src/webview/context/BruProvider";

export default function () {
    const { bruContent } = useBruContent();
    const httpMethods = ["get", "post", "put", "delete", "patch", "options", "head"];



    return (
        <div className="bg-[var(--vscode-input-background)] h-[30px] text-[15px] font-bold flex m-0 rounded-[10px]">
            <div className="self-center select-none px-4">
                <select name="method" style={{ outline: 0 }} value={bruContent?.http?.method}>
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
                value={bruContent?.http?.url}
            />
        </div>
    );
}
