// JsonSchemaViewer.tsx
import React, { type JSX } from "react";
import { vscode } from "src/common/vscodeapi";

export interface JsonSchemaViewerProps { data: unknown; }

type Path = (string | number)[];
type Collapsed = Set<string>;


export const JsonSchemaViewer: React.FC<JsonSchemaViewerProps> = ({ data }) => {
    const initialCollapsed = new Set<string>(vscode.getState()?.collapsedSchemas ?? []);
    const [collapsed, setCollapsed] = React.useState(initialCollapsed);

    const toggle = (p: Path) => {
        const key = p.join(".");
        setCollapsed(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);

            // Guardar en vscode
            vscode.setState({
                ...vscode.getState(),
                collapsedSchemas: Array.from(next),
            });

            return next;
        });
    };

    const rows: JSX.Element[] = [];
    buildRows({ value: data, depth: 0, path: ["root"], last: true }, collapsed, toggle, rows);

    return (
        <div className="font-mono text-xs leading-5">
            <div className="grid grid-cols-[48px_1fr] w-ful bg-[--vscode-editor-background]">
                {rows.map((row, i) => (
                    <React.Fragment key={i}>
                        <div className="select-none pr-3 text-right text-gray-500 bg-[var(--vscode-badge-background)]">{i + 1}</div>
                        {row}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

/*──────────────────────── helpers ────────────────────────*/

interface NodeJob {
    value: unknown;
    depth: number;
    path: Path;
    /** ¿Es el último miembro del objeto/array padre? */
    last: boolean;
}

const INDENT = 16;

function buildRows(
    { value, depth, path, last }: NodeJob,
    collapsed: Collapsed,
    toggle: (p: Path) => void,
    out: JSX.Element[]
) {
    const pad = { paddingLeft: depth * INDENT };
    const keyStr = (k: string | number) => (
        <span className="text-amber-600">"{String(k)}"</span>
    );

    const comma = last ? "" : ",";

    const isObj = typeof value === "object" && value !== null && !Array.isArray(value);
    const isArr = Array.isArray(value);

    /* Objetos y arrays */
    if (isObj || isArr) {
        const collapsedHere = collapsed.has(path.join("."));
        const opener = isArr ? "[" : "{";
        const closer = isArr ? "]" : "}";

        /* Línea apertura */
        out.push(
            <div style={pad}>
                <span onClick={() => toggle(path)} className="cursor-pointer select-none">
                    {collapsedHere ? "▶" : "▼"}
                </span>{" "}
                {depth > 0 && path.at(-1) !== undefined && (
                    <>
                        {keyStr(path.at(-1)!)}:{" "}
                    </>
                )}
                {opener}
                {!collapsedHere && opener === "{" && Object.keys(value as object).length === 0 && closer}
                {!collapsedHere && opener === "[" && (value as unknown[]).length === 0 && closer}
                {collapsedHere && " … " + closer}
                {collapsedHere && comma}
            </div>
        );

        if (!collapsedHere) {
            /* Hijos */
            const entries = isArr
                ? (value as unknown[]).map<[string | number, unknown]>((v, i) => [i, v])
                : Object.entries(value as Record<string, unknown>);

            entries.forEach(([k, v], idx) =>
                buildRows(
                    { value: v, depth: depth + 1, path: [...path, k], last: idx === entries.length - 1 },
                    collapsed,
                    toggle,
                    out
                )
            );

            /* Línea cierre */
            if (entries.length) {
                out.push(
                    <div style={pad}>
                        {closer}
                        {comma}
                    </div>
                );
            }
        }
        return;
    }

    /* Primitivos */
    const renderVal = () => {
        switch (typeof value) {
            case "string":
                return <span className="text-green-600">"{value}"</span>;
            case "number":
                return <span className="text-blue-400">{value}</span>;
            case "boolean":
                return <span className="text-purple-600">{String(value)}</span>;
            case "object": // null
            default:
                return <span className="text-gray-400">null</span>;
        }
    };

    out.push(
        <div style={pad}>
            {depth > 0 && path.at(-1) !== undefined && (
                <>
                    {keyStr(path.at(-1)!)}:{" "}
                </>
            )}
            {renderVal()}
            {comma}
        </div>
    );
}
