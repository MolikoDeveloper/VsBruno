import CodeMirror from '@uiw/react-codemirror';
import Editor from '@monaco-editor/react'
import { useBruContent } from 'src/webview/context/BruProvider';
import { xmlLanguage } from '@codemirror/lang-xml';
import { LanguageSupport } from '@codemirror/language';
import type { BruBody } from 'src/types/bruno/bruno';
import { useLayoutEffect, useRef, useState } from 'react';
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
                active: false
            },
            {
                mime: "application/ld+json",
                key: "ldjson",
                name: "Json-LD (ex)",
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
    const xmlBare = new LanguageSupport(xmlLanguage);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [height, setHeight] = useState<string>('0px');
    const { themeKind } = useEditorConfig()


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
                                        <option key={"cto" + iv} className={`text-[var(--vscode-tab-activeForeground)] ${!mv.active && "text-red-400"}`} value={mv.key || "none"}>{mv.name}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>
                </div>
                <button className="ml-1 cursor-pointer">Prettify</button>
            </div>
            <div className="w-full h-full" ref={containerRef}>
                {
                    {
                        "json": <Editor
                            theme={themeKind === 2 ? "vs-dark" : themeKind === 1 ? 'light' : 'hc-black'}
                            language='json' height={height} options={{ minimap: { 'enabled': false } }}
                            value={bruContent?.body?.json}
                            onChange={(value, ev) => {
                                setBruContent(prev => ({ ...prev, body: { ...prev?.body, json: value?.trim() } }))
                            }} />,
                        "text": <Editor
                            theme={themeKind === 2 ? "vs-dark" : themeKind === 1 ? 'light' : 'hc-black'}
                            language="auto" height={height} options={{ minimap: { 'enabled': false } }}
                            value={bruContent?.body?.text}
                            onChange={(value, ev) => {
                                setBruContent(prev => ({ ...prev, body: { ...prev?.body, text: value?.trim() } }))
                            }} />,
                        "xml": <CodeMirror value={bruContent?.body?.xml} extensions={[xmlBare]} theme={"dark"} lang='xml' height={height} onChange={(val, viewUpdate) => { setBruContent(prev => ({ ...prev, body: { ...prev?.body!, xml: val.trim() } })) }} />,
                        "sparql": <></>,
                        "graphql": <></>,
                        "graphqlVars": <></>,
                        "formUrlEncoded": <></>,
                        "multipartForm": <></>,
                        "file": <></>,
                        "none": <></>
                    }[bruContent?.http?.body as string]
                }
            </div>
        </div>
    )
}
/*<CodeMirror basicSetup={{
                            "allowMultipleSelections": true,
                            "autocompletion": true,
                            "tabSize": 2
                        }}
                            editable
                            contentEditable="true"
                            value={bruContent?.body?.json} extensions={[json()]}
                            theme={vsTheme} lang='json' height={height}
                            onChange={(val, viewUpdate) => { setBruContent(prev => ({ ...prev, body: { ...prev?.body!, json: val.trim() } })) }} />,*/