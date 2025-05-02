import * as https from "https";
import * as fs from "fs";
import * as tar from "tar";

export async function fetchRollupNative(outDir: string, version: string) {
  const pkgName = `@rollup/rollup-${process.platform}-${process.arch}`;
  const tarball = `https://registry.npmjs.org/${encodeURIComponent(pkgName)}/-/${pkgName}-${version}.tgz`;

  await fs.promises.mkdir(outDir, { recursive: true });
  return new Promise<void>((resolve, reject) => {
    https.get(tarball, res => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download ${pkgName}: ${res.statusCode}`));
      }
      // Extraemos únicamente el .node
      res
        .pipe(tar.x({
          cwd: outDir,
          strip: 1,
          filter: (p: string) => p.endsWith(".node")
        }))
        .on("error", reject)
        .on("end", resolve);
    }).on("error", reject);
  });
}
