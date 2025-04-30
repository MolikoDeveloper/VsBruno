import esbuild from "esbuild";
import main from "./esbuild.main.js";
import worker from "./esbuild.worker.js";

try {
  const [ctxMain/*, ctxWorker*/] = await Promise.all([
    esbuild.context(main),
    //esbuild.context(worker)
  ]);

  await Promise.all([
    ctxMain.watch(),
    // ctxWorker.watch()
  ]);
  console.log("👀 Watching main + worker…");
} catch {
  process.exit(1);
}
