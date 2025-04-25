import React, { forwardRef } from "react";

interface PanelProps {
    children: React.ReactNode;
    size?: number;
    direction?: "horizontal" | "vertical";
    className?: string;
}

export const Panel = forwardRef<HTMLDivElement, PanelProps>(
    ({ children, size, direction = "horizontal", className }, ref) => {
        const style: React.CSSProperties = {
            flexGrow: 0,
            flexShrink: 0,
            flexBasis: size !== undefined ? `${size}%` : undefined,
            height: direction === "vertical" ? undefined : "100%",
            width: direction === "horizontal" ? undefined : "100%",
        };

        return (
            <div ref={ref} style={style} className={`overflow-hidden ${className ?? ""}`}>
                {children}
            </div>
        );
    }
);

Panel.displayName = "Panel";
