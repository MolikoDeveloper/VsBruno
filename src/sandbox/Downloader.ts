// src/sandbox/downloader.ts
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execFile } from 'child_process';

export const bindingsByPlatformAndArch = {
    android: {
        arm: { base: 'android-arm-eabi' },
        arm64: { base: 'android-arm64' }
    },
    darwin: {
        arm64: { base: 'darwin-arm64' },
        x64: { base: 'darwin-x64' }
    },
    freebsd: {
        arm64: { base: 'freebsd-arm64' },
        x64: { base: 'freebsd-x64' }
    },
    linux: {
        arm: { base: 'linux-arm-gnueabihf', musl: 'linux-arm-musleabihf' },
        arm64: { base: 'linux-arm64-gnu', musl: 'linux-arm64-musl' },
        loong64: { base: 'linux-loongarch64-gnu', musl: null },
        ppc64: { base: 'linux-powerpc64le-gnu', musl: null },
        riscv64: { base: 'linux-riscv64-gnu', musl: 'linux-riscv64-musl' },
        s390x: { base: 'linux-s390x-gnu', musl: null },
        x64: { base: 'linux-x64-gnu', musl: 'linux-x64-musl' }
    },
    win32: {
        arm64: { base: 'win32-arm64-msvc' },
        ia32: { base: 'win32-ia32-msvc' },
        x64: { base: 'win32-x64-msvc' }
    }
};

export class Downloader {
    constructor(
        private storeDir: string,
        /** Ej: "^3.20.2" o "3.20.2" */
        private rollupVersion: string
    ) { }

    async download(): Promise<void> {
        const plat = os.platform();
        const arch = os.arch();
        const platMap = (bindingsByPlatformAndArch as any)[plat];
        if (!platMap) throw new Error(`Unsupported platform: ${plat}`);
        const info = platMap[arch];
        if (!info) throw new Error(`Unsupported arch: ${plat}/${arch}`);
        const pkgBase = info.base;
        if (!pkgBase) throw new Error(`No binary for ${plat}/${arch}`);

        // normaliza versión
        const ver = this.rollupVersion.replace(/^[^\d]*/, '');
        const tarballUrl = `https://registry.npmjs.org/@rollup/rollup-${pkgBase}/-/rollup-${pkgBase}-${ver}.tgz`;
        console.log('Downloading tarball from:', tarballUrl);

        await new Promise<void>((resolve, reject) => {
            https.get(tarballUrl, res => {
                if (res.statusCode !== 200)
                    return reject(new Error(`HTTP ${res.statusCode}`));

                const chunks: Buffer[] = [];
                res.on('data', c => chunks.push(c));
                res.on('end', () => {
                    const buf = Buffer.concat(chunks);
                    const zlib = require('zlib');
                    const tar = require('tar-stream');
                    const extract = tar.extract();

                    extract.on('entry', (header: any, stream: any, next: any) => {
                        // elimina el prefijo 'package/' de la ruta interna
                        const relPath = header.name.replace(/^package\//, '');
                        const destPath = path.join(this.storeDir, relPath);

                        if (header.type === 'directory') {
                            fs.mkdirSync(destPath, { recursive: true });
                            stream.resume();
                            next();
                        } else if (header.type === 'file') {
                            fs.mkdirSync(path.dirname(destPath.replace(pkgBase + ".", "")), { recursive: true });
                            const ws = fs.createWriteStream(destPath.replace(pkgBase + ".", ""), {
                                mode: header.mode || 0o644
                            });
                            stream.pipe(ws).on('finish', () => next());
                        } else {
                            // symlink, etc; simplemente ignora
                            stream.resume();
                            next();
                        }
                    });

                    extract.on('finish', () => {
                        console.log('Finished extracting Rollup package.');
                        resolve();
                    });

                    // descomprime gzip y alimenta el extractor
                    zlib.gunzip(buf, (err: any, data: Buffer) => {
                        if (err) return reject(err);
                        extract.end(data);
                    });
                });
            }).on('error', reject);
        });
    }

    async testBinary(): Promise<boolean> {
        const bin = path.join(this.storeDir, "rollup.node");
        console.log(bin)
        if (!fs.existsSync(bin)) return false;

        try {
            const { stdout } = await execFile(bin, ['--version']);
            console.log(`rollup version: ${JSON.stringify(stdout, null, 1)}`);

            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    }
}
