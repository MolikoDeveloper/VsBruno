import { useRef, useState, useLayoutEffect } from "react";
import { useBruContent } from "src/webview/context/BruProvider";

export default function () {
    const { bruResponse } = useBruContent();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [height, setHeight] = useState<string>('0px');

    useLayoutEffect(() => {
        const update = () => {
            if (containerRef.current) {
                setHeight(`${containerRef.current.clientHeight - 35}px`);
            }
        };

        update(); // primera medición

        // Observa cambios de tamaño del contenedor
        const ro = new ResizeObserver(update);
        if (containerRef.current) ro.observe(containerRef.current);

        return () => ro.disconnect();
    }, []);

    return (
        <div className="mt-2 flex flex-col flex-1 h-full w-full min-h-0" ref={containerRef}>
            {/* Este div se encargará de hacer scroll internamente */}
            <div className={`w-full overflow-y-auto`} style={{ maxHeight: height }}>
                <table className="select-text br-table table-fixed w-full">
                    <thead>
                        <tr>
                            <td className="w-1/3 text-left">Name</td>
                            <td className="text-left">Value</td>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(bruResponse?.headers || {}).map(
                            ([name, value], index) => (
                                <tr key={index}>
                                    <td className="break-all">{name}</td>
                                    <td className="break-all">{value}</td>
                                </tr>
                            )
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
