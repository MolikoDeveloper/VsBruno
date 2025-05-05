import postCssPlugin from 'esbuild-style-plugin'
import type { BuildOptions } from "esbuild";

const banner = `
/*
MIT License

Copyright (c) 2025 MolikoDev

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
`

const config: BuildOptions = {
  entryPoints: [
    "./src/extension.ts",
    "./src/webview/HydrateBruno.tsx",
    "./src/webview/HydrateCollection.tsx",
    "./src/webview/HydrateEnvironments.tsx",
    "./src/tailwind.css",
    "./src/common/highlight.min.cjs"
  ],
  //minify: true,
  bundle: true,
  platform: "node", // "node" | "browser"
  target: "node18",
  outdir: "./dist",
  outbase: "./src",
  outExtension: {
    ".js": ".cjs",
    ".css": ".css"
  },
  "banner": {
    //js: banner
  },
  format: "cjs",
  external: ["vscode", "fsevents"],
  loader: {
    ".ts": "ts",
    ".js": "js",
    ".cjs": "js",
    ".tsx": "tsx",
    ".css": "css",
    ".ttf": "file"
  },
  logLevel: "info",
  minify: true,
  sourcemap: "linked",
  define: {
    "process.env.NODE_ENV": "\"production\""
  },
  plugins: [
    postCssPlugin({
      postcss: {
        plugins: [require('@tailwindcss/postcss')],
      }
    }),
  ],
  alias: {
    "style-mod": require.resolve("src/vendor/style-mod/src/style-mod.js"),
    "@lezer/common": require.resolve("src/vendor/@lezer/common/dist/index.js"),
    "@lezer/highlight": require.resolve("src/vendor/@lezer/highlight/dist/index.js"),
    "@codemirror/view": require.resolve("src/vendor/@codemirror/view/dist/index.js"),
    "rollup": require.resolve("src/vendor/rollup/dist/rollup.js")
  }
};

export default config;

