import type { BuildOptions } from "esbuild";
import copyWasm from "./copyWasm.js";

const workerConfig: BuildOptions = {
    entryPoints: ["./src/sandbox/BrunoSandboxWorker.ts"],
    bundle: true,
    platform: "browser",
    format: "esm",
    target: "es2020",
    outfile: "./dist/worker.js",
    external: ["esbuild-wasm"],            // se cargará via importScripts
    plugins: [copyWasm()],                 // copia esbuild.wasm y prelude
    sourcemap: "inline"
};

export default workerConfig;
