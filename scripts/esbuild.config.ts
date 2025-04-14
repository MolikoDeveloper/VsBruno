import type { BuildOptions } from "esbuild";

const config: BuildOptions = {
  entryPoints: [
    "./src/extension.ts",
    "./src/webview/App.tsx"
  ],
  bundle: true,
  platform: "node",
  target: "node12",
  outdir: "./dist",
  outbase: "./src",
  outExtension: {
    ".js": ".cjs",
  },
  format: "cjs",
  external: ["vscode", "lodash"],
  loader: {
    ".ts": "ts",
    ".js": "js",
    ".tsx": "tsx"
  },
  logLevel: "info",
  sourcemap: "linked",
  define: {
    // Reemplaza process.env.NODE_ENV por "production" (o "development")
    "process.env.NODE_ENV": "\"production\""
  },
};

export default config;
