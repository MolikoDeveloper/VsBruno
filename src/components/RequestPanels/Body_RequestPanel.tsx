import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { useBruContent } from 'src/webview/context/BruProvider';
import { useEffect, useState } from 'react';

export default function ({ contentType }: { contentType: string }) {
    const { bruContent } = useBruContent();
    const [httpbody, setHttpbody] = useState<string>("none");

    useEffect(() => {
        setHttpbody(bruContent.http?.body || "none")
    }, [bruContent])


    return (
        <div className="w-full overflow-auto">
            {
                {
                    "json": <CodeMirror value={bruContent.body?.json} extensions={[json()]} theme={'dark'} lang='json' height='80vh' onChange={(value, viewUpdate) => { console.log('value', value) }} />,
                    "text": <></>,
                    "xml": <></>,
                    "sparql": <></>,
                    "graphql": <></>,
                    "graphqlVars": <></>,
                    "formUrlEncoded": <></>,
                    "multipartForm": <></>,
                    "file": <></>,
                }[httpbody]
            }
        </div>
    )
}