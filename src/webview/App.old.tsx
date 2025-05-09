import * as React from "react";
import { createRoot } from "react-dom/client";
import { Tag } from "../components/tag";
import { type BruBlock } from "../bruno/bruno";
import { Params, type Entry } from "../components/Params";
import Markdown2 from "markdown-to-jsx";
import { SyntaxHighlightedCode } from "../components/mdOverrides/SyntaxHighlightedCode";
import type { SerializedResponse } from "../types/shared";
import { vscode } from "../common/vscodeapi";
import { BruProvider } from "./context/BruProvider";

const LEFT_TABS = ["params", "body", "header", "auth", "vars", "scripts", "assert", "test", "docs"];
const RIGHT_TABS = ["response", "headers", "timeline", "tests"];

function App() {

    //#region refs & saved UI state
    const saved = vscode.getState();
    const containerRef = React.useRef<HTMLDivElement>(null);
    const isResizing = React.useRef(false);
    //#endregion

    //#region Panel + Tab state
    const [rightWidth, setRightWidth] = React.useState(saved?.panelSize?.rightWidth ?? 600);
    const [L_activeTab, setLTab] = React.useState(saved?.activetab?.active_L_Tab ?? "L_tab_params");
    const [R_activeTab, setRTab] = React.useState(saved?.activetab?.active_R_Tab ?? "R_tab_response");
    //#endregion 

    //#region request/response state
    const [resp, setResp] = React.useState<SerializedResponse | null>(null);
    const [BruContent, setBruContent] = React.useState<BruBlock[]>([]);

    /* Method / URL / params  kept in sync */
    const [bru_method, set_bru_method] = React.useState("GET");
    const [bru_method_uri, set_bru_method_uri] = React.useState("");
    const [bru_method_body, set_bru_method_body] = React.useState("");
    const [bru_method_auth, set_bru_method_auth] = React.useState("");
    const [bru_params, set_bru_params] = React.useState<Entry[]>([])
    //#endregion

    //#region Helpers
    /** Build uri = basePath + ?query based on params marked as active. */
    const buildUri = React.useCallback((base: string, params: Entry[]): string => {
        const [path] = base.split("?");
        const qs = params.filter((p) => p.active && p.method.trim() !== "").map(p => `${encodeURIComponent(p.method)}=${encodeURIComponent(p.value)}`).join('&')

        return qs ? `${path}?${qs}` : path
    }, [])

    /** Parse ?query part of a url into Entry[] (all active=true). */
    const parseUri = React.useCallback((uri: string): Entry[] => {
        const i = uri.indexOf("?");
        if (i === -1) return [];
        const qs = uri.slice(i + 1);
        if (!qs) return [];
        return qs.split("&").filter(Boolean).map((pair) => {
            const [k, v = ""] = pair.split("=");
            return {
                method: decodeURIComponent(k),
                value: decodeURIComponent(v),
                active: true,
            } satisfies Entry;
        });
    }, []);

    /** Merge new entries with previous ones keeping the `active` flag when possible. */
    const mergeEntries = React.useCallback(
        (prev: Entry[], incoming: Entry[]): Entry[] => {
            return incoming.map((inc) => {
                const found = prev.find((p) => p.method === inc.method);
                return found ? { ...inc, active: found.active } : inc;
            });
        },
        [],
    );
    //#endregion

    //#region Two-way sync handlers
    const handleParamsChange = React.useCallback(
        (items: Entry[]) => {
            set_bru_params(items);
            set_bru_method_uri((prev) => {
                const next = buildUri(prev || bru_method_uri, items);
                return next === prev ? prev : next;
            });
        },
        [buildUri, bru_method_uri],
    );

    const handleUriChange = React.useCallback(
        (newVal: string) => {
            set_bru_method_uri(newVal);
            set_bru_params((prev) => mergeEntries(prev, parseUri(newVal)));
        },
        [mergeEntries, parseUri],
    );

    //#endregion

    //#region load .bru file content
    React.useEffect(() => {
        const listener = (event: MessageEvent) => {
            const message = event.data;
            if (message.type === "update" || message.type === "open") {
                setBruContent(message.data);
            } else if (message.type === "fetch") {
                setResp(message.data as SerializedResponse);
            }
        };
        window.addEventListener("message", listener);

        vscode.postMessage({ type: "loaded" });
        return () => window.removeEventListener("message", listener);
    }, []);

    /** parse BruContent -> populate method, uri, params, etc.. */
    React.useEffect(() => {
        const httpMethods = ["post", "get", "put", "delete", "patch", "options", "head",];

        /* params:query → state */
        const qParams = bruContent?.findLast((b) => b.blockName === "params:query");
        if (qParams?.data) {
            const transformed: Entry[] = Object.keys(qParams.data).map((key) => ({
                method: key.replace(/^~/, ""),
                value: qParams.data[key],
                active: !key.startsWith("~"),
            }));
            set_bru_params(transformed);
        }

        /* method block → uri + others */
        for (const m of httpMethods) {
            const blk = bruContent?.findLast((b) => b.blockName === m);
            if (blk) {
                set_bru_method(blk.blockName.toUpperCase());
                set_bru_method_uri(blk.data.url || "");
                set_bru_method_body(
                    blk.data.body && blk.data.body !== "none" ? blk.data.body : "",
                );
                set_bru_method_auth(blk.data.auth || "");
                break;
            }
        }
    }, [BruContent]);

    /* Keep URI in sync whenever bru_params changes programmatically */
    React.useEffect(() => {
        set_bru_method_uri((prev) => buildUri(prev, bru_params));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bru_params]);
    //#endregion

    //#region sizing/resizing logic
    React.useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (!isResizing.current || !containerRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();
            const offset = e.clientX - containerRect.left;
            const newRight = containerRect.width - offset;
            const clamped = Math.max(300, Math.min(newRight, containerRect.width - 300));
            setRightWidth(clamped);
        };

        const onMouseUp = () => {
            isResizing.current = false;
            document.body.style.userSelect = "";
            document.body.style.cursor = "";
            vscode.setState({
                ...vscode.getState(),
                panelSize: { rightWidth }
            });
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };
    }, [rightWidth]);
    //#endregion

    //#region tabs helpers
    const handleTabClick = (tab: string, side: "L" | "R") => {
        if (side === "L") setLTab(tab);
        if (side === "R") setRTab(tab);
        vscode.setState({
            ...vscode.getState(),
            activetab: {
                active_L_Tab: side === "L" ? tab : L_activeTab,
                active_R_Tab: side === "R" ? tab : R_activeTab
            }
        });
    };
    //#endregion

    //#region left / right panel rendering
    const renderLeftPanel = () => {
        const docs = bruContent?.find((d) => d.blockName === "docs")?.data._raw;
        return (
            <>
                <div className="flex flex-wrap gap-1 select-none">
                    {LEFT_TABS.map((id, key) => (
                        <Tag
                            key={key}
                            title={id[0].toUpperCase() + id.slice(1)}
                            id={`L_tab_${id}`}
                            active={L_activeTab === `L_tab_${id}`}
                            onClick={() => handleTabClick(`L_tab_${id}`, "L")}
                        />
                    ))}
                </div>
                <div className="relative">
                    {L_activeTab === "L_tab_params" && (
                        <div>
                            <p className="text-[#dac100]">Query</p>
                            <Params value={bru_params} onChange={handleParamsChange} />
                        </div>
                    )}
                    {L_activeTab === "L_tab_docs" && (
                        <div>
                            <p className="text-yellow-400 text-[14px] cursor-pointer mt-2">edit</p>
                            <Markdown2
                                className="revert-tailwind markdown"
                                options={{ overrides: { code: SyntaxHighlightedCode } }}
                            >
                                {docs}
                            </Markdown2>
                        </div>
                    )}
                </div>
            </>
        );
    };

    const renderRightPanel = () => (
        <>
            <div className="flex flex-wrap gap-1 select-none">
                {RIGHT_TABS.map((id) => (
                    <Tag
                        key={id}
                        title={id[0].toUpperCase() + id.slice(1)}
                        id={`R_tab_${id}`}
                        active={R_activeTab === `R_tab_${id}`}
                        onClick={() => handleTabClick(`R_tab_${id}`, "R")}
                    />
                ))}
            </div>
            <div className="relative h-full pt-4 pb-[70px]">
                {R_activeTab === "R_tab_response" && resp && (
                    <Markdown2
                        className="markdown h-full overflow-auto border border-[var(--vscode-pickerGroup-border)]"
                        options={{ overrides: { code: SyntaxHighlightedCode } }}
                    >
                        {"```jsons\n" + JSON.stringify(resp.body, null, 1) + "\n```"}
                    </Markdown2>
                )}
            </div>
        </>
    );
    //#endregion

    return (
        <div className="m-0 p-0 relative h-screen px-4">
            <div className="bg-[var(--vscode-input-background)] h-[30px] text-[15px] font-bold flex m-0">
                <div className="self-center select-none px-4">{bru_method}</div>
                <input
                    onChange={(e) => handleUriChange(e.currentTarget.value)}
                    value={bru_method_uri}
                    type="text"
                    style={{ outline: "0px" }}
                    placeholder="http://www.example.com/api/version"
                    className="w-full h-full m-0 p-2 placeholder:font-thin font-normal"
                />
            </div>
            <div ref={containerRef} className="flex h-full w-full relative">
                <div className="flex-1 overflow-hidden">{renderLeftPanel()}</div>

                <div
                    className="w-1 bg-[var(--vscode-editorGroup-border)] mx-4 cursor-col-resize"
                    onMouseDown={() => {
                        isResizing.current = true;
                        document.body.style.userSelect = "none";
                        document.body.style.cursor = "col-resize";
                    }}
                />

                <div
                    className="overflow-hidden transition-none"
                    style={{ width: `${rightWidth}px` }}
                >
                    {renderRightPanel()}
                </div>
            </div>
        </div>
    );
}

const container = document.getElementById("root");
if (container) {
    createRoot(container).render(
        <BruProvider>
            <App />
        </BruProvider>
    );
}
