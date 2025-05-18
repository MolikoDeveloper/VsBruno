import { Plugin } from 'esbuild';
import { promises as fs } from 'fs';
import path from 'path';

interface CopyFilesOptions {
  /** Ruta(s) de origen: archivo o carpeta (relativa a `root` si preserveStructure=true) */
  src: string | string[];
  /** Carpeta de destino raíz */
  dest: string;
  /** Nombre para logs */
  name: string;
  /** Si true, conserva la estructura de carpetas relativa a `root` */
  preserveStructure?: boolean;
  /** Carpeta base para calcular rutas relativas (por defecto cwd) */
  root?: string;
  clear?: boolean
}

export function CopyFiles({ src, dest, name, preserveStructure = false, root, clear }: CopyFilesOptions): Plugin {
  // Copia recursivamente un directorio
  async function copyDir(srcDir: string, destDir: string) {
    await fs.mkdir(destDir, { recursive: true });
    for (const entry of await fs.readdir(srcDir, { withFileTypes: true })) {
      const from = path.join(srcDir, entry.name);
      const to = path.join(destDir, entry.name);
      if (entry.isDirectory()) {
        await copyDir(from, to);
      } else {
        await fs.copyFile(from, to);
      }
    }
  }

  return {
    name,
    setup(build) {
      build.onEnd(async () => {
        const cwd = process.cwd();
        const absDest = path.resolve(cwd, dest);
        // carpeta base para calcular rutas relativas
        const baseRoot = path.resolve(cwd, root || cwd);
        // limpiar destino
        if (clear) await fs.rm(absDest, { recursive: true, force: true });

        const sources = Array.isArray(src) ? src : [src];
        for (const entry of sources) {
          // resolve la ruta absoluta de la fuente
          const absSrc = preserveStructure && root
            ? path.resolve(cwd, root, entry)
            : path.resolve(cwd, entry);

          let stat;
          try {
            stat = await fs.stat(absSrc);
          } catch {
            console.warn(`[${name}] fuente no encontrada: ${absSrc}`);
            continue;
          }

          if (stat.isDirectory()) {
            // calcular ruta relativa dentro de dest
            const rel = preserveStructure
              ? path.relative(baseRoot, absSrc)
              : path.basename(absSrc);
            const target = path.join(absDest, rel);
            await copyDir(absSrc, target);
          } else {
            const rel = preserveStructure
              ? path.relative(baseRoot, absSrc)
              : path.basename(absSrc);
            const target = path.join(absDest, rel);
            await fs.mkdir(path.dirname(target), { recursive: true });
            await fs.copyFile(absSrc, target);
          }
        }

        console.log(`✅ ${name}`);
      });
    },
  };
}
