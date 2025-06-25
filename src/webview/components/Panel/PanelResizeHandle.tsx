import React, { useRef } from "react";
import { usePanelGroup } from "./PanelGroup";

interface PanelResizeHandleProps {
  index: number;
}

export const PanelResizeHandle: React.FC<PanelResizeHandleProps> = ({
  index,
}) => {
  const { direction, onResize } = usePanelGroup();
  const isHorizontal = direction === "horizontal";
  const ref = useRef<HTMLDivElement>(null);
  const lastPosRef = useRef<number | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    lastPosRef.current = isHorizontal ? e.clientX : e.clientY;

    const onMouseMove = (event: MouseEvent) => {
      const currentPos = isHorizontal ? event.clientX : event.clientY;
      const lastPos = lastPosRef.current!;
      const deltaPx = currentPos - lastPos;
      const parent = ref.current?.parentElement;
      if (!parent) return;

      const parentSize = isHorizontal
        ? parent.offsetWidth
        : parent.offsetHeight;
      const deltaPercent = (deltaPx / parentSize) * 100;

      const applied = onResize(index, deltaPercent);
      // Calcula los píxeles aplicados (puede ser 0) y siempre actualiza el lastPos
      const appliedPx = (applied / 100) * parentSize;
      lastPosRef.current = lastPos + appliedPx;

      // Alternativamente, si prefieres resetear siempre al ratón:
      // lastPosRef.current = currentPos;
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);

      lastPosRef.current = null;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div
      ref={ref}
      onMouseDown={handleMouseDown}
      className={`relative z-10 bg-[var(--vscode-editorWidget-border)] hover:bg-[var(--vscode-sash-hoverBorder)] transition-all
                  ${
                    isHorizontal
                      ? "px-[1px] hover:px-[1.5px] cursor-ew-resize"
                      : "py-[1px] hover:py-[1.5px] cursor-row-resize"
                  }`}
    />
  );
};
