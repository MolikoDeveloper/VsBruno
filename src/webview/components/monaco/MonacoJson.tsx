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

        const initialTokenProvider = createTokenProvider(bruVarsData);
        monacoInstance.languages.setMonarchTokensProvider("jsonv", initialTokenProvider);

        monacoInstance.languages.onLanguage("jsonv", () => {
            monacoInstance.languages.registerDocumentFormattingEditProvider("jsonv", {
                provideDocumentFormattingEdits(model) {
                    // Basic JSON formatting (pretty print)
                    try {
                        const text = model.getValue();
                        if (text.trim() === "") return [];
                        const formatted = JSON.stringify(JSON.parse(text), null, 2);
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
                        tokenTypes: [],
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

                        // empty name
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


                    const keywordRegex = /\b(ture|fals|nll|nul)\b/gi;
                    let match;
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

                    //    Search for ,, not inside strings
                    //    Multiple Commas (e.g., value,, value or [,,] or {key:value,,})
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

                if (propsMapStack.length > 0) {
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

        monacoInstance.editor.defineTheme("vs", {
            base: "vs",
            inherit: true,
            rules: [
                { token: "comment", foreground: "008000" },
                { token: "variableExists", foreground: "008800" },
                { token: "variableGlobal", foreground: "FFA500" },
                { token: "variableDisabled", foreground: "ff0000" },
                { token: "variableMissing", foreground: "ff0000", fontStyle: "underline" },
                { token: "property", foreground: "a31515" },
                { token: "delimiter", foreground: "000000" },
                { token: "string", foreground: "0451a5" },
                { token: "number", foreground: "098658" },
                { token: "boolean", foreground: "0000ff" },
                { token: "null", foreground: "0000ff" },
                { token: "object", foreground: "000000" },
                { token: "array", foreground: "000000" }
            ],
            colors: {
                'editor.foreground': '#000000',
                "#editor.background": '#ff0000'
            }
        });

        monacoInstance.editor.defineTheme("vs-dark", {
            base: "vs-dark",
            inherit: true,
            rules: [
                { token: "comment", foreground: "6A9955" },
                { token: "variableExists", foreground: "4CAF50" },
                { token: "variableGlobal", foreground: "FF9800" },
                { token: "variableDisabled", foreground: "F44336" },
                { token: "variableMissing", foreground: "F44336", fontStyle: "underline" },
                { token: "property", foreground: "9cdcfe" },
                { token: "delimiter", foreground: "d4d4d4" },
                { token: "string", foreground: "ce9178" },
                { token: "number", foreground: "b5cea8" },
                { token: "boolean", foreground: "569cd6" },
                { token: "null", foreground: "569cd6" },
                { token: "object", foreground: "d4d4d4" },
                { token: "array", foreground: "d4d4d4" }
            ],
            colors: {
                'editor.foreground': '#d4d4d4',
                "editor.background": '#0000002e'
            }
        });

    }, [bruContent, bruVarsData]);

    const onMount = useCallback<OnMount>((editorInstance, monacoInstance) => {
        if (bruVarsData) {
            monacoInstance.languages.setMonarchTokensProvider("jsonv", createTokenProvider(bruVarsData));
        }
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
