import type { BruFile, BruVars } from "src/types/bruno/bruno";

type NestedPaths<T> = T extends object
    ? { [K in Extract<keyof T, string>]:
        T[K] extends any[]
        ? K
        :
        T[K] extends object
        ? K | `${K}.${NestedPaths<T[K]>}`
        : K
    }[Extract<keyof T, string>]
    : never;

type Path = NestedPaths<BruFile>;

interface Options {
    exclude?: Path[];
    only?: Path[];
}

export function parseBruVars(
    bruFile: BruFile | null,
    vars: BruVars[] | null | undefined,
    options: Options = {}
): BruFile {
    if (!bruFile || typeof bruFile !== 'object') return {};
    if (!vars) return bruFile;

    const { exclude = [], only = [] } = options;

    const nonLocal = new Map<string, BruVars>();
    const localOnly = new Map<string, BruVars>();
    for (const v of vars) {
        if (v.local) {
            localOnly.set(v.name, v);
        } else if (!localOnly.has(v.name)) {
            nonLocal.set(v.name, v);
        }
    }
    const varMap = new Map<string, BruVars>([...nonLocal, ...localOnly]);

    const PLACEHOLDER = /\{\{([^{}]+)\}\}/g;
    function replaceInString(s: string): string {
        return s.replace(PLACEHOLDER, (_, name) => {
            const entry = varMap.get(name);
            if (!entry) {
                return 'null'
            }
            if (!entry.enabled) {
                return 'null'
            }
            return entry.value;
        });
    }

    function cloneNoReplace<T>(node: T): T {
        if (Array.isArray(node)) {
            return node.map(cloneNoReplace) as any;
        }
        if (node && typeof node === 'object') {
            const out: any = {};
            for (const k in node) {
                out[k] = cloneNoReplace((node as any)[k]);
            }
            return out;
        }
        return node;
    }

    function walk<T>(node: T, path: string): T {
        const isRoot = path === "";

        const inOnly = only.some(
            E => E === path || E.startsWith(path + ".") || path.startsWith(E + ".")
        );
        const inExclude = exclude.some(
            E => E === path || path.startsWith(E + ".")
        );

        const descendable = isRoot || ((!only.length || inOnly) && !inExclude);

        // Validar nulos sin eliminar nodos hermanos
        if (node === null || node === undefined) return node;

        if (typeof node === "string") {
            return (descendable ? replaceInString(node) : node) as any;
        }

        if (Array.isArray(node)) {
            if (!descendable) return cloneNoReplace(node);
            return node.map((v, i) => walk(v, `${path}[${i}]`)) as any;
        }

        if (typeof node === "object") {
            if (!descendable) return cloneNoReplace(node);
            const out: any = {};
            for (const key of Object.keys(node)) {
                const childPath = isRoot ? key : `${path}.${key}`;
                out[key] = walk((node as any)[key], childPath);
            }
            return out;
        }

        return node;
    }

    return walk(bruFile, "");
}

