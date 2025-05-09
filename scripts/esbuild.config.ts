import { type BuildOptions } from "esbuild";
import reactUMDPlugin from "./plugins/react/esbuild-react-umd";
import postCssPlugin from 'esbuild-style-plugin'
import { copyMonacoAssetsPlugin } from "./plugins/CopyMonaco";


const webviewEntryPoints = [
    "./src/webview/HydrateBruno.tsx",
    "./src/webview/HydrateCollection.tsx",
    "./src/webview/HydrateEnvironments.tsx",
    "./src/tailwind.css",
    "./src/common/highlight.min.cjs"
];

const prod = process.env.NODE_ENV === 'production';


export const react: BuildOptions = {
    entryPoints: webviewEntryPoints,
    bundle: true,
    logLevel: "info",
    platform: 'browser',
    format: 'iife',
    target: ["es2022"],
    external: [],
    sourcemap: !prod ? 'inline' : false,
    minify: !prod,
    outdir: 'dist',
    loader: {
        ".ttf": "file"
    },
    plugins: [
        reactUMDPlugin({ outdir: 'vendor/react', prod }),
        postCssPlugin({
            postcss: {
                plugins: [require('@tailwindcss/postcss')],
            },
        }),
        copyMonacoAssetsPlugin({
            src: "node_modules/monaco-editor/min/vs",
            dest: "dist/vendor/monaco-editor/vs"
        }),
    ],
    alias: {
        "style-mod": require.resolve("src/vendor/style-mod/src/style-mod.js"),
        "@lezer/common": require.resolve("src/vendor/@lezer/common/dist/index.js"),
        "@lezer/highlight": require.resolve("src/vendor/@lezer/highlight/dist/index.js"),
        "@codemirror/view": require.resolve("src/vendor/@codemirror/view/dist/index.js"),
    }
}

export const extension: BuildOptions = {
    entryPoints: ['src/extension.ts'],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node18',
    sourcemap: !prod ? 'inline' : false,
    minify: !prod,
    outfile: 'dist/extension.cjs',
    external: ['vscode', 'fsevents'],
}

export const prelude: BuildOptions = {
    entryPoints: ["src/sandbox/prelude.ts"],
    outdir: "dist/sandbox",
    bundle: true,
    platform: "browser",
    format: "iife",
    target: ["es2020"],
    sourcemap: !prod ? 'inline' : false,
    minify: !prod
};
