import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { bindingsByPlatformAndArch } from './archs';
import { Print } from 'src/extension';
import * as zlib from 'zlib';
import * as tar from 'tar-stream';

export class Downloader {
  constructor(
    private storeDir: string,
    private rollupVersion: string,
    private fullDownload = false
  ) { }

  async download(): Promise<boolean> {
    const plat = os.platform();
    const arch = os.arch();
    const platMap = (bindingsByPlatformAndArch as any)[plat];
    if (!platMap) throw new Error(`Unsupported platform: ${plat}`);

    const info = platMap[arch];
    if (!info) throw new Error(`Unsupported architecture: ${plat}/${arch}`);

    const pkgBase = info.base;
    const ver = this.rollupVersion.replace(/^[^\d]*/, '');
    const tarballUrl = `https://registry.npmjs.org/@rollup/rollup-${pkgBase}/-/rollup-${pkgBase}-${ver}.tgz`;

    Print("bruno", "Downloading rollup.");
    console.log("Download URL:", tarballUrl);

    return new Promise<boolean>((resolve, reject) => {
      https.get(tarballUrl, (res) => {
        if (res.statusCode !== 200) {
          return reject(new Error(`Failed to download: HTTP ${res.statusCode}`));
        }

        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          try {
            const buf = Buffer.concat(chunks);
            const unzipped = zlib.gunzipSync(buf);
            const extract = tar.extract();

            extract.on('entry', (header, stream, next) => {
              const internalPath = header.name.replace(/^package\//, '');
              const isWantedFile = internalPath.endsWith(`rollup.${pkgBase}.node`) || internalPath === 'package.json';

              if (!this.fullDownload && !isWantedFile) {
                stream.resume();
                return next();
              }

              const destPath = path.join(this.storeDir, 'vendor', 'rollup', this.fullDownload ? internalPath : path.basename(internalPath));
              if (header.type === 'directory') {
                fs.mkdirSync(destPath, { recursive: true });
                stream.resume();
                return next();
              }

              fs.mkdirSync(path.dirname(destPath), { recursive: true });
              const ws = fs.createWriteStream(destPath, { mode: header.mode || 0o755 });
              stream.pipe(ws).on('finish', next);
            });

            extract.on('finish', () => resolve(true));
            extract.end(unzipped);
          } catch (err) {
            reject(err);
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Just checks if the .node binary exists
   */
  async testBinary(): Promise<boolean> {
    const plat = os.platform();
    const arch = os.arch();
    const platMap = (bindingsByPlatformAndArch as any)[plat];
    if (!platMap) throw new Error(`Unsupported platform: ${plat}`);

    const info = platMap[arch];
    if (!info) throw new Error(`Unsupported arch: ${plat}/${arch}`);

    const binPath = path.join(this.storeDir, "vendor", "rollup", `rollup.${info.base}.node`);
    return fs.existsSync(binPath);
  }
}
