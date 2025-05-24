/*import Editor, { type OnMount, type BeforeMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import monaco from "monaco-editor"
import { useCallback, useEffect, useRef, useState } from "react";
import { parseBruVars } from "src/common/parseBruVars";
import type { BruVar } from "src/types/bruno/bruno";
import { useBruContent } from "src/webview/context/BruProvider";

type props = {
    value: string,
    onChange: (value: string | undefined, ev: editor.IModelContentChangedEvent) => void,
    theme: string | undefined,
    language?: string,
    height?: string | undefined,
    options?: editor.IStandaloneEditorConstructionOptions | undefined
}

export default function ({ value, onChange, theme, language, height, options }: props) {
    const { bruContent } = useBruContent();
    const monacoRef = useRef<typeof monaco | null>(null);

    useEffect(() => {
        const bruVars = parseBruVars(bruContent, bruContent?.vars?.req, {
            exclude: ["script", "assertions", "tests"]
        }).vars?.req?.map(d => ({
            name: d.name,
            enabled: d.enabled,
            value: d.value,
            local: true
        }))

        const vars = createTokenProvider(bruVars)

        if (!vars || !monacoRef.current) return;
        monacoRef.current.languages.setMonarchTokensProvider("jsonv", vars);
    }, [bruContent])

    const beforeMount = useCallback<BeforeMount>((monaco) => {
        monacoRef.current = monaco;
        monaco.languages.register({ id: "jsonv", 'mimetypes': ["application/json"] });
        const bruVars = parseBruVars(bruContent, bruContent?.vars?.req, {
            exclude: ["script", "assertions", "tests"]
        }).vars?.req?.map(d => ({
            name: d.name,
            enabled: d.enabled,
            value: d.value,
            local: true
        }))

        monaco.languages.onLanguage("jsonv", () => {
            monaco.languages.registerDocumentFormattingEditProvider("jsonv", {
                provideDocumentFormattingEdits(model) {
                    return []; // opcional: autolint
                }
            })

            monaco.languages.registerDocumentSemanticTokensProvider("jsonv", {
                getLegend() {
                    return {
                        tokenTypes: [],
                        tokenModifiers: [],
                    };
                },
                //@ts-ignore
                provideDocumentSemanticTokens() {
                    return { 'data': [] };
                }
            });

            function validateModel(model: editor.ITextModel) {
                const text = model.getValue();
                const markers: editor.IMarkerData[] = [];
                const lines = text.split(/\r?\n/);
                const propsMap: Map<string, boolean>[] = [];

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    const trimmed = line.trim();

                    // ── 1) Sintaxis de propiedad básica: "name": value
                    //    Si empieza por ", pero no tiene el patrón "x":...
                    const propMatch = trimmed.match(/^"([^"]*)"\s*:(.*)$/);
                    if (trimmed.startsWith('"') && !/^\s*".*"\s*:/.test(trimmed)) {
                        // detecta: "foo" "bar"  o  ""  o  "":
                        if (/^"[^"]+"\s+"[^"]+"/.test(trimmed)) {
                            markers.push({
                                severity: monaco.MarkerSeverity.Error,
                                message: 'Missing colon between property and value',
                                startLineNumber: i + 1,
                                startColumn: line.indexOf('"') + 1,
                                endLineNumber: i + 1,
                                endColumn: line.lastIndexOf('"') + 2,
                            });
                        } else if (/^"[^"]*"\s*,?$/.test(trimmed)) {
                            markers.push({
                                severity: monaco.MarkerSeverity.Error,
                                message: 'Property without value',
                                startLineNumber: i + 1,
                                startColumn: line.indexOf('"') + 1,
                                endLineNumber: i + 1,
                                endColumn: line.lastIndexOf('"') + 2,
                            });
                        } else {
                            markers.push({
                                severity: monaco.MarkerSeverity.Error,
                                message: 'Invalid property syntax',
                                startLineNumber: i + 1,
                                startColumn: line.indexOf('"') + 1,
                                endLineNumber: i + 1,
                                endColumn: line.lastIndexOf('"') + 2,
                            });
                        }
                        continue;
                    }

                    // ── 2) Si sí matchea "name":... entonces revisa nombre vacío o valor faltante
                    if (propMatch) {
                        const name = propMatch[1];
                        const rest = propMatch[2].trim();
                        // nombre vacío:
                        if (name === '') {
                            const col = line.indexOf('""') + 1;
                            markers.push({
                                severity: monaco.MarkerSeverity.Error,
                                message: 'Property name is empty',
                                startLineNumber: i + 1,
                                startColumn: col,
                                endLineNumber: i + 1,
                                endColumn: col + 2,
                            });
                            continue;
                        }
                        // valor faltante (p.ej. `"foo":` o `"foo":,`):
                        if (rest === '' || rest === ',') {
                            const col = line.indexOf(':') + 1;
                            markers.push({
                                severity: monaco.MarkerSeverity.Error,
                                message: 'Property without value',
                                startLineNumber: i + 1,
                                startColumn: col,
                                endLineNumber: i + 1,
                                endColumn: col + 1,
                            });
                            continue;
                        }
                    }

                    // ── 3) Ahora tu chequeo de duplicados
                    if (trimmed.endsWith('{')) {
                        propsMap.push(new Map());
                    } else if (trimmed.startsWith('}')) {
                        propsMap.pop();
                    } else {
                        const m = trimmed.match(/^"([^"]+)":/);
                        if (m && propsMap.length > 0) {
                            const name = m[1];
                            const map = propsMap[propsMap.length - 1];
                            if (map.has(name)) {
                                markers.push({
                                    severity: monaco.MarkerSeverity.Error,
                                    message: `Duplicated property: "${name}"`,
                                    startLineNumber: i + 1,
                                    startColumn: line.indexOf(name) + 1,
                                    endLineNumber: i + 1,
                                    endColumn: line.indexOf(name) + name.length + 1,
                                });
                            } else {
                                map.set(name, true);
                            }
                        }
                    }

                    // ── 4) Tu validación de coma “colgante”
                    if (trimmed.endsWith(',')) {
                        let j = i + 1;
                        while (j < lines.length && lines[j].trim() === '') j++;
                        const next = j < lines.length ? lines[j].trim() : null;
                        if (next === null || next.startsWith('}') || next.startsWith(']')) {
                            const commaCol = line.lastIndexOf(',') + 1;
                            markers.push({
                                severity: monaco.MarkerSeverity.Error,
                                message: 'Trailing comma with no property/value after',
                                startLineNumber: i + 1,
                                startColumn: commaCol,
                                endLineNumber: i + 1,
                                endColumn: commaCol + 1,
                            });
                        }
                    }
                }

                monaco.editor.setModelMarkers(model, 'jsonv-linter', markers);
            }


            const model = monaco.editor.getModels()[0];
            if (model && model.getLanguageId() === "jsonv") {
                validateModel(model);
                model.onDidChangeContent(() => validateModel(model));
            }

            monaco.editor.onDidCreateModel((model) => {
                if (model.getLanguageId() !== "jsonv") return;
                validateModel(model);
                model.onDidChangeContent(() => validateModel(model));
            });
        })

        monaco.languages.setMonarchTokensProvider("jsonv", createTokenProvider(bruVars));

        monaco.editor.defineTheme("vs", {
            base: "vs",
            inherit: true,
            rules: [
                { token: "variableExists", foreground: "008800" },
                { token: "variableGlobal", foreground: "FFA500" },
                { token: "variableDisabled", foreground: "ff0000" },
                { token: "variableMissing", foreground: "ff0000", fontStyle: "underline" },
                { token: "property", foreground: "a31515" },
                { token: "delimiter", foreground: "505080" },
                { token: "token", foreground: "00ff00" },
                { token: "string", foreground: "0451a5" },
                { token: "boolean", foreground: "0451a5" },
                { token: "null", foreground: "0451a5" },
                { token: "object", foreground: "319331" },
                { token: "array", foreground: "7b3814" }
            ],
            colors: {}
        });

        monaco.editor.defineTheme("vs-dark", {
            base: "vs-dark",
            inherit: true,
            rules: [
                { token: "variableExists", foreground: "4CAF50" },
                { token: "variableGlobal", foreground: "FF9800" },
                { token: "variableDisabled", foreground: "F44336" },
                { token: "variableMissing", foreground: "F44336", fontStyle: "underline" },
                { token: "property", foreground: "9cdcfe" },
                { token: "string", foreground: "ce9178" },
                { token: "delimiter", foreground: "dcdcdc" },
                { token: "token", foreground: "00ff00" },
                { token: "boolean", foreground: "ce9178" },
                { token: "null", foreground: "ce9178" },
                { token: "object", foreground: "da70d6" },
                { token: "array", foreground: "ffd700" }
            ],
            colors: {}
        });
    }, [bruContent]);

    const onMount = useCallback<OnMount>((editor, monaco) => {
        const bruVars = parseBruVars(bruContent, bruContent?.vars?.req, {
            exclude: ["script", "assertions", "tests"]
        }).vars?.req?.map(d => ({
            name: d.name,
            enabled: d.enabled,
            value: d.value,
            local: true
        }))

        monaco.languages.setMonarchTokensProvider("jsonv",
            createTokenProvider(bruVars));
    }, [bruContent])

    return <Editor value={value} onChange={onChange} height={height} options={options} language={language} theme={theme} beforeMount={beforeMount} onMount={onMount} />
}

function createTokenProvider(vars: BruVar[] | undefined): monaco.languages.IMonarchLanguage {
    const activeLocalNames = vars?.filter(v => v.enabled && v.local).map(v => v.name) || [];
    const activeGlobalNames = vars?.filter(v => v.enabled && !v.local).map(v => v.name) || [];
    const disabledNames = vars?.filter(v => !v.enabled).map(v => v.name) || [];

    return {
        activeLocal: activeLocalNames,
        activeGlobal: activeGlobalNames,
        disabled: disabledNames,

        tokenizer: {
            root: [
                // ① Variables embebidas justo antes de “:” → propiedad dinámica
                [/\{\{\s*([a-zA-Z_]\w*)\s*\}\}(?=\s*:)/, {
                    cases: {
                        '$1@activeLocal': 'variableExists',
                        '$1@activeGlobal': 'variableGlobal',
                        '$1@disabled': 'variableDisabled',
                        '@default': 'variableMissing'
                    }
                }],

                // ② Propiedades sin variables
                [/"([^"\\]|\\.)*"(?=\s*:)/, 'property'],

                // ③ Comienzo de string para valores
                [/"/, { token: 'string.quote', next: '@string' }],

                // ④ Variables sueltas fuera de strings
                [/\{\{\s*([a-zA-Z_]\w*)\s*\}\}/, {
                    cases: {
                        '$1@activeLocal': 'variableExists',
                        '$1@activeGlobal': 'variableGlobal',
                        '$1@disabled': 'variableDisabled',
                        '@default': 'variableMissing'
                    }
                }],

                // ⑤ Resto de tokens JSON
                [/-?\d+(\.\d+)?([eE][+\-]?\d+)?/, 'number'],
                [/\b(?:true|false)\b/, 'boolean'],
                [/\bnull\b/, 'null'],
                [/[{}]/, 'object'],
                [/[\[\]]/, 'array'],
                [/[,:]/, 'delimiter'],
                [/\s+/, 'white'],
            ],

            // Estado para contenido de string (valores)
            string: [
                // Variables dentro de string
                [/\{\{\s*([a-zA-Z_]\w*)\s*\}\}/, {
                    cases: {
                        '$1@activeLocal': 'variableExists',
                        '$1@activeGlobal': 'variableGlobal',
                        '$1@disabled': 'variableDisabled',
                        '@default': 'variableMissing'
                    }
                }],

                // Escapes
                [/\\./, 'string.escape'],

                // Cierre de string
                [/"/, { token: 'string.quote', next: '@pop' }],

                // Resto de contenido
                [/[^\\{""]+/, 'string'],
            ],
        }
    };
}
*/

