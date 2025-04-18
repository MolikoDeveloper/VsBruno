import * as React from "react";
import { createRoot } from "react-dom/client";
import { Tag } from "../components/tag";
import { type BruBlock } from "../bruno/bruno";
import { Params } from "../components/Params";
import Markdown2 from "markdown-to-jsx";
import { SyntaxHighlightedCode } from "../components/mdOverrides/SyntaxHighlightedCode";
import type { SerializedResponse } from "../@types/shared";
import { vscode } from "../common/vscodeapi";

const LEFT_TABS = [
    "params",
    "body",
    "header",
    "auth",
    "vars",
    "scripts",
    "assert",
    "test",
    "docs"
];

const RIGHT_TABS = ["response", "headers", "timeline", "tests"];

function App() {
    const saved = vscode.getState();
    const containerRef = React.useRef<HTMLDivElement>(null);
    const isResizing = React.useRef(false);

    const [rightWidth, setRightWidth] = React.useState(
        saved?.panelSize?.rightWidth ?? 600
    );
    const [BruContent, setBruContent] = React.useState<BruBlock[]>([]);
    const [L_activeTab, setLTab] = React.useState(
        saved?.activetab?.active_L_Tab ?? "L_tab_params"
    );
    const [R_activeTab, setRTab] = React.useState(
        saved?.activetab?.active_R_Tab ?? "R_tab_response"
    );
    const [resp, setResp] = React.useState<SerializedResponse | null>(null);

    React.useEffect(() => {
        vscode.postMessage({
            type: "fetch",
            data: { uri: "https://pokeapi.co/api/v2/pokemon/ditto" }
        });

        window.addEventListener("message", (event) => {
            const message = event.data;
            if (message.type === "update" || message.type === "open") {
                setBruContent(message.data);
            } else if (message.type === "fetch") {
                setResp(message.data as SerializedResponse);
            }
        });

        vscode.postMessage({ type: "loaded" });
    }, []);

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

    const renderLeftPanel = () => {
        const docs = BruContent.find((d) => d.blockName === "docs")?.data._raw;
        return (
            <>
                <div className="flex flex-wrap gap-1 select-none">
                    {LEFT_TABS.map((id) => (
                        <Tag
                            key={id}
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
                            <Params value={[{ method: "device", value: "x13", active: true }]} />
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

    return (
        <div className="m-0 p-0 relative h-screen px-4">
            <div className="bg-[var(--vscode-input-background)] h-[30px] text-[15px] font-bold flex m-0">
                <div className="self-center select-none px-4">GET</div>
                <input
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
    createRoot(container).render(<App />);
}
