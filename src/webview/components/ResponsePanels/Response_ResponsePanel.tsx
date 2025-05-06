import { useBruContent } from "src/webview/context/BruProvider";
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { useLayoutEffect, useRef, useState } from "react";


export default function () {
    const { bruResponse } = useBruContent()
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [height, setHeight] = useState<string>('0px');

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
                <CodeMirror className="CM-Table overflow-auto" value={JSON.stringify(bruResponse?.body, null, 2)}
                    extensions={[json()]}
                    theme="dark"
                    lang="json"
                    height={height}
                    editable={false}
                />
            </div>
        </div>
    )
}