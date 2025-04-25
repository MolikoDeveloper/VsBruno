import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { xml } from '@codemirror/lang-xml';
import { useBruContent } from 'src/webview/context/BruProvider';
import { useEffect, useState } from 'react';
import type { BruBody } from 'src/bruno/bruno';

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
    const { bruContent, setBruContent } = useBruContent();
    const [httpbody, setHttpbody] = useState<string>("none");
    const [contentType, setContentType] = useState<string>("");
    let upgrade = bruContent;

    useEffect(() => {
        setHttpbody(bruContent?.http?.body || "none")
    }, [bruContent])

    return (
        <section className='w-full h-full'>
            <div className="flex flex-grow justify-start items-center">
                <div className="inline-flex items-center cursor-pointer">
                    <div className="text-amber-300 flex items-center justify-center py-1 select-none selected-body-mode" aria-expanded="false">
                        <select className="bg-transparent text-amber-400 py-1 [&>*]:bg-[var(--vscode-input-background)]"
                            value={bruContent?.http?.body} style={{ outline: 0 }}
                            defaultValue="none"
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
            <div className="w-full overflow-auto">
                {
                    {
                        "json": <CodeMirror value={bruContent?.body?.json} extensions={[json()]} theme={'dark'} lang='json' height='80vh' onChange={(val, viewUpdate) => { setBruContent(prev => ({ ...prev, body: { ...prev?.body!, json: val.trim() } })) }} />,
                        "text": <CodeMirror value={bruContent?.body?.text} extensions={[]} theme={'dark'} lang='plainText' height='80vh' onChange={(val, viewUpdate) => { setBruContent(prev => ({ ...prev, body: { ...prev?.body!, text: val.trim() } })) }} />,
                        "xml": <CodeMirror value={bruContent?.body?.xml} extensions={[xml()]} theme={'dark'} lang='xml' height='80vh' onChange={(val, viewUpdate) => { setBruContent(prev => ({ ...prev, body: { ...prev?.body!, xml: val.trim() } })) }} />,
                        "sparql": <></>,
                        "graphql": <></>,
                        "graphqlVars": <></>,
                        "formUrlEncoded": <></>,
                        "multipartForm": <></>,
                        "file": <></>,
                    }[httpbody]
                }
            </div>
        </section>
    )
}