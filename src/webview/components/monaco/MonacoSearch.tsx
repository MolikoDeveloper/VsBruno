import React, { useCallback, useEffect, useRef } from "react";
import Editor, { type BeforeMount, type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import monaco from "monaco-editor";
import { parseBruVars } from "src/common/parseBruVars";
import type { BruVar } from "src/types/bruno/bruno";
import { useBruContent } from "src/webview/context/BruProvider";

interface Props {
    value: string;
    onChange: (value: string | undefined, ev: editor.IModelContentChangedEvent) => void;
    theme?: string;
    options?: editor.IStandaloneEditorConstructionOptions;
    placeholder?: string;
    /** altura en píxels — por defecto 30 */
    heightPx?: number;
}

// Construye el lenguaje
function createSearchProvider(vars: BruVar[] | undefined): monaco.languages.IMonarchLanguage {
    const activeLocal = vars?.filter(v => v.enabled && v.local).map(v => v.name) || [];
    const activeGlobal = vars?.filter(v => v.enabled && !v.local).map(v => v.name) || [];
    const disabled = vars?.filter(v => !v.enabled).map(v => v.name) || [];

    return {
        activeLocal,
        activeGlobal,
        disabled,
        tokenizer: {
            root: [
                [/\{\{\s*([a-zA-Z_]\w*)\s*\}\}/, {
                    cases: {
                        '$1@activeLocal': 'variableExists',
                        '$1@activeGlobal': 'variableGlobal',
                        '$1@disabled': 'variableDisabled',
                        '@default': 'variableMissing'
                    }
                }],
                [/\b(?:AND|OR|NOT)\b/, 'keyword'],
                [/\b\w+:/, 'type'],
                [/"[^"]*"/, 'string'],
                [/[^\s]+/, 'identifier'],
                [/\s+/, 'white'],
            ]
        }
    };
}

export default function SearchLineEditor({
    value, onChange, theme, options, placeholder,
    heightPx = 30
}: Props) {
    const { bruContent } = useBruContent();
    const monacoRef = useRef<typeof monaco | null>(null);
    const placeholderWidget = useRef<monaco.editor.IOverlayWidget | null>(null);

    // Cuando cambian las vars, actualiza el tokenizer
    useEffect(() => {
        const reqVars = parseBruVars(bruContent, bruContent?.vars?.req, { exclude: [] })
            .vars?.req?.map(d => ({
                name: d.name,
                enabled: d.enabled,
                value: d.value,
                local: true
            }));
        if (monacoRef.current) {
            monacoRef.current.languages.setMonarchTokensProvider(
                'searchv',
                createSearchProvider(reqVars)
            );
        }
    }, [bruContent]);

    const beforeMount = useCallback<BeforeMount>(monaco => {
        monacoRef.current = monaco;
        monaco.languages.register({ id: 'searchv' });
        monaco.languages.setMonarchTokensProvider('searchv', createSearchProvider(undefined));

        monaco.editor.defineTheme('vs', {
            base: 'vs',
            inherit: false,
            rules: [
                { token: 'variableExists', foreground: '008800' },
                { token: 'variableGlobal', foreground: 'FFA500' },
                { token: 'variableDisabled', foreground: 'ff0000' },
                { token: 'variableMissing', foreground: 'ff0000', fontStyle: 'underline' },
                { token: 'keyword', foreground: '0000FF', fontStyle: 'bold' },
                { token: 'type', foreground: '800080' },
                { token: 'string', foreground: 'a31515' },
                { token: 'identifier', foreground: '000000' },
            ],
            colors: {
                // Usa 'transparent' en lugar de hex con alpha
                'editor.background': 'FF0000'
            }
        });
    }, []);

    const onMountEditor = useCallback<OnMount>((editorInstance, monaco) => {
        // Widget de placeholder
        const id = 'search.placeholder';
        const domNode = document.createElement('div');
        domNode.textContent = placeholder || 'Search...';
        Object.assign(domNode.style, {
            opacity: '0.5',
            pointerEvents: 'none',
            position: 'absolute',
            transform: 'translate(4px, 4px)', // margen interior
        });
        const widget: monaco.editor.IOverlayWidget = {
            getId: () => id,
            getDomNode: () => domNode,
            getPosition: () => ({
                preference: monaco.editor.OverlayWidgetPositionPreference.TOP_CENTER
            })
        };
        placeholderWidget.current = widget;
        editorInstance.addOverlayWidget(widget);

        const updatePlaceholder = () => {
            const hasContent = !!editorInstance.getValue();
            if (hasContent) {
                editorInstance.removeOverlayWidget(widget);
            } else {
                editorInstance.addOverlayWidget(widget);
            }
        };

        editorInstance.getModel()?.updateOptions({
            tabSize: 2,
            insertSpaces: true,
            trimAutoWhitespace: true
        });

        updatePlaceholder();
        editorInstance.onDidChangeModelContent(ev => {
            updatePlaceholder();
            onChange(editorInstance.getValue(), ev);
        });
    }, [onChange, placeholder]);

    return (
        <div
            style={{
                position: 'relative',
                width: '100%',
                height: `${heightPx}px`,    // fija la altura
                background: 'transparent',     // fondo transparente
                overflow: 'hidden'
            }}
        >
            <Editor

                height="100%"
                width="100%"
                defaultLanguage="searchv"
                value={value}
                theme={'vs'}
                beforeMount={beforeMount}
                onMount={onMountEditor}
                options={{
                    minimap: { enabled: false },
                    lineNumbers: 'off',
                    folding: false,
                    scrollbar: { horizontal: 'hidden', vertical: 'hidden' },
                    wordWrap: 'off',
                    overviewRulerLanes: 0,
                    renderLineHighlight: 'none',
                    renderWhitespace: 'none',
                    lineDecorationsWidth: 0,
                    lineNumbersMinChars: 0,
                    overviewRulerBorder: false,
                    automaticLayout: true,
                    lineHeight: heightPx,
                    ...options
                }}
            />
        </div>
    );
}
