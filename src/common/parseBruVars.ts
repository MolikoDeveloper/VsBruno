import type { BruFile, BruVars } from "src/types/bruno/bruno";

// 1) Utilidad para generar rutas “dot-notation” de propiedades de BruFile
type NestedPaths<T> = T extends object
    ? { [K in Extract<keyof T, string>]:
        // Si es array, sólo tomamos la clave del array, no sus índices
        T[K] extends any[]
        ? K
        : // si es otro objeto, recurse
        T[K] extends object
        ? K | `${K}.${NestedPaths<T[K]>}`
        : K
    }[Extract<keyof T, string>]
    : never;

// Path será algo como "meta" | "meta.name" | "http" | "http.method" | "http.url" | ...
type Path = NestedPaths<BruFile>;

// 2) Definimos las opciones
interface Options {
    exclude?: Path[];
    only?: Path[];
}

// 3) La función
export function parseBruVars(
    bruFile: BruFile | null,
    vars: BruVars[] | null | undefined,
    options: Options = {}
): BruFile {
    if (!bruFile) return {}
    if (!vars) return {}
    const { exclude = [], only = [] } = options;

    // 3a) Armar mapa de variables (local tienen prioridad)
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

    // 3b) Reemplazo en strings
    const PLACEHOLDER = /\{\{([^{}]+)\}\}/g;
    function replaceInString(s: string): string {
        return s.replace(PLACEHOLDER, (_, name) => {
            const entry = varMap.get(name);
            if (!entry) {
                throw new Error(`Variable "${name}" no encontrada`);
            }
            if (!entry.enabled) {
                throw new Error(`Variable "${name}" está deshabilitada`);
            }
            return entry.value;
        });
    }

    // 3c) Clonado sin reemplazos (para subárboles excluidos)
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

    // 3d) Recorrido genérico con path tracking
    function walk<T>(node: T, path: string): T {
        const isRoot = path === "";

        // helpers para include/exclude
        const inOnly = only.some(
            E => E === path
                || E.startsWith(path + ".")
                || path.startsWith(E + ".")
        );
        const inExclude = exclude.some(
            E => E === path
                || path.startsWith(E + ".")
        );
        const descendable = isRoot
            || ((!only.length || inOnly) && !inExclude);

        // 1) Cadena: reemplazar sólo si descendable
        if (typeof node === "string") {
            return (descendable ? replaceInString(node) : node) as any;
        }

        // 2) Array: clonar y recorrer cada elemento
        if (Array.isArray(node)) {
            if (!descendable) {
                return cloneNoReplace(node);
            }
            return node.map((v, i) => walk(v, `${path}[${i}]`)) as any;
        }

        // 3) Objeto: clonar propiedades
        if (node && typeof node === "object") {
            if (!descendable) {
                return cloneNoReplace(node);
            }
            const out: any = {};
            for (const key of Object.keys(node as any)) {
                const childPath = isRoot ? key : `${path}.${key}`;
                out[key] = walk((node as any)[key], childPath);
            }
            return out;
        }

        // 4) Resto de primitivos
        return node;
    }

    // 4) Ejecutar sobre la raiz
    return walk(bruFile, "");
}
