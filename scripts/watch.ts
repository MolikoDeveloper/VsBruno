import esbuild from "esbuild";
import { react, extension, prelude } from "./esbuild.config"

try {
    const [ctxExt, ctxWeb, ctxWorker] = await Promise.all([
        esbuild.context(extension),
        esbuild.context(react),
        esbuild.context(prelude)
    ]);

    await Promise.all([
        ctxExt.watch(),
        ctxWeb.watch(),
        ctxWorker.watch()
    ]);
    console.log("👀 Watching main + worker…");
} catch {
    process.exit(1);
}
