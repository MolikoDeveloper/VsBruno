import esbuild from "esbuild";
import main from "./esbuild.main.js";
import worker from "./esbuild.worker.js";

await Promise.all([
    esbuild.build(main),
    esbuild.build(worker)
]).catch((err) => {
    console.log(err)

    process.exit(1)
})
