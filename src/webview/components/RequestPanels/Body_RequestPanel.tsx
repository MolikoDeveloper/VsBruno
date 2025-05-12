import Editor from '@monaco-editor/react'
import { useBruContent } from 'src/webview/context/BruProvider';
import type { BruBody } from 'src/types/bruno/bruno';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useEditorConfig } from 'src/webview/context/EditorProvider';

type Mime = {
    name: string,
    values:
    {
        key: string
        mime: string
        name: string
        active: boolean;
    }[]
}

const mimes: Mime[] = [
    {
        name: "Form",
        values: [
            {
                mime: "multipart/form-data",
                key: "multipartForm",
                name: "Multipart Form",
                active: false
            },
            {
                mime: "application/x-www-form-urlencoded",
                key: "form-url-encoded",
                name: "formUrlEncoded",
                active: false
            }
        ]
    },
    {
        name: "Raw",
        values: [
            {
                mime: "application/json",
                key: "json",
                name: "JSON",
                active: true
            },
            {
                mime: "application/ld+json",
                key: "ldjson",
                name: "Json-LD",
                active: false
            },
            {
                mime: "application/xml",
                key: "xml",
                name: "XML",
                active: false
            },
            {
                mime: "text/plain",
                key: "text",
                name: "Plain Text",
                active: false
            },
            {
                mime: "application/sparql",
                key: "sparql",
                name: "SparQL",
                active: false
            }
        ]
    },
    {
        name: "Others",
        values: [
            {
                mime: "none",
                key: "none",
                name: "No Body",
                active: true
            }
        ]
    }
]

export default function () {
    //const monaco = useMonaco();

    const { bruContent, setBruContent } = useBruContent();
    //const xmlBare = new LanguageSupport(xmlLanguage);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [height, setHeight] = useState<string>('0px');
    const { themeKind } = useEditorConfig();
    const [bodyKey, setBodyKey] = useState<string>("none");
    const [bodyValue, setbodyValue] = useState("");

    //const { key: bodyKey, value: bodyValue } = getBodyContentKeyAndValue(bruContent);
    useEffect(() => {
        const { key, value } = getBodyContentKeyAndValue(bruContent);
        setBodyKey(key)
        setbodyValue(value);
    }, [bruContent])

    useLayoutEffect(() => {
        const update = () => {
            if (containerRef.current) {
                setHeight(`${containerRef.current.clientHeight - 50}px`);
            }
        };

        update(); // primera medición

        // Observa cambios de tamaño del contenedor
        const ro = new ResizeObserver(update);
        if (containerRef.current) ro.observe(containerRef.current);

        return () => ro.disconnect();
    }, []);

    return (
        <div className='w-full h-full'>
            <div className="flex flex-grow justify-start items-center">
                <div className="inline-flex items-center cursor-pointer">
                    <div className="text-amber-300 flex items-center justify-center py-1 select-none selected-body-mode" aria-expanded="false">
                        <select className="bg-transparent text-amber-400 py-1 [&>*]:bg-[var(--vscode-input-background)]"
                            value={bruContent?.http?.body || "none"} style={{ outline: 0 }}
                            onChange={(e) => {
                                const val = e.currentTarget.value as BruBody;
                                setBruContent(prev => ({
                                    ...prev,
                                    http: {
                                        ...prev?.http! as any,
                                        body: val
                                    }
                                }))
                            }}>
                            {mimes.map((m, i) => (
                                <optgroup key={'ctg' + i} label={m.name}>
                                    {m.values.map((mv, iv) => (
                                        <option key={"cto" + iv} className={`text-[var(--vscode-tab-activeForeground)] ${!mv.active && "text-red-400"}`} value={mv.key || "none"}>{mv.active ? mv.name : `${mv.name} (W.I.P)`}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>
                </div>
                <button className="ml-1 cursor-pointer">Prettify</button>
            </div>
            <div className="w-full h-full" ref={containerRef}>
                {["json", "text", "xml", "sparql", "ldjson"].includes(bruContent?.http?.body!) && (
                    <Editor
                        theme={themeKind === 2 ? "vs-dark" : themeKind === 1 ? 'light' : 'hc-black'}
                        language={bodyKey} height={height} options={{ minimap: { 'enabled': false } }}
                        value={bodyValue}
                        onChange={(value, ev) => {
                            if (!bodyKey) return;
                            setBruContent(prev => ({
                                ...prev!,
                                body: { ...prev?.body, [bodyKey]: value?.trim() || "" }
                            }));
                        }}
                        path=''
                    />
                )}
                {
                    {
                        "graphql": <>WIP</>,
                        "graphqlVars": <>WIP</>,
                        "form-url-encoded": <>WIP</>,
                        "multipartForm": <>WIP</>,
                        "file": <>WIP</>,
                        "none": <>WIP</>
                    }[bruContent?.http?.body as string || "none"]
                }
            </div>
        </div>
    )
}

function getBodyContentKeyAndValue(bruContent: any): { key: string, value: string } {
    const bodyType = bruContent?.http?.body;
    if (!bodyType || bodyType === "none") return { key: "", value: "" };

    const content = bruContent?.body?.[bodyType];
    return {
        key: bodyType || "",
        value: typeof content === "string" ? content : JSON.stringify(content, null, 2) || ""
    };
}
