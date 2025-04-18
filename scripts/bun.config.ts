
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

const config: Bun.BuildConfig = {
    entrypoints: [
        "src/extension.ts",
        "src/webview/App.tsx",
        "src/tailwind.css"
    ],
    format: "cjs",
    external: ["vscode"],
    loader: {
        ".ts": "ts",
        ".js": "js",
        ".css": "css",
        ".tsx": "tsx",
        ".json": "json"
    },
    "minify": true,
    "banner": banner,
    outdir: "./dist",
    define: {
        "process.env.NODE_ENV": "\"production\""
    },
    drop: ["console"],
    "target": "node"
}

Bun.build(config).then(d => {
    d.outputs.forEach(e => {
        //console.table([e.path, humanFileSize(e.size)])
    })
    const t = d.outputs.map(e => ({
        path: e.path,
        size: humanFileSize(e.size)
    }))
    console.table(t)
    console.log(`\n${d.success ? "ok" : "error"}`)
})

function humanFileSize(bytes: number, decimals = 1) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    // Avanza en la lista de unidades mientras sea mayor o igual a 1024
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    // Formatear con decimales
    return `${size.toFixed(decimals)}${units[unitIndex]}`;
}


/*
    dist\webview\App.cjs   1.6mb
    dist\tailwind.css     29.4kb
    dist\extension.cjs    12.1kb
    dist\tailwind.cjs      175b
*/