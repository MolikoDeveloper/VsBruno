import { type BuildOptions } from "esbuild";
import reactUMDPlugin from "./plugins/react/esbuild-react-umd";
import postCssPlugin from 'esbuild-style-plugin'
import { CopyFiles } from "./plugins/CopyMonaco";
import { dtsToGlobalPlugin } from "./plugins/d.ts-to-global";
import pkg from "../package.json"

const webviewEntryPoints = [
    "./src/webview/HydrateBruno.tsx",
    "./src/webview/HydrateCollection.tsx",
    "./src/webview/HydrateEnvironments.tsx",
    "./src/tailwind.css"
];

const MonacoEntry = [
    'vs/base/browser/ui/codicons/codicon/codicon.ttf',
    'vs/base/worker/workerMain.js',
    'vs/basic-languages/markdown/markdown.js',
    'vs/basic-languages/typescript/typescript.js',
    'vs/basic-languages/xml/xml.js',
    'vs/basic-languages/sparql/sparql.js',
    'vs/editor/editor.main.css',
    'vs/editor/editor.main.js',
    'vs/language/json/jsonMode.js',
    'vs/language/json/jsonWorker.js',
    'vs/language/typescript/tsMode.js',
    'vs/language/typescript/tsWorker.js',
    'vs/loader.js',
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
        CopyFiles({
            src: MonacoEntry,
            dest: "dist/vendor/monaco-editor",
            name: "monaco-editor/vs",
            preserveStructure: true,
            root: "node_modules/monaco-editor/min/",
            clear: true
        }),
        CopyFiles({
            src: ["node_modules/@types/react/index.d.ts", "node_modules/@types/react/jsx-runtime.d.ts"],
            dest: "dist/vendor/react/types",
            name: "react-types",
            clear: true
        })
    ],
    drop: prod ? ["console", "debugger"] : []
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
    define: {
        "process.env.NODE_ENV": `"${process.env.NODE_ENV}"`
    },
    drop: prod ? ["console", "debugger"] : []
}

export const prelude: BuildOptions = {
    entryPoints: ["src/sandbox/prelude.js", "src/sandbox/prelude.d.ts"],
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