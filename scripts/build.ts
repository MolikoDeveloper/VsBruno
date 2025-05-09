import esbuild from "esbuild"
import { react, extension, prelude } from "./esbuild.config"

await Promise.all([
    esbuild.build(extension),
    esbuild.build(react),
    esbuild.build(prelude)
]).catch((err) => {
    console.error(err)
    process.exit(1)
})