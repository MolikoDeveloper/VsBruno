// scripts/build-global-react.ts  (sólo ReactDOM y ReactDOMClient)
import esbuild from 'esbuild';
import path from 'path';

const shim = path.resolve('scripts', 'react-shim.ts');

async function buildDom(entry, global, out) {
    await esbuild.build({
        entryPoints: [entry],
        bundle: true,
        minify: false,
        format: 'iife',          // IIFE ⇒ global.*
        globalName: global,      // window.ReactDOM / ReactDOMClient
        inject: [shim],          // ← sustituye todos los “import react”
        outfile: out
    });
}

export async function buildGlobalReact(outDir = 'dist/vendor/react') {
    // 1) React (igual que antes, global React)
    await esbuild.build({
        entryPoints: ['react'],
        bundle: true,
        minify: false,
        format: 'iife',
        globalName: 'React',
        outfile: path.join(outDir, 'react.global.js')
    });

    // 2) ReactDOM (legacy) y 3) ReactDOMClient
    await buildDom('react-dom', 'ReactDOM',
        path.join(outDir, 'react-dom.global.js'));

    await buildDom('react-dom/client', 'ReactDOMClient',
        path.join(outDir, 'react-dom.client.global.js'));

    console.log('✅  React globals →', outDir);
}

//buildGlobalReact()