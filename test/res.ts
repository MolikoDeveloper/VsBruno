import esbuild from "esbuild"

await esbuild.build({
    entryPoints: [require.resolve("react/jsx-runtime")],
    bundle: true,
    platform: 'browser',
    format: 'iife',
    globalName: 'ReactJSX',
    external: ['react'],
    outfile: "./build/test.js",
    minify: false,
    define: {
        "process.env.NODE_ENV": '""'
    }
});