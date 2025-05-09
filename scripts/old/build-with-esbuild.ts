import esbuild from "esbuild";
import { buildExtension, buildWebview } from "./esbuild.main.js";
import worker from "./esbuild.worker.js";
import { buildGlobalReact } from './build-global-react.js';


await Promise.all([
    esbuild.build(buildExtension),
    esbuild.build(buildWebview),
    esbuild.build(worker),
]).catch((err) => {
    console.log(err)

    process.exit(1)
})

await buildGlobalReact();