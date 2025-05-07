/**
 * Convierte bytes a la unidad más “humana”.
 * @param bytes     Tamaño en **bytes** (≥ 0)
 * @param decimals  Nº de decimales a mostrar (por defecto 2)
 * @returns         Ej.: "532 B", "1.27 KB", "5.82 MB", "2.1 GB"
 */
export function humanSize(bytes: number, decimals = 2): string {
    if (!isFinite(bytes) || bytes < 0) return "0 B";
    if (bytes === 0) return "0B";

    const k = 1024;
    const units = ["B", "KB", "MB", "GB", "TB", "PB", "EB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    const value = bytes / Math.pow(k, i);
    const fixed = value.toFixed(decimals);
    // Quita ceros sobrantes (opcional)
    const cleaned = fixed.replace(/\.?0+$/, "");
    return `${cleaned} ${units[i]}`;
}

export function humanDuration(ms: number, decimals = 2): string {
    if (!isFinite(ms) || ms < 0) return "0 ms";
    if (ms < 1000) return `${ms.toFixed(0)} ms`;
    const s = ms / 1000;
    if (s < 60) return `${s.toFixed(decimals)} s`;
    const m = s / 60;
    if (m < 60) return `${m.toFixed(decimals)} min`;
    const h = m / 60;
    return `${h.toFixed(decimals)} h`;
}