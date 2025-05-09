import { Plugin } from 'esbuild';
import { promises as fs } from 'fs';
import path from 'path';

export function copyMonacoAssetsPlugin({ src, dest }: { src: string, dest: string }): Plugin {

  async function copyDir(srcDir: string, destDir: string) {
    await fs.mkdir(destDir, { recursive: true });
    for (const entry of await fs.readdir(srcDir, { withFileTypes: true })) {
      const srcPath = path.join(srcDir, entry.name);
      const destPath = path.join(destDir, entry.name);
      if (entry.isDirectory()) {
        await copyDir(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  return {
    name: 'copy-monaco-assets',
    setup(build) {
      build.onEnd(async () => {
        const absSrc = path.resolve(process.cwd(), src);
        const absDest = path.resolve(process.cwd(), dest);
        await fs.rm(absDest, { recursive: true, force: true });
        await copyDir(absSrc, absDest);
        console.log(`✅ monaco-editor/vs`);
      });
    }
  };
}