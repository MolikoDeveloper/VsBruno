import { useBruContent } from "src/webview/context/BruProvider";
import { useLayoutEffect, useRef, useState } from "react";
import Editor from '@monaco-editor/react'
import { useEditorConfig } from "src/webview/context/EditorProvider";

export default function () {
    const { bruResponse } = useBruContent()
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [height, setHeight] = useState<string>('0px');
    const { themeKind } = useEditorConfig();

    useLayoutEffect(() => {
        const update = () => {
            if (containerRef.current) {
                setHeight(`${containerRef.current.clientHeight - 15}px`);
            }
        };

        update(); // primera medición

        // Observa cambios de tamaño del contenedor
        const ro = new ResizeObserver(update);
        if (containerRef.current) ro.observe(containerRef.current);

        return () => ro.disconnect();
    }, []);



    return (
        <div className="w-full mt-2 h-full flex flex-col pb-2">
            <div className="flex-1 w-full h-full" ref={containerRef}>
                <Editor
                    theme={themeKind === 2 ? "vs-dark" : themeKind === 1 ? 'light' : 'hc-black'}
                    value={JSON.stringify(bruResponse?.body, null, 2)}
                    language="json"
                    height={height}
                    options={{ readOnly: true, minimap: { enabled: false } }}
                />
            </div>
        </div>
    )
}