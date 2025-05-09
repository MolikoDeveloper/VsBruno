import type { BuildOptions } from "esbuild";

const workerConfig: BuildOptions = {
    entryPoints: ["./src/sandbox/prelude.ts"],
    outdir: "dist/sandbox",
    bundle: true,
    platform: "browser",
    format: "iife",
    target: "es2020",
    minify: true,
    sourcemap: "inline"
};

export default workerConfig;
