import * as vsce from "vscode";
import * as vm from "vm";
import * as path from "path";
import type { RunOptions, Sandbox, LogEntry } from "./types";

export class BrunoSandboxNode implements Sandbox {
    private cache = new Map<string, any>();
    private logs: LogEntry[] = [];

    async run({ collectionRoot, code, entryRel, args }: RunOptions) {
        const entryAbs = path.join(collectionRoot.fsPath, entryRel);
        this.logs = [];
        const exports = await this.loadModule(collectionRoot, entryAbs, code, args);
        return { exports, logs: this.logs };
    }

    /** Carga un módulo (o lo devuelve de caché) */
    private async loadModule(
        collectionRoot: vsce.Uri,
        absPath: string,
        code: string,
        args: any
    ) {
        if (this.cache.has(absPath)) return this.cache.get(absPath);

        // Helper require()
        const localRequire = async (rel: string) => {
            if (!rel.startsWith(".")) throw new Error("Solo rutas relativas");
            const nextAbs = path.resolve(path.dirname(absPath), rel.endsWith(".js") ? rel : `${rel}.js`);
            this.ensureInsideCollection(collectionRoot, nextAbs);
            const nextCode = vsce.workspace.fs.readFile(vsce.Uri.file(nextAbs))
                .then(b => Buffer.from(b).toString("utf8"));
            return this.loadModule(collectionRoot, nextAbs, await nextCode, args);
        };

        // Context aislado
        const module = { exports: {} };
        const context = vm.createContext({
            console: this.makeConsole(),
            module,
            exports: module.exports,
            require: localRequire,
            args,
        });
        new vm.Script(code, { filename: absPath }).runInContext(context);

        this.cache.set(absPath, module.exports);
        return module.exports;
    }

    private makeConsole() {
        const push = async (kind: LogEntry["kind"], ...vals: any[]) => {
            this.logs.push({ kind, values: vals });
            // texto legible para el Output Channel
            const util = await import("util");
            //scriptChannel.appendLine(`[${kind}] ` + vals.map(v => util.inspect(v, { depth: 2, colors: false })).join(" "));
        };
        return {
            log: (...v: any[]) => push("log", ...v),
            warn: (...v: any[]) => push("warn", ...v),
            error: (...v: any[]) => push("error", ...v),
            info: (...v: any[]) => push("info", ...v),
        };
    }

    private ensureInsideCollection(root: vsce.Uri, abs: string) {
        if (!abs.startsWith(root.fsPath + path.sep))
            throw new Error(`Acceso denegado a ${abs} (fuera de collection.bru)`);
    }
}
