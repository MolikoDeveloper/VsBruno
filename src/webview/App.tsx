import * as React from "react";
import { createRoot } from "react-dom/client";
import { Tag } from "../components/tag";
import { type BruBlock } from "../bruno/bruno";
import { Params } from "../components/Params";
import Markdown2 from "markdown-to-jsx"
import { SyntaxHighlightedCode } from "../components/mdOverrides/SyntaxHighlightedCode";

const tabs = [
    { id: "L_tab_params", title: "Params" },
    { id: "L_tab_body", title: "Body" },
    { id: "L_tab_header", title: "Header" },
    { id: "L_tab_auth", title: "Auth" },
    { id: "L_tab_vars", title: "Vars" },
    { id: "L_tab_scripts", title: "Script" },
    { id: "L_tab_assert", title: "Assert" },
    { id: "L_tab_test", title: "Tests" },
    { id: "L_tab_docs", title: "Docs" },
    { id: "R_tab_Response", title: "Response" },
    { id: "R_tab_Headers", title: "Headers" },
    { id: "R_tab_Timeline", title: "Timeline" },
    { id: "R_tab_Tests", title: "Tests" },
];

function App() {
    const [documentText, setDocumentText] = React.useState<BruBlock[]>([]);
    const [activeItem, setActive] = React.useState<string>("L_tab_params");

    // Listen for messages from extension
    React.useEffect(() => {
        const vsCode = acquireVsCodeApi();
        window.addEventListener("message", (event) => {
            const message: { type: "open" | "update" | "baseUri", data: BruBlock[] } = event.data;

            if (message.type === "update" || message.type === 'open') {
                message.data.forEach(d => {
                    if (d.blockName === "docs")
                        setDocumentText(d.data._raw)
                })
            }
            if (message.type === "baseUri") {
                console.log(`bru:`, message)
                const baseUrl = message.data;

            }
        });
        // request the initial doc text from extension
        vsCode.postMessage({ type: "loaded" });
    }, []);

    // Parse the .bru text here or show a custom interface
    // ...
    // If user modifies something, send back to extension:
    const sendEdit = () => {
        // global
        const vsCode = acquireVsCodeApi();
        vsCode.postMessage({ type: "edit", text: documentText });
    };

    const activeTag = React.useCallback(({ event, props }: { event: React.MouseEvent<HTMLDivElement, MouseEvent>; props: { active: boolean }; }) => {
        setActive(event.currentTarget.id);
    }, [])

    return (
        <div className="">
            <div className="bg-[var(--vscode-input-background)] text-[15px] font-bold flex">
                <div className="self-center h-full select-none">
                    GET
                </div>
                <input type="text" style={{ outline: "0px" }} className="w-full h-full m-0 p-2" />
            </div>
            <div className="flex flex-auto">
                <div className="w-full">
                    <div className="flex flex-wrap gap-1 select-none">
                        {
                            tabs.map((data, key) => (
                                data.id.startsWith("L_tab") ?
                                    <>
                                        <Tag key={key} title={data.title} id={data.id} active={activeItem === data.id} onClick={activeTag}></Tag>
                                    </> : <></>)
                            )
                        }
                    </div>
                    <div className="min-w-[320px] relative">
                        {
                            tabs.map((data, key) => {
                                if (!data.id.startsWith("L_tab")) return <></>;

                                const visible = data.id === activeItem ? "visible" : "hidden";

                                switch (data.id) {
                                    case "L_tab_params":
                                        return <div className="w-full absolute" style={{ visibility: visible }} key={key}>
                                            <p className="text-[#6b6b6b]">Query</p>
                                            <Params value={[{ method: "device", value: "x13", active: true }]}></Params>
                                        </div>
                                    case "L_tab_body":
                                        return <div className="absolute" key={key} style={{ visibility: visible }}>
                                            body here.
                                        </div>
                                    case "L_tab_docs":
                                        return <div key={key} className="absolute" style={{ visibility: visible }}>
                                            <p className="text-yellow-400 text-[14px] cursor-pointer mt-2">edit</p>
                                            <Markdown2 className="markdown" options={{ overrides: { code: SyntaxHighlightedCode } }}>{`${documentText}`}</Markdown2>
                                        </div>
                                    default:
                                        return <></>
                                }
                            })
                        }
                    </div>
                </div>
                <div className="w-[px] border-x h-['available'] mx-4"></div>
                <div className="w-full">
                    <div className="flex flex-wrap gap-1 select-none">
                        {
                            tabs.map((data, key) => (
                                data.id.startsWith("R_tab") ?
                                    <>
                                        <Tag key={key} title={data.title} id={data.id} active={activeItem === data.id} onClick={activeTag}></Tag>
                                    </> : <></>)
                            )
                        }
                    </div>
                    <Markdown2 className="markdown" options={{ overrides: { code: SyntaxHighlightedCode, } }}>{`${documentText}`}</Markdown2>
                </div>
            </div>
        </div >
    );
}

const container = document.getElementById("root");
if (container) {
    createRoot(container).render(<App />);
}

