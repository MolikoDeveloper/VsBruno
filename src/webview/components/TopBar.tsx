import { useCallback, useEffect, useState } from "react";
import { vscode } from "src/common/vscodeapi";
import { useBruContent } from "src/webview/context/BruProvider";
import { useTimelineContext } from "../context/TimeLineProvider";
import type { TimelineEvent_t } from "src/types/shared";
import { parseBruVars } from "src/common/parseBruVars";
import type { BruFile, HttpMethod } from "src/types/bruno/bruno";

type Mime = {
    key: string
    mime: string
}

const mimes: Mime[] = [
    {
        mime: "multipart/form-data",
        key: "multipartForm"
    }, {
        mime: "application/x-www-form-urlencoded",
        key: "form-url-encoded"
    }, {
        mime: "application/json",
        key: "json"

    }, {
        mime: "application/ld+json",
        key: "ldjson"
    }, {
        mime: "application/xml",
        key: "xml"
    }, {
        mime: "text/plain",
        key: "text"
    }, {
        mime: "application/sparql",
        key: "sparql"

    }, {
        mime: "none",
        key: "none"
    }
]

export default function () {
    const { bruContent, setBruContent, bruResponse } = useBruContent();
    const { setEvents } = useTimelineContext();
    const httpMethods = ["get", "post", "put", "delete", "patch", "options", "head", "connect", "trace"];
    const requestExclude = ["script", "assertions", "tests", "http"];

    // VM
    const runRequestScript = useCallback(
        (bruno: BruFile | null): Promise<BruFile | null> => {
            return new Promise((resolve) => {
                if (!bruno?.script?.req) resolve(null);

                const listener = (event: MessageEvent) => {
                    if (event.data.type === "script-result") {
                        window.removeEventListener("message", listener);

                        if (event.data.data.isPre) {
                            const headers = event.data?.data?.exports?.req?.headers;
                            const body = event.data?.data?.exports?.req?.body
                            const next = { ...bru }

                            if (headers)
                                next.headers = headers;

                            if (body)
                                next.body = { ...next.body, json: JSON.stringify(body) }

                            resolve(next);
                        }
                        else {
                            resolve(null)
                        }
                    }
                };

                window.addEventListener("message", listener);

                const bru = parseBruVars(bruno, bruno?.vars?.req, {
                    exclude: requestExclude,
                    only: [],
                });

                vscode.postMessage({
                    type: "run-script",
                    data: {
                        code: bru.script?.req,
                        args: null,
                        bruContent: bru,
                        when: "#script-pre",
                    },
                });
            });
        }, []
    );


    // fetch
    const sendFetch = useCallback((bruno: BruFile | null) => {
        if (!bruno?.http?.url) return;
        const bru = parseBruVars(bruno, bruno?.vars?.req, { exclude: requestExclude, only: [] });

        vscode.postMessage({
            type: "fetch",
            data: {
                uri: bru.http?.url,
                init: {
                    method: bru?.http?.method.toUpperCase(),
                    body: bru?.http?.method !== "get"
                        ? bru?.http?.body && bru.body && bru.body[bru.http.body]
                        : undefined,
                    headers: bru.headers?.filter(h => h.enabled).map(({ name, value }) => [name, value])
                } as RequestInit
            }
        })
    }, [])

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
        const varPreParsed = parseBruVars(bruContent, bruContent?.vars?.req, { exclude: requestExclude, only: [] });
        const varPostParsed = parseBruVars(varPreParsed, bruContent?.vars?.res, { exclude: requestExclude, only: [] })
        if (!varPostParsed?.script?.res) return;
        if (!bruResponse) return;


        vscode.postMessage({
            type: "run-script",
            data: {
                code: varPostParsed.script.res,
                args: {
                    bruResponse
                },
                bruContent: varPostParsed,
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
            {/*<SearchLineEditor value="aaa" onChange={() => { }} ></SearchLineEditor>*/}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-full m-0 mr-2 icon icon-tabler icon-tabler-arrow-right cursor-pointer"
                width="24" height="24" viewBox="0 0 24 24" strokeWidth="1.5" stroke="rgb(204, 204, 204)"
                fill="none" strokeLinecap="round" strokeLinejoin="round"
                onClick={() => {
                    runRequestScript(bruContent).then(res => {
                        sendFetch(res);
                    })
                }}>
                <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <line x1="13" y1="18" x2="19" y2="12"></line>
                <line x1="13" y1="6" x2="19" y2="12"></line>
            </svg>
        </div>
    );
}
