/* eslint-disable no-var */
/**
 * Bruno runtime prelude – se inyecta automáticamente en cada sandbox.
 * No exporta nada: sólo modifica globalThis.
 */
(function () {
    const __queue__: any[] = [];

    function __emit__(type: string, payload: unknown) {
        if (typeof (globalThis as any).__bruOutbound === "function") {
            (globalThis as any).__bruOutbound({ type, payload });
        } else {
            __queue__.push({ type, payload });
        }
    }

    class bru {
        static version = "0.1.1";

        /* Helpers básicos */
        static Request = class {
            constructor(public url: string, public opts?: RequestInit) { }
            setBody(body: unknown) {
                __emit__("req.body", body);
            }
        };

        static Response = class {
            constructor(public status: number, public body: unknown) { }
        };

        static main() {
            console.log("hello bruno!");
            return "done";
        }

        /* Bus de eventos genérico */
        static send(type: string, payload?: unknown) {
            __emit__(type, payload);
        }
    }

    (globalThis as any).bru = bru;
    (globalThis as any).__bruQueued = __queue__;
})();
