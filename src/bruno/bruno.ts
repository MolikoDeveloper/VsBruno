export interface BruBlock {
    blockName: string;
    data: Record<string, any>;
}

export function parseBru(text: string): BruBlock[] {
    const lines = text.split(/\r?\n/);
    const blocks: BruBlock[] = [];

    let currentBlockName: string | null = null;
    let braceDepth = 0;
    let buffer: string[] = [];

    function flushBlock() {
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
            const match = line.match(/^([\w:-]+)\s*\{/);
            if (match) {
                currentBlockName = match[1];
                braceDepth = 1;
                const afterBrace = line.slice(match[0].length);
                if (afterBrace) buffer.push(afterBrace);
            }
        } else {
            braceDepth += (line.match(/\{/g) || []).length;
            braceDepth -= (line.match(/}/g) || []).length;
            if (braceDepth > 0 || (braceDepth === 0 && !line.trim().endsWith('}'))) {
                buffer.push(line);
            }
            if (braceDepth <= 0) flushBlock();
        }
    }

    if (currentBlockName !== null) flushBlock();
    return blocks;
}

function parseBlockContent(blockName: string, content: string): BruBlock {
    if (blockName === 'docs') {
        const lines = content.split('\n');
        while (lines.length > 0 && lines[0].trim() === '') lines.shift();
        while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();

        const minIndent = lines
            .filter(line => line.trim())
            .reduce((min, line) => {
                const leadingSpaces = line.match(/^ */)?.[0].length ?? 0;
                return Math.min(min, leadingSpaces);
            }, Infinity);

        const cleaned = lines.map(line => line.slice(minIndent));
        return { blockName, data: { _raw: cleaned.join('\n') } };
    }

    if (blockName.includes('json')) {
        const jsonMatch = content.match(/^\{([\s\S]*)}$/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(`{${jsonMatch[1].trim()}}`);
                return { blockName, data: parsed };
            } catch { }
        }
        return { blockName, data: { _raw: content.trim() } };
    }

    const data: Record<string, any> = {};
    const lines = content.split('\n');
    for (let ln of lines) {
        const lineTrim = ln.trim();
        if (!lineTrim) continue;
        const idx = lineTrim.indexOf(':');
        if (idx > 0) {
            const key = lineTrim.substring(0, idx).trim();
            const val = lineTrim.substring(idx + 1).trim();
            data[key] = val;
        } else {
            if (!data._raw) data._raw = '';
            data._raw += ln + '\n';
        }
    }

    return { blockName, data };
}

export function stringifyBru(blocks: BruBlock[]): string {
    let out = '';

    for (const block of blocks) {
        out += `${block.blockName} {\n`;

        if (block.blockName === 'docs') {
            const raw = block.data._raw || '';
            out += indentLines(raw.trimEnd(), 2) + '\n';
        } else if (block.blockName.includes('json') && typeof block.data === 'object' && !('_raw' in block.data)) {
            const strJson = JSON.stringify(block.data, null, 2);
            out += '  {\n' + indentLines(strJson, 4) + '\n  }\n';
        } else {
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
                out += rawLines.trimEnd() + '\n';
            }
        }

        out += `}\n\n`;
    }

    return out.trim();
}

function indentLines(text: string, spaces: number): string {
    const indent = ' '.repeat(spaces);
    return text
        .split('\n')
        .map((line) => (line ? indent + line : line))
        .join('\n');
}
