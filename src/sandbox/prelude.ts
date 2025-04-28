/* eslint-disable no-var */

/**
 * Bruno runtime prelude — se inyecta como banner en cada bundle
 * y expone bru.*, cola de eventos y proxy de consola.
 */
(function () {
    type Pending = Record<string, (v: unknown) => void>;
    const __queue__: any[] = [];
    const pending: Pending = {};

    function __emit__(type: string, payload: unknown) {
        if (typeof (globalThis as any).__bruOutbound === "function") {
            (globalThis as any).__bruOutbound({ type, payload });
        } else {
            __queue__.push({ type, payload });
        }
    }

    /* ---------- API pública ---------- */
    class bru {
        static version = "0.2.0";

        static Request = class {
            constructor(public url: string, public opts?: RequestInit) { }
            setBody(body: unknown) {
                __emit__("req.body", body);
            }
        };

        static Response = class {
            constructor(public status: number, public body: unknown) { }
        };

        static send(type: string, payload?: unknown) {
            __emit__(type, payload);
        }

        /** Petición al host que devuelve Promise */
        static get(type: string, payload?: unknown) {
            return new Promise((resolve) => {
                const id = Math.random().toString(36).slice(2);
                pending[id] = resolve;
                __emit__("get", { id, type, payload });
            });
        }
    }

    /* Resolver promesas desde fuera */
    (globalThis as any).__bruReply = (id: string, data: unknown) => {
        pending[id]?.(data);
        delete pending[id];
    };

    /* Proxy de consola ⇒ evento */
    (["log", "warn", "error", "info"] as const).forEach((lvl) => {
        const native = console[lvl];
        console[lvl] = (...v: any[]) => {
            __emit__("console", { level: lvl, values: v });
            native.apply(console, v);
        };
    });

    (globalThis as any).bru = bru;
    (globalThis as any).__bruQueued = __queue__;
})();
