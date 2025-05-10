import { type BuildOptions } from "esbuild";
import reactUMDPlugin from "./plugins/react/esbuild-react-umd";
import postCssPlugin from 'esbuild-style-plugin'
import { copyMonacoAssetsPlugin } from "./plugins/CopyMonaco";
import { dtsToGlobalPlugin } from "./plugins/d.ts-to-global";
import pkg from "../package.json"


const webviewEntryPoints = [
    "./src/webview/HydrateBruno.tsx",
    "./src/webview/HydrateCollection.tsx",
    "./src/webview/HydrateEnvironments.tsx",
    "./src/tailwind.css"
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
        })
    ]
}

export const extension: BuildOptions = {
    entryPoints: ['src/extension.ts'],
    bundle: true,
    logLevel: "info",
    platform: 'node',
    format: 'cjs',
    target: 'node18',
    sourcemap: false,
    minify: true,
    outfile: 'dist/extension.cjs',
    external: ['vscode', 'fsevents'],
}

export const prelude: BuildOptions = {
    entryPoints: ["src/sandbox/prelude.js"/*, "src/sandbox/prelude.d.ts"*/],
    outdir: "dist/sandbox",
    logLevel: "info",
    bundle: false,
    platform: "browser",
    globalName: "",
    format: "iife",
    target: [],
    sourcemap: !prod ? 'inline' : false,
    minify: !prod,
    plugins: [
        dtsToGlobalPlugin({
            replace: [
                {
                    name: "__VERSION__",
                    value: pkg.version
                }
            ],
            rawText: ["prelude.js"]
        })
    ]
};
