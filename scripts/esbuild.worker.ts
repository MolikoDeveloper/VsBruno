import type { BuildOptions } from "esbuild";
import copyWasm from "./copyWasm.js";

const workerConfig: BuildOptions = {
    entryPoints: ["./src/sandbox/prelude.ts"],
    outdir: "dist/sandbox",
    bundle: true,
    platform: "browser",
    format: "esm",
    target: "es2020",
    external: ["esbuild-wasm"],            // se cargará via importScripts
    plugins: [copyWasm()],                 // copia esbuild.wasm y prelude
    sourcemap: "inline"
};

export default workerConfig;
