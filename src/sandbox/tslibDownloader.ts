import * as https from "https";
import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";
import tar from "tar-stream";              // requiere esModuleInterop: true
import { Print } from "src/extension";

/**
 * Descarga el tarball de TypeScript y extrae **solo** los lib.*.d.ts
 * a la carpeta indicada.
 */
export class TsLibDownloader {
    /**
     * @param storeDir  Carpeta donde se escribirán los lib.*.d.ts (ej. dist/ts-libs)
     * @param tsVersion Versión de TypeScript tal como aparece en package.json (ej. "^5.5.2")
     */
    constructor(private storeDir: string, private tsVersion: string) { }

    async download(): Promise<void> {
        const ver = this.tsVersion.replace(/^[^\d]*/, ""); // quita ^, ~, etc.

        const tgz = `https://registry.npmjs.org/typescript/-/typescript-${ver}.tgz`;

        Print("bruno", `⬇  Downloading TypeScript ${ver} …`);

        /* 1) Bajamos el tgz completo en memoria */
        const tgzBuf = await new Promise<Buffer>((resolve, reject) => {
            https
                .get(tgz, res => {
                    if (res.statusCode !== 200) {
                        reject(new Error(`HTTP ${res.statusCode}`));
                        res.resume();
                        return;
                    }
                    const chunks: Buffer[] = [];
                    res.on("data", c => chunks.push(c));
                    res.on("end", () => resolve(Buffer.concat(chunks)));
                })
                .on("error", reject);
        });

        /* 2) Descomprimimos */
        const tarBuf = await new Promise<Buffer>((resolve, reject) =>
            zlib.gunzip(tgzBuf, (err, data) => (err ? reject(err) : resolve(data)))
        );

        /* 3) Extraemos solo lib.*.d.ts */
        await new Promise<void>((resolve, reject) => {
            const extract = tar.extract();

            extract.on(
                "entry",
                (
                    header: tar.Headers,
                    stream: NodeJS.ReadableStream,
                    next: () => void
                ) => {
                    const rel = header.name.replace(/^package/, ""); // p. ej. lib/lib.es2019.d.ts
                    if (
                        header.type === "file" &&
                        /^\/lib\/lib.*.d.ts/.test(rel)        // solo los d.ts estándar
                    ) {
                        Print("bruno", rel)
                        const dest = path.join(this.storeDir, rel.replace(/^\/lib\//, ""));
                        fs.mkdirSync(path.dirname(dest), { recursive: true });
                        stream.pipe(fs.createWriteStream(dest)).on("finish", next);
                    } else {
                        stream.resume();
                        next();
                    }
                }
            );

            extract.on("finish", resolve);
            extract.on("error", reject);

            extract.end(tarBuf, () => {
                Print("bruno", "TypeScript libs descargadas ✅");
            });
        });
    }
}
