export function unwrapDefault(m: any) {
    if (m && typeof m === "object" && "default" in m) {
        const keys = Object.keys(m);
        return keys.length === 1              // --► solo si *solo* tiene default
            ? m.default
            : m;                           // --► mantiene los demás exports
    }
    return m;
}