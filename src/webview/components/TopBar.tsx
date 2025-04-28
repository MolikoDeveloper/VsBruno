import { useCallback } from "react";
import type { HttpMethod } from "src/bruno/bruno";
import { vscode } from "src/common/vscodeapi";
import { useBruContent } from "src/webview/context/BruProvider";

export default function () {
    const { bruContent, setBruContent } = useBruContent();
    const httpMethods = ["get", "post", "put", "delete", "patch", "options", "head", "connect", "trace"];

    const runRequestScript = useCallback(() => {
        if (!bruContent?.script?.req) return;
        vscode.postMessage({
            type: "run-script",
            data: {
                code: bruContent.script.req,
                args: null
            }
        })
    }, [bruContent])

    return (
        <div className="bg-[var(--vscode-input-background)] h-[30px] text-[15px] font-bold flex m-0 rounded-[10px]">
            <div className="self-center select-none px-4">
                <select style={{ outline: 0 }} value={bruContent?.http?.method} defaultValue="get"
                    onChange={e => {
                        const val = e.currentTarget.value as HttpMethod;
                        setBruContent(prev => ({
                            ...prev,
                            http: {
                                ...prev?.http!,
                                method: val
                            }
                        }))
                    }}>
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
                onChange={(e) => {
                    const val = e.currentTarget.value as string;
                    setBruContent(prev => ({
                        ...prev,
                        http: {
                            ...prev?.http!,
                            url: val
                        }
                    }))
                }}
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-full m-0 mr-2 icon icon-tabler icon-tabler-arrow-right cursor-pointer"
                width="24" height="24" viewBox="0 0 24 24" strokeWidth="1.5" stroke="rgb(204, 204, 204)"
                fill="none" strokeLinecap="round" strokeLinejoin="round"
                onClick={() => runRequestScript()}>
                <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <line x1="13" y1="18" x2="19" y2="12"></line>
                <line x1="13" y1="6" x2="19" y2="12"></line>
            </svg>
        </div>
    );
}
