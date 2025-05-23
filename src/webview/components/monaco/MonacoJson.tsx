import Editor, { type OnMount, type BeforeMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useCallback, useEffect, useRef, useState } from "react";
import { parseBruVars } from "src/common/parseBruVars";
import type { BruVar } from "src/types/bruno/bruno";
import { useBruContent } from "src/webview/context/BruProvider";
import monaco from "monaco-editor"

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
