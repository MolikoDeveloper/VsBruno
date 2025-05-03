import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { execFile as _execFile } from 'child_process';
import { Downloader, bindingsByPlatformAndArch } from 'src/sandbox/Downloader';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
// @ts-ignore
import pkg from '../package.json';

const execFile = promisify(_execFile);

(async () => {
    console.log('Rollup version to fetch:', pkg.dependencies.rollup);

    // 1) Descargar el binario nativo
    const storeDir = path.resolve(__dirname, 'rollup-native');
    const downloader = new Downloader(storeDir, pkg.dependencies.rollup);
    await downloader.download();
    console.log('Downloaded Rollup binary to', storeDir);

    // 2) Sobrescribir el binario que usa la dependencia 'rollup'
    const rollupPkgBinDir = path.resolve(__dirname, '../node_modules/rollup/dist/bin');
    const platform = process.platform;
    const arch = process.arch;
    const downloaded = path.join(storeDir, 'rollup.node');
    const info = (bindingsByPlatformAndArch as any)[platform]?.[arch];
    if (!info) throw new Error(`Sin binario para ${platform}/${arch}`);
    const destName = `rollup.${info.base}.node`;
    const destPath = path.join(rollupPkgBinDir, destName);
    fs.copyFileSync(downloaded, destPath);
    console.log(`Sobrescribí binario en: ${destPath}`);

    // 4) (Opcional) Generar un bundle usando la CLI
    try {
        const rollup = await import("rollup");
        const bundle = await rollup.rollup({
            'input': "test/bundleMe.js",
            plugins: [
                resolve(),
                commonjs()
            ]
        })

        const outDir = path.resolve(__dirname, 'out');
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
        await bundle.write({
            format: 'cjs',
            dir: outDir,
            entryFileNames: 'bundle.js'
        });


    } catch (e) {
        console.log(e)
    }
})();