import Editor, { type OnMount, type BeforeMount } from "@monaco-editor/react";
import type { editor, languages } from "monaco-editor";
import monaco from "monaco-editor"
import { useCallback, useEffect, useMemo, useRef } from "react";
import { parseBruVars } from "src/common/parseBruVars"; // Assuming this path is correct
import type { BruVar } from "src/types/bruno/bruno"; // Assuming this path is correct
import { useBruContent } from "src/webview/context/BruProvider"; // Assuming this path is correct

type props = {
    value: string,
    onChange: (value: string | undefined, ev: editor.IModelContentChangedEvent) => void,
    theme: string | undefined,
    language?: string,
    height?: string | undefined,
    options?: editor.IStandaloneEditorConstructionOptions | undefined
}

// Helper function to create token provider (assuming BruVar structure)
function createTokenProvider(vars: BruVar[] | undefined): languages.IMonarchLanguage {
    const activeLocalNames = vars?.filter(v => v.enabled && v.local).map(v => v.name) || [];
    const activeGlobalNames = vars?.filter(v => v.enabled && !v.local).map(v => v.name) || [];
    const disabledNames = vars?.filter(v => !v.enabled).map(v => v.name) || [];

    return {
        activeLocal: activeLocalNames,
        activeGlobal: activeGlobalNames,
        disabled: disabledNames,

        tokenizer: {
            root: [
                // Add rule for single-line comments
                [/\/\/.*/, 'comment'],

                // ① Variables embebidas justo antes de “:” → propiedad dinámica
                [/\{\{\s*([a-zA-Z_]\w*)\s*\}\}(?=\s*:)/, {
                    cases: {
                        '$1@activeLocal': 'variableExists',
                        '$1@activeGlobal': 'variableGlobal',
                        '$1@disabled': 'variableDisabled',
                        '@default': 'variableMissing'
                    }
                }],

                // ② Propiedades sin variables
                [/"([^"\\]|\\.)*"(?=\s*:)/, 'property'],

                // ③ Comienzo de string para valores
                [/"/, { token: 'string.quote', next: '@string' }],

                // ④ Variables sueltas fuera de strings
                [/\{\{\s*([a-zA-Z_]\w*)\s*\}\}/, {
                    cases: {
                        '$1@activeLocal': 'variableExists',
                        '$1@activeGlobal': 'variableGlobal',
                        '$1@disabled': 'variableDisabled',
                        '@default': 'variableMissing'
                    }
                }],

                // ⑤ Resto de tokens JSON
                [/-?\d+(\.\d+)?([eE][+\-]?\d+)?/, 'number'],
                [/\b(?:true|false)\b/, 'boolean'],
                [/\bnull\b/, 'null'],
                [/[{}]/, 'object'],
                [/[\[\]]/, 'array'],
                [/[,:]/, 'delimiter'],
                [/\s+/, 'white'],
            ],

            // Estado para contenido de string (valores)
            string: [
                // Variables dentro de string
                [/\{\{\s*([a-zA-Z_]\w*)\s*\}\}/, {
                    cases: {
                        '$1@activeLocal': 'variableExists',
                        '$1@activeGlobal': 'variableGlobal',
                        '$1@disabled': 'variableDisabled',
                        '@default': 'variableMissing'
                    }
                }],
                [/\\./, 'string.escape'], // Escapes
                [/"/, { token: 'string.quote', next: '@pop' }], // Cierre de string
                [/[^\\{""]+/, 'string'], // Resto de contenido
            ],
        }
    };
}


export default function MonacoEditorComponent({ value, onChange, theme, language, height, options }: props) {
    const { bruContent } = useBruContent();
    const monacoRef = useRef<typeof monaco | null>(null);

    const bruVarsData = useMemo(() => {
        if (!bruContent) return undefined;
        const reqVars = bruContent.vars?.req;
        return parseBruVars(bruContent, reqVars, {
            exclude: ["script", "assertions", "tests"]
        }).vars?.req?.map(d => ({
            name: d.name,
            enabled: d.enabled,
            value: d.value,
            local: d.local
        })) as BruVar[] | undefined;
    }, [bruContent]);


    useEffect(() => {
        if (!monacoRef.current || !bruVarsData) return;
        monacoRef.current.languages.setMonarchTokensProvider("jsonv", createTokenProvider(bruVarsData));
    }, [bruVarsData]); // Re-run if bruVarsData changes

    const beforeMount = useCallback<BeforeMount>((monacoInstance) => {
        monacoRef.current = monacoInstance;
        monacoInstance.languages.register({ id: "jsonv", 'mimetypes': ["application/json"] });

        // Initial token provider setup
        // bruVarsData is available here due to useMemo
        const initialTokenProvider = createTokenProvider(bruVarsData);
        monacoInstance.languages.setMonarchTokensProvider("jsonv", initialTokenProvider);

        monacoInstance.languages.onLanguage("jsonv", () => {
            monacoInstance.languages.registerDocumentFormattingEditProvider("jsonv", {
                provideDocumentFormattingEdits(model) {
                    // Basic JSON formatting (pretty print)
                    try {
                        const text = model.getValue();
                        // Attempt to parse only if it's not empty or just whitespace
                        if (text.trim() === "") return [];
                        const formatted = JSON.stringify(JSON.parse(text), null, 2); // Using 2 spaces for indentation
                        return [{
                            range: model.getFullModelRange(),
                            text: formatted,
                        }];
                    } catch (e) {
                        // If parsing fails, don't format
                        console.warn("JSON formatting failed:", e);
                        return [];
                    }
                }
            });

            monacoInstance.languages.registerDocumentSemanticTokensProvider("jsonv", {
                getLegend() {
                    return {
                        tokenTypes: [], // Define if using semantic tokens for more advanced highlighting
                        tokenModifiers: [],
                    };
                },
                //@ts-ignore
                provideDocumentSemanticTokens(model, lastResultId, token) {
                    return { 'data': [] }; // Placeholder
                }
            });

            function validateModel(model: editor.ITextModel) {
                const text = model.getValue();
                const markers: editor.IMarkerData[] = [];
                const lines = text.split(/\r?\n/);
                const propsMapStack: Map<string, { line: number, col: number }>[] = []; // For duplicate keys, stores location of first occurrence

                for (let i = 0; i < lines.length; i++) {
                    const originalLine = lines[i];
                    const trimmedLine = originalLine.trim();

                    // Skip empty lines
                    if (trimmedLine === '') continue;

                    // Handle single-line comments: if a line is a comment, skip all other validations for this line
                    if (trimmedLine.startsWith('//')) {
                        continue;
                    }

                    // --- Scope Management for Duplicate Property Check ---
                    if (trimmedLine.endsWith('{')) {
                        propsMapStack.push(new Map());
                    } else if (trimmedLine.startsWith('}')) {
                        if (propsMapStack.length > 0) {
                            propsMapStack.pop();
                        } else {
                            // Mismatched closing brace
                            markers.push({
                                severity: monacoInstance.MarkerSeverity.Error,
                                message: 'Mismatched closing brace "}". No corresponding opening brace.',
                                startLineNumber: i + 1,
                                startColumn: originalLine.indexOf('}') + 1,
                                endLineNumber: i + 1,
                                endColumn: originalLine.indexOf('}') + 2,
                            });
                        }
                    }
                    if (trimmedLine.startsWith('{') && propsMapStack.length === 0 && i > 0) { // Handles cases where a new root object starts unexpectedly
                        // This might be too aggressive depending on desired strictness.
                        // TODO: consider if multiple root objects (not typical for JSON) should be an error.
                    }

                    const propMatch = trimmedLine.match(/^"([^"\\]*(?:\\.[^"\\]*)*)"\s*:(.*)$/);

                    if (trimmedLine.startsWith('"') && !propMatch && !trimmedLine.match(/:\s*".*"/) && !/^\s*".*"\s*:\s*.*,\s*$/.test(trimmedLine) && !/^\s*".*"\s*:\s*.*\s*$/.test(trimmedLine)) {
                        let message = 'Invalid property syntax.';
                        let startCol = originalLine.indexOf('"') + 1;
                        let endCol = originalLine.length + 1;

                        if (/^"[^"]+"\s+"[^"]+"/.test(trimmedLine)) {
                            message = 'Missing colon ":" between property and value.';
                            const firstQuoteEnd = trimmedLine.indexOf('"', 1) + 1;
                            const secondQuoteStart = trimmedLine.indexOf('"', firstQuoteEnd);
                            startCol = firstQuoteEnd + 1;
                            endCol = secondQuoteStart + 1;
                        } else if (/^"[^"]*"\s*,?$/.test(trimmedLine) && !trimmedLine.includes(':')) {
                            message = 'Property defined without a value or colon.';
                            endCol = originalLine.lastIndexOf('"') + 2;
                        }


                        markers.push({
                            severity: monacoInstance.MarkerSeverity.Error,
                            message: message,
                            startLineNumber: i + 1,
                            startColumn: startCol,
                            endLineNumber: i + 1,
                            endColumn: endCol,
                        });
                        continue;
                    }

                    if (propMatch) {
                        const name = propMatch[1];
                        const restOfValue = propMatch[2].trim();

                        // Nombre vacío:
                        if (name === '') {
                            const col = originalLine.indexOf('""') + 1;
                            markers.push({
                                severity: monacoInstance.MarkerSeverity.Error,
                                message: 'Property name cannot be empty.',
                                startLineNumber: i + 1,
                                startColumn: col,
                                endLineNumber: i + 1,
                                endColumn: col + 2,
                            });
                        }

                        if (restOfValue === '' || (restOfValue === ',' && !trimmedLine.endsWith('{}') && !trimmedLine.endsWith('[]'))) {
                            const col = originalLine.indexOf(':') + 1;
                            markers.push({
                                severity: monacoInstance.MarkerSeverity.Error,
                                message: 'Property value is missing after colon.',
                                startLineNumber: i + 1,
                                startColumn: col,
                                endLineNumber: i + 1,
                                endColumn: col + (restOfValue === ',' ? 2 : 1),
                            });
                        }
                    }

                    if (propMatch && propsMapStack.length > 0) {
                        const name = propMatch[1];
                        const currentObjectMap = propsMapStack[propsMapStack.length - 1];
                        if (currentObjectMap.has(name)) {
                            const firstOccurrence = currentObjectMap.get(name)!;
                            markers.push({
                                severity: monacoInstance.MarkerSeverity.Error,
                                message: `Duplicate property: "${name}". First declared on line ${firstOccurrence.line}.`,
                                startLineNumber: i + 1,
                                startColumn: originalLine.indexOf(`"${name}"`) + 1,
                                endLineNumber: i + 1,
                                endColumn: originalLine.indexOf(`"${name}"`) + name.length + 3, // covers "name"
                            });
                        } else {
                            currentObjectMap.set(name, { line: i + 1, col: originalLine.indexOf(`"${name}"`) + 1 });
                        }
                    }

                    if (trimmedLine.endsWith(',')) {
                        let nextSignificantLineIndex = i + 1;
                        // Find the next non-empty, non-comment line
                        while (nextSignificantLineIndex < lines.length &&
                            (lines[nextSignificantLineIndex].trim() === '' || lines[nextSignificantLineIndex].trim().startsWith('//'))) {
                            nextSignificantLineIndex++;
                        }

                        const nextSignificantLine = nextSignificantLineIndex < lines.length ? lines[nextSignificantLineIndex].trim() : null;

                        if (nextSignificantLine === null || nextSignificantLine.startsWith('}') || nextSignificantLine.startsWith(']')) {
                            const commaCol = originalLine.lastIndexOf(',') + 1;
                            markers.push({
                                severity: monacoInstance.MarkerSeverity.Error,
                                message: 'Trailing comma is not allowed here.',
                                startLineNumber: i + 1,
                                startColumn: commaCol,
                                endLineNumber: i + 1,
                                endColumn: commaCol + 1,
                            });
                        }
                    }

                    // --- 5) Nuevas Validaciones ---
                    //    a) Invalid Keywords (ture, fals, nll instead of true, false, null)
                    //    This regex looks for these keywords not inside quotes.
                    const keywordRegex = /\b(ture|fals|nll|nul)\b/gi;
                    let match;
                    // Create a version of the line with strings replaced to avoid matching keywords in strings
                    const lineWithoutStrings = originalLine.replace(/"([^"\\]|\\.)*"/g, '""');
                    while ((match = keywordRegex.exec(lineWithoutStrings)) !== null) {
                        markers.push({
                            severity: monacoInstance.MarkerSeverity.Error,
                            message: `Invalid keyword "${match[0]}". Did you mean "true", "false", or "null"?`,
                            startLineNumber: i + 1,
                            startColumn: match.index + 1,
                            endLineNumber: i + 1,
                            endColumn: match.index + match[0].length + 1,
                        });
                    }


                    //    b) Number Formatting (leading zeros, ending with dot)
                    //    Iterate over potential numbers. This is a heuristic.
                    const potentialNumberTokens = lineWithoutStrings.split(/[\s,:;{}\[\]()"]+/).filter(Boolean);
                    for (const token of potentialNumberTokens) {
                        const tokenTrimmed = token.trim();
                        if (/^0[0-9]+$/.test(tokenTrimmed) && tokenTrimmed !== "0" && !tokenTrimmed.startsWith("0.")) { // e.g. 01, 007 but not 0 or 0.5
                            const numIndex = originalLine.indexOf(tokenTrimmed);
                            markers.push({
                                severity: monacoInstance.MarkerSeverity.Error,
                                message: `Numbers should not have leading zeros (e.g., "01" should be "1").`,
                                startLineNumber: i + 1,
                                startColumn: numIndex + 1,
                                endLineNumber: i + 1,
                                endColumn: numIndex + tokenTrimmed.length + 1,
                            });
                        }
                        if (/^\d+\.$/.test(tokenTrimmed)) { // e.g. 123.
                            const numIndex = originalLine.indexOf(tokenTrimmed);
                            markers.push({
                                severity: monacoInstance.MarkerSeverity.Error,
                                message: `Numbers should not end with a decimal point (e.g., "123." should be "123").`,
                                startLineNumber: i + 1,
                                startColumn: numIndex + 1,
                                endLineNumber: i + 1,
                                endColumn: numIndex + tokenTrimmed.length + 1,
                            });
                        }
                    }

                    //    c) Multiple Commas (e.g., value,, value or [,,] or {key:value,,})
                    //    Search for ,, not inside strings
                    let inStringContext = false;
                    for (let k = 0; k < originalLine.length - 1; k++) {
                        if (originalLine[k] === '"' && (k === 0 || originalLine[k - 1] !== '\\')) {
                            inStringContext = !inStringContext;
                        }
                        if (!inStringContext && originalLine[k] === ',' && originalLine[k + 1] === ',') {
                            markers.push({
                                severity: monacoInstance.MarkerSeverity.Error,
                                message: 'Multiple consecutive commas are not allowed.',
                                startLineNumber: i + 1,
                                startColumn: k + 1,
                                endLineNumber: i + 1,
                                endColumn: k + 3, // covers ,,
                            });
                            break; // Only report first instance per line
                        }
                    }

                    //    d) Unexpected leading comma
                    if ((trimmedLine.startsWith('[,') || trimmedLine.startsWith('{,')) && trimmedLine.length > 1) {
                        markers.push({
                            severity: monacoInstance.MarkerSeverity.Error,
                            message: 'Unexpected leading comma in array or object.',
                            startLineNumber: i + 1,
                            startColumn: originalLine.indexOf(',') + 1,
                            endLineNumber: i + 1,
                            endColumn: originalLine.indexOf(',') + 2,
                        });
                    }
                }
                // Check for unclosed braces/brackets at the end of the document
                if (propsMapStack.length > 0) {
                    // This indicates an unclosed object. The error is typically at the start of that object.
                    // For simplicity, we'll mark the end of the document or the last line.
                    // A more precise marker would require tracking where the last '{' was opened.
                    markers.push({
                        severity: monacoInstance.MarkerSeverity.Error,
                        message: `Unclosed object or array. Missing "}" or "]".`,
                        startLineNumber: lines.length, // Mark at the end
                        startColumn: lines[lines.length - 1]?.length || 1,
                        endLineNumber: lines.length,
                        endColumn: (lines[lines.length - 1]?.length || 1) + 1,
                    });
                }


                monacoInstance.editor.setModelMarkers(model, 'jsonv-linter', markers);
            }

            // Initial validation and on change
            const currentModel = monacoInstance.editor.getModels().find(m => m.getLanguageId() === "jsonv");
            if (currentModel) {
                validateModel(currentModel); // Validate existing model
                currentModel.onDidChangeContent(() => validateModel(currentModel));
            }

            monacoInstance.editor.onDidCreateModel((model) => {
                if (model.getLanguageId() !== "jsonv") return;
                validateModel(model);
                model.onDidChangeContent(() => validateModel(model));
            });
        });

        // Define themes
        monacoInstance.editor.defineTheme("vs", {
            base: "vs",
            inherit: true,
            rules: [
                { token: "comment", foreground: "008000" }, // Green for comments
                { token: "variableExists", foreground: "008800" },
                { token: "variableGlobal", foreground: "FFA500" },
                { token: "variableDisabled", foreground: "ff0000" },
                { token: "variableMissing", foreground: "ff0000", fontStyle: "underline" },
                { token: "property", foreground: "a31515" }, // reddish-brown
                { token: "delimiter", foreground: "000000" }, // black for :,
                { token: "string", foreground: "0451a5" }, // blue
                { token: "number", foreground: "098658" }, // dark green
                { token: "boolean", foreground: "0000ff" }, // blue
                { token: "null", foreground: "0000ff" },    // blue
                { token: "object", foreground: "000000" }, // black for {}
                { token: "array", foreground: "000000" }  // black for []
            ],
            colors: {
                'editor.foreground': '#000000'
            }
        });

        monacoInstance.editor.defineTheme("vs-dark", {
            base: "vs-dark",
            inherit: true,
            rules: [
                { token: "comment", foreground: "6A9955" }, // VS Code style green for comments
                { token: "variableExists", foreground: "4CAF50" },
                { token: "variableGlobal", foreground: "FF9800" },
                { token: "variableDisabled", foreground: "F44336" },
                { token: "variableMissing", foreground: "F44336", fontStyle: "underline" },
                { token: "property", foreground: "9cdcfe" }, // light blue
                { token: "delimiter", foreground: "d4d4d4" }, // light grey for :,
                { token: "string", foreground: "ce9178" }, // orange-brown
                { token: "number", foreground: "b5cea8" }, // light green
                { token: "boolean", foreground: "569cd6" }, // blue
                { token: "null", foreground: "569cd6" },    // blue
                { token: "object", foreground: "d4d4d4" }, // light grey for {}
                { token: "array", foreground: "d4d4d4" }  // light grey for []
            ],
            colors: {
                'editor.foreground': '#d4d4d4'
            }
        });

    }, [bruContent, bruVarsData]); // Add bruVarsData as a dependency

    const onMount = useCallback<OnMount>((editorInstance, monacoInstance) => {
        // bruVarsData is available here
        // This onMount might be redundant if beforeMount handles token provider setup sufficiently
        // However, it ensures the provider is set if onMount is called for any reason after beforeMount
        if (bruVarsData) {
            monacoInstance.languages.setMonarchTokensProvider("jsonv", createTokenProvider(bruVarsData));
        }

        // You can also trigger an initial validation here if needed, though beforeMount's onLanguage should cover it.
        // const model = editorInstance.getModel();
        // if (model && model.getLanguageId() === "jsonv") {
        //     // Access validateModel function if it's hoisted or passed appropriately
        // }

    }, [bruVarsData]);


    return <Editor
        value={value}
        onChange={onChange}
        height={height}
        options={{
            glyphMargin: true, // Needed for error markers
            scrollBeyondLastLine: false,
            minimap: { enabled: false },
            ...options
        }}
        language={language === "json" ? "jsonv" : language} // Use jsonv for "json"
        theme={theme}
        beforeMount={beforeMount}
        onMount={onMount}
    />
}
