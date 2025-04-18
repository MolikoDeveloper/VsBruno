/**
 * Estructura que representa un bloque .bru
 */
export interface BruBlock {
    blockName: string;              // ej. "meta", "docs", "body:json", etc.
    data: Record<string, any>;      // contenido parseado, por ejemplo { _raw: "..."} o { url: "...", ... }
}

/**
 * parseBru
 * Recorre el texto buscando bloques "X { ... }" de nivel superior usando un contador de llaves.
 * - docs => guarda todo como data._raw
 * - body:json => parsea JSON adentro si corresponde
 * - general => parsea línea a línea "clave: valor"
 */
export function parseBru(text: string): BruBlock[] {
    const lines = text.split(/\r?\n/);
    const blocks: BruBlock[] = [];

    let currentBlockName: string | null = null;
    let braceDepth = 0;
    let buffer: string[] = []; // Para ir acumulando las líneas del contenido

    function flushBlock() {
        // Llamada cuando cerramos un bloque
        if (currentBlockName !== null) {
            const blockContent = buffer.join('\n');
            blocks.push(parseBlockContent(currentBlockName, blockContent));
        }
        currentBlockName = null;
        braceDepth = 0;
        buffer = [];
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (currentBlockName === null) {
            // Buscamos inicio de bloque en la línea: ej. "docs {"
            // Regex: /^([\w:-]+)\s*\{/
            const match = line.match(/^([\w:-]+)\s*\{/);

            if (match) {
                currentBlockName = match[1];
                braceDepth = 1;
                // Si la línea tiene algo más después de la primera '{', lo guardamos en buffer
                const afterBrace = line.slice(match[0].length).trim();
                if (afterBrace) {
                    buffer.push(afterBrace);
                }
            } else {
                // Línea fuera de cualquier bloque, lo ignoramos o lo guardamos en algún "global" si hiciera falta
            }
        } else {
            // Estamos dentro de un bloque, incrementamos/decrementamos braceDepth según '{' y '}' que aparezcan
            let lineToPush = line;
            // Contar cuántas llaves de apertura y cierre aparecen
            const opens = (line.match(/{/g) || []).length;
            const closes = (line.match(/}/g) || []).length;

            braceDepth += opens;
            braceDepth -= closes;

            // Si la línea cierra el bloque (braceDepth <= 0), recortamos todo lo que aparezca después de la llave de cierre
            // Ejemplo: "status: { code: ... }," en la misma línea
            if (braceDepth < 0) {
                // Muy extraño, significaría que hay llaves de más, lo normal es braceDepth==0
                // pero lo tratamos igual. Ajustamos a 0.
                braceDepth = 0;
            }

            if (closes > 0) {
                // Tomamos el substring hasta la primera '}'
                const closeIndex = lineToPush.indexOf('}');
                if (closeIndex !== -1) {
                    // Guardamos hasta antes del '}'
                    lineToPush = lineToPush.substring(0, closeIndex).trim();
                }
            }

            if (lineToPush) {
                buffer.push(lineToPush);
            }

            // Si braceDepth llegó a 0, cerramos el bloque
            if (braceDepth === 0) {
                flushBlock();
            }
        }
    }

    // Por si quedó un bloque abierto sin cerrar (no usual):
    if (currentBlockName !== null) {
        flushBlock();
    }

    return blocks;
}

/**
 * parseBlockContent
 * Interpreta el contenido interno de un bloque en base a su nombre.
 * - docs => raw
 * - *json => parse JSON
 * - caso general => parse "clave: valor" por cada línea
 */
function parseBlockContent(blockName: string, content: string): BruBlock {
    // 'docs': meter todo el contenido en _raw sin procesar
    if (blockName === 'docs') {
        return {
            blockName,
            data: { _raw: content.trim() },
        };
    }

    // '*json': tratar de parsear JSON anidado
    if (blockName.includes('json')) {
        // Revisamos si el contenido es algo como:
        // {
        //   "foo": 123
        // }
        // a veces la gente pone llaves extra. Intentamos machear
        const jsonMatch = content.match(/\{\s*([\s\S]*)\s*\}$/);
        if (jsonMatch) {
            const possibleJson = jsonMatch[1].trim();
            try {
                const parsed = JSON.parse(possibleJson);
                return { blockName, data: parsed };
            } catch (err) {
                // si falla, guardamos en raw
                return { blockName, data: { _raw: content } };
            }
        }
        // Sino, lo dejamos crudo
        return { blockName, data: { _raw: content } };
    }

    // Caso general: parse línea a línea "clave: valor"
    // Si una línea no cumple, la pegamos a _raw
    const data: Record<string, any> = {};
    const lines = content.split('\n');

    for (let ln of lines) {
        const lineTrim = ln.trim();
        if (!lineTrim) continue;

        // Buscamos "clave: valor"
        const idx = lineTrim.indexOf(':');
        if (idx > 0) {
            const key = lineTrim.substring(0, idx).trim();
            const val = lineTrim.substring(idx + 1).trim();
            // Podría haber más ":" en la línea, pero tomamos la primera
            data[key] = val;
        } else {
            if (!data._raw) data._raw = '';
            data._raw += ln + '\n';
        }
    }

    return { blockName, data };
}

/**
 * stringifyBru
 * Reconstruye el texto .bru a partir de BruBlock[].
 * - Si blockName==='docs', imprime todo como raw dentro de { ... }
 * - Si blockName.includes('json'), imprime JSON anidado
 * - Caso general, imprime lines "clave: valor" + _raw
 */
export function stringifyBru(blocks: BruBlock[]): string {
    let out = '';

    for (const block of blocks) {
        out += `${block.blockName} {\n`;

        if (block.blockName === 'docs') {
            // Pegar todo el contenido raw, indentado (opcional)
            const raw = block.data._raw || '';
            out += indentLines(raw, 2) + '\n';
        } else if (block.blockName.includes('json') && typeof block.data === 'object' && !('_raw' in block.data)) {
            // Convertir a JSON (si no hay raw)
            const strJson = JSON.stringify(block.data, null, 2);
            // En .bru solemos tener un nivel adicional de llaves
            out += '  {\n' + indentLines(strJson, 4) + '\n  }\n';
        } else {
            // Caso general
            const keys = Object.keys(block.data);
            let rawLines = '';

            for (const k of keys) {
                if (k === '_raw') {
                    rawLines = block.data._raw;
                } else {
                    out += `  ${k}: ${block.data[k]}\n`;
                }
            }

            if (rawLines) {
                out += indentLines(rawLines, 2) + '\n';
            }
        }

        out += `}\n\n`;
    }

    return out.trim();
}

/** Pequeña ayuda para indentar varias líneas con n espacios */
function indentLines(text: string, spaces: number): string {
    const indent = ' '.repeat(spaces);
    return text
        .split('\n')
        .map((line) => (line ? indent + line : line))
        .join('\n');
}
