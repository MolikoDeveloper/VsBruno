export function unwrapDefault(mod: any): any {
    if (
        mod &&
        typeof mod === "object" &&
        "default" in mod &&
        Object.keys(mod).filter(k => k !== "__esModule").length === 1
    ) {
        return mod.default;
    }
    return mod;
}
