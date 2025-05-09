import esbuild from "esbuild";
import { buildExtension, buildWebview } from "./esbuild.main.js";
import worker from "./esbuild.worker.js";

try {
  const [ctxExt, ctxWeb, ctxWorker] = await Promise.all([
    esbuild.context(buildExtension),
    esbuild.context(buildWebview),
    esbuild.context(worker)
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
