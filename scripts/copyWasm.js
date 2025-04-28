// scripts/copyWasm.js — versión robusta
import { copyFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";

export default function copyWasm() {
    return {
        name: "copy-esbuild-wasm",
        setup(build) {
            build.onEnd(() => {
                // 1. localizar la carpeta raíz del paquete
                const pkgDir = dirname(require.resolve("esbuild-wasm/package.json"));

                // 2. posibles rutas según la versión del paquete
                const candidates = [
                    "esbuild.wasm",        // <0.18
                    "lib/esbuild.wasm",    // 0.18 – 0.20
                    "dist/esbuild.wasm",   // 0.21+
                ].map((p) => join(pkgDir, p));

                const src = candidates.find(existsSync);
                if (!src) {
                    console.error("❌ copyWasm: esbuild.wasm no encontrado en", candidates);
                    process.exit(1);
                }

                mkdirSync("./dist", { recursive: true });
                copyFileSync(src, "./dist/esbuild.wasm");
                console.log("✅ esbuild.wasm copiado → dist/esbuild.wasm");
            });
        },
    };
}
