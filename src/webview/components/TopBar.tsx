import { useCallback, useEffect, useState } from "react";
import { vscode } from "src/common/vscodeapi";
import { useBruContent } from "src/webview/context/BruProvider";
import { useTimelineContext } from "../context/TimeLineProvider";
import type { TimelineEvent_t } from "src/types/shared";
import type { HttpMethod } from "src/types/bruno/bruno";
import { parseBruVars } from "src/common/parseBruVars";

export default function () {
    const { bruContent, setBruContent, bruResponse, setBruResponse } = useBruContent();
    const { setEvents } = useTimelineContext()
    const httpMethods = ["get", "post", "put", "delete", "patch", "options", "head", "connect", "trace"];
    const requestExclude = ["script", "assertions", "tests"];

    const runRequestScript = useCallback(() => {
        if (!bruContent?.script?.req) return;
        const bru = parseBruVars(bruContent, bruContent?.vars?.req, { exclude: requestExclude, only: [] });

        console.log(bru)
        vscode.postMessage({
            type: "run-script",
            data: {
                code: bruContent.script.req,
                args: null,
                bruContent: bru,
                when: "#script-pre"
            }
        })
    }, [bruContent])

    const runRequest = useCallback(() => {
        if (!bruContent?.http?.url) return;
        const bru = parseBruVars(bruContent, bruContent?.vars?.req, { exclude: requestExclude, only: [] });

        vscode.postMessage({
            type: "fetch",
            data: {
                uri: bruContent.http?.url,
                init: {
                    "method": bruContent.http?.method.toUpperCase(),
                    "body": bruContent.http.method != "get" && bruContent?.http?.body && bru.body && bru.body[bruContent.http.body]
                } as RequestInit
            }
        })
    }, [bruContent])

    //feed the timeline
    useEffect(() => {
        if (!bruResponse) return;
        const current: TimelineEvent_t = {
            status: bruResponse?.status,
            method: bruContent?.http?.method.toUpperCase(),
            statusText: bruResponse?.statusText,
            url: bruResponse?.url,
            date: new Date(),
            ok: bruResponse.ok,
            time: bruResponse.time,
            size: bruResponse.size
        }
        setEvents(prev => [current, ...prev])
    }, [bruResponse])

    //try to run Post response script.
    useEffect(() => {
        if (!bruContent?.script?.res) return;
        if (!bruResponse) return;
        vscode.postMessage({
            type: "run-script",
            data: {
                code: bruContent.script.res,
                args: {
                    bruResponse
                },
                bruContent: parseBruVars(bruContent, bruContent?.vars?.res, { exclude: requestExclude, only: [] }),
                when: "#script-post"
            }
        })
    }, [bruResponse])


    return (
        <div className="bg-[var(--vscode-input-background)] h-[30px] text-[15px] font-bold flex m-0 rounded-[10px]">
            <div className="self-center select-none px-4">
                <select style={{ outline: 0 }} value={bruContent?.http?.method || "get"}
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
                value={bruContent?.http?.url || ""}
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
                onClick={() => {
                    runRequestScript()
                    runRequest()
                }}>
                <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <line x1="13" y1="18" x2="19" y2="12"></line>
                <line x1="13" y1="6" x2="19" y2="12"></line>
            </svg>
        </div>
    );
}
