import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execFile } from 'child_process';
import { bindingsByPlatformAndArch } from './archs';
import { Print } from 'src/extension';



/**
 * Downloader for fetching the Rollup native .node binary (or full package).
 */
export class Downloader {
  /**
   * @param storeDir  Directory where files will be extracted
   * @param rollupVersion  Version string like "^3.20.2" or "3.20.2"
   * @param fullDownload  If true, extract entire tarball; otherwise only the .node binary
   */
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
    if (!info) throw new Error(`Unsupported arch: ${plat}/${arch}`);
    const pkgBase = info.base;

    // Normalize version
    const ver = this.rollupVersion.replace(/^[^\d]*/, '');
    const tarballUrl =
      `https://registry.npmjs.org/@rollup/rollup-${pkgBase}/-/rollup-${pkgBase}-${ver}.tgz`;
    Print("bruno", "Downloading rollup.");
    console.log(tarballUrl)

    return new Promise<boolean>((resolve, reject) => {
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
            // Strip 'package/' prefix
            const internal = header.name.replace(/^package\//, '');
            // Only extract .node binary unless fullDownload
            const wantNode = internal.endsWith(`rollup.${pkgBase}.node`);
            if (!this.fullDownload && !wantNode) {
              stream.resume();
              return next();
            }
            // Determine relative path: full path or just basename
            const relPath = this.fullDownload
              ? internal
              : path.basename(internal);
            const dest = path.join(this.storeDir, "vendor", "rollup", relPath);

            if (header.type === 'directory') {
              fs.mkdirSync(dest, { recursive: true });
              stream.resume();
              next();
            } else if (header.type === 'file') {
              fs.mkdirSync(path.dirname(dest), { recursive: true });
              const ws = fs.createWriteStream(dest, { mode: header.mode || 0o755 });
              stream.pipe(ws).on('finish', () => next());
            } else {
              stream.resume();
              next();
            }
          });

          extract.on('finish', () => {
            resolve(true);
          });

          zlib.gunzip(buf, (err: any, data: Buffer) => {
            if (err) return reject(err);
            extract.end(data);
          });
        });
      }).on('error', reject);
    });
  }

  /**
   * Verify the native binary responds to --version
   */
  async testBinary(): Promise<boolean> {
    const plat = os.platform();
    const arch = os.arch();
    const platMap = (bindingsByPlatformAndArch as any)[plat];
    if (!platMap) throw new Error(`Unsupported platform: ${plat}`);
    const info = platMap[arch];
    if (!info) throw new Error(`Unsupported arch: ${plat}/${arch}`);


    const binPath = path.join(this.storeDir, "vendor", "rollup", `rollup.${info.base}.node`);
    if (!fs.existsSync(binPath)) return false;
    try {
      const { stdout } = await execFile(binPath, ['--version']);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  }
}