// plugins/esbuild-to-global.ts
import fs from 'fs/promises';
import path from 'path';
import type { Plugin } from 'esbuild';

export function dtsToGlobalPlugin(options?: {
    replace?: { name: string; value: string }[];
    rawText?: string[];
}): Plugin {
    const replaces = options?.replace ?? [];
    // Normalizamos y convertimos en sufijos (para fullPath.endsWith)
    const raws = (options?.rawText ?? [])
        .map(p => p.split(path.sep).join('/'));

    return {
        name: 'dts-to-global',
        setup(build) {
            build.onLoad({ filter: /.*/ }, async (args) => {
                const full = args.path.split(path.sep).join('/');
                const isDts = full.endsWith('.d.ts');
                const isRaw = raws.some(r => full.endsWith(r));

                // 1) Si es ruta de rawText, devolvemos el JS original sin cambios
                if (isRaw) {
                    const original = await fs.readFile(args.path, 'utf8');
                    return { contents: original };
                }

                // 2) Si es .d.ts, lo convertimos en globalThis.<var> = "<texto>"
                if (isDts) {
                    let text = await fs.readFile(args.path, 'utf8');
                    for (const { name, value } of replaces) {
                        text = text.split(name).join(value);
                    }
                    const base = path.basename(args.path);
                    const varName = base.replace(/[^a-zA-Z0-9]/g, '_');
                    const contents = `globalThis.${varName} = ${JSON.stringify(text)};`;
                    return { contents, loader: 'js' };
                }

                // 3) Todo lo demás: dejar pasar al bundler normal
                return;
            });
        },
    };
}
