import { copyFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
export default () => ({
    name: "copy-esbuild-wasm",
    setup(build) {
        build.onEnd(() => {
            const base = dirname(require.resolve("esbuild-wasm/package.json"));
            const variants = ["esbuild.wasm", "lib/esbuild.wasm", "dist/esbuild.wasm"];
            const src = variants.map((p) => join(base, p)).find(existsSync);
            if (!src) throw new Error("esbuild.wasm not found");
            mkdirSync("dist", { recursive: true });
            copyFileSync(src, "dist/esbuild.wasm");
        });
    },
});
