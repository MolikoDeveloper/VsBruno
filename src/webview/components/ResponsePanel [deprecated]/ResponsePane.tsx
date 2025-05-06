
import React, { useRef, useState, useEffect, type MouseEvent, type RefObject } from 'react';

interface SplitPanelProps {
    /** Ancho inicial del panel izquierdo, en pixeles. */
    initialLeftWidth?: number;
    /** Mínimo ancho del panel izquierdo, en pixeles. */
    minLeftWidth?: number;
    /** Máximo ancho del panel izquierdo, en pixeles. */
    maxLeftWidth?: number;
}

const SplitPanel: React.FC<SplitPanelProps> = ({
    initialLeftWidth = 300,
    minLeftWidth = 200,
    maxLeftWidth = 600,
}) => {
    const [leftWidth, setLeftWidth] = useState<number>(initialLeftWidth);
    const containerRef: RefObject<HTMLDivElement | null> = useRef(null);
    const isResizing = useRef<boolean>(false);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent<Document>) => {
            if (!isResizing.current || !containerRef.current) return;

            // Obtenemos el rect del contenedor para calcular la posición relativa del mouse
            const containerRect = containerRef.current.getBoundingClientRect();
            const newWidth = e.clientX - containerRect.left;

            // Respetamos los límites min/max
            const adjustedWidth = Math.min(
                Math.max(newWidth, minLeftWidth),
                maxLeftWidth
            );

            setLeftWidth(adjustedWidth);
        };

        const handleMouseUp = () => {
            isResizing.current = false;
        };

        // Listeners globales
        document.addEventListener('mousemove', handleMouseMove as any);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove as any);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [minLeftWidth, maxLeftWidth]);

    const handleMouseDown = () => {
        isResizing.current = true;
    };

    return (
        <div ref={containerRef} className="flex h-screen select-none">
            {/* Panel izquierdo */}
            <div
                className="bg-blue-100"
                style={{ width: `${leftWidth}px` }}
            >
                <div className="p-4">
                    <h1 className="text-xl font-bold">Panel Izquierdo</h1>
                    <p>Aquí va tu contenido.</p>
                </div>
            </div>

            {/* Divisor arrastrable */}
            <div
                className="w-1 bg-gray-300 cursor-col-resize"
                onMouseDown={handleMouseDown}
            />

            {/* Panel derecho */}
            <div className="flex-1 bg-green-100">
                <div className="p-4">
                    <h1 className="text-xl font-bold">Panel Derecho</h1>
                    <p>Contenido del panel derecho.</p>
                </div>
            </div>
        </div>
    );
};

export default SplitPanel;
