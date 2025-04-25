import React, {
    Children, cloneElement, createContext, isValidElement,
    useContext, useEffect, useRef, useState,
} from "react";
import { PanelResizeHandle } from "./PanelResizeHandle";
import { Panel } from "./Panel";

interface PanelGroupContextValue {
    direction: "horizontal" | "vertical";
    onResize: (index: number, delta: number) => number;
}
const PanelGroupContext = createContext<PanelGroupContextValue | null>(null);
export const usePanelGroup = () => useContext(PanelGroupContext)!;

interface PanelGroupProps {
    direction: "horizontal" | "vertical";
    children: React.ReactNode;
    className?: string
}

export const PanelGroup: React.FC<PanelGroupProps> = ({ direction, children, className }) => {
    const isHorizontal = direction === "horizontal";

    const panelElems = Children.toArray(children).filter(
        (c) => isValidElement(c) && (c.type as any).displayName === "Panel"
    );
    const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [sizes, setSizes] = useState<number[]>(
        Array(panelElems.length).fill(100 / panelElems.length)
    );

    /** Devuelve proposedPx limitado por min/max y sin romper “ancho fijo”. */
    const clampByCssConstraints = (el: HTMLElement, proposedPx: number) => {
        const cs = getComputedStyle(el);
        const min = parseFloat(cs[isHorizontal ? "minWidth" : "minHeight"]) || 0;
        const max = parseFloat(cs[isHorizontal ? "maxWidth" : "maxHeight"]) || Infinity;

        // 1️⃣ Ancho/alto fijo vía **inline style**
        const inlineSize = isHorizontal ? el.style.width : el.style.height;
        if (inlineSize && inlineSize !== "auto") return parseFloat(inlineSize);

        // 2️⃣ CSS con width fijo (min == max ≠ 0)
        const compSize = parseFloat(cs[isHorizontal ? "width" : "height"]) || 0;
        const cssFixed = min === max && min !== 0;
        if (cssFixed) return compSize;

        return Math.max(min, Math.min(proposedPx, max));
    };

    const handleResize = (index: number, deltaPercent: number): number => {
        const a = panelRefs.current[index];
        const b = panelRefs.current[index + 1];
        const container = a?.parentElement;
        if (!a || !b || !container) return 0;

        const axis = isHorizontal ? "Width" : "Height";
        const containerPx = isHorizontal ? container.offsetWidth : container.offsetHeight;

        const aPx = isHorizontal ? a.getBoundingClientRect().width
            : a.getBoundingClientRect().height;
        const bPx = isHorizontal ? b.getBoundingClientRect().width
            : b.getBoundingClientRect().height;

        let deltaPx = (deltaPercent / 100) * containerPx;

        // límites reales (min-width / min-height) de cada panel
        const minAPx = parseFloat(getComputedStyle(a)[`min${axis}`]) || 0;
        const minBPx = parseFloat(getComputedStyle(b)[`min${axis}`]) || 0;

        deltaPx = Math.max(-(aPx - minAPx), Math.min(deltaPx, bPx - minBPx));
        if (deltaPx === 0) return 0;

        const realDelta = (deltaPx / containerPx) * 100;

        // aplica los nuevos tamaños
        setSizes(prev => {
            const next = [...prev];
            next[index] += realDelta;
            next[index + 1] -= realDelta;
            return next;
        });

        return realDelta;
    };

    const refCallback = (i: number) => (el: HTMLDivElement | null) => {
        panelRefs.current[i] = el;
    };

    const elements: React.ReactNode[] = [];
    let i = 0;
    Children.forEach(children, (child) => {
        if (!isValidElement(child)) return;

        switch ((child.type as any).displayName) {
            case "Panel":
                elements.push(
                    cloneElement(child, {
                        key: `panel-${i}`,
                        //@ts-ignore
                        size: sizes[i],
                        direction,
                        ref: refCallback(i),
                    })
                );
                break;
            case "PanelGroup":
                elements.push(child);
                return;
            default:
                return;
        }


        if (i < sizes.length - 1) {
            elements.push(<PanelResizeHandle key={`resize-${i}`} index={i} />);
        }
        i++;
    });

    return (
        <PanelGroupContext.Provider value={{ direction, onResize: handleResize }}>
            <div className={className}>
                <div
                    className={`select-none m-0 p-0 flex w-full h-full ${isHorizontal ? "flex-row" : "flex-col"
                        }`}
                >
                    {elements}
                </div>
            </div>
        </PanelGroupContext.Provider>
    );
};

PanelGroup.displayName = "PanelGroup";
