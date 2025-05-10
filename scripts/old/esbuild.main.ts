import postCssPlugin from 'esbuild-style-plugin'
import type { BuildOptions } from "esbuild";
import { copyMonacoAssetsPlugin } from './plugins/copy';
import path from "path"

export const buildExtension: BuildOptions = {
  entryPoints: ['./src/extension.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  outfile: 'dist/extension.cjs',
  external: ['vscode', 'fsevents'],
};

const webviewEntryPoints = [
  "./src/webview/HydrateBruno.tsx",
  "./src/webview/HydrateCollection.tsx",
  "./src/webview/HydrateEnvironments.tsx",
  "./src/tailwind.css",
  "./src/common/highlight.min.cjs"
];


export const buildWebview: BuildOptions = {
  entryPoints: webviewEntryPoints,
  bundle: true,
  platform: "browser",
  target: ['chrome96', 'firefox112'],
  outdir: "./dist",
  outbase: "./src",
  format: "cjs",
  external: [
    "react",
    "react-dom",
    "react-dom/client"
  ],
  loader: {
    ".ts": "ts",
    ".js": "js",
    ".cjs": "js",
    ".tsx": "tsx",
    ".css": "css",
    ".ttf": "file"
  },
  define: {
    "process.env.NODE_ENV": '"DEBUG"'
  },
  plugins: [
    postCssPlugin({
      postcss: {
        plugins: [require('@tailwindcss/postcss')],
      }
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
    "rollup": require.resolve("src/vendor/rollup/dist/rollup.js"),
    "react": path.resolve("src/vendor/react/react-global-shim.ts"),
    "react-dom": path.resolve("src/vendor/react/react-dom-global-shim.ts"),
    "react-dom/client": path.resolve("src/vendor/react/react-dom-client-shim.ts"),
    //"react/jsx-runtime": path.resolve("src/vendor/react/react-jsx-runtime-shim.ts"),
    //"react/jsx-dev-runtime": path.resolve("src/vendor/react/react-jsx-runtime-shim.ts"),
  }
};


