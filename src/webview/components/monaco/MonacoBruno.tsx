import Editor, { type BeforeMount, type Monaco, type OnMount } from "@monaco-editor/react";
import { useCallback, useState } from "react";
import * as _monaco from "monaco-editor"
import type { WorkSpaceScripts } from "src/types/shared";
import { useEditorConfig } from "src/webview/context/EditorProvider";

export default function ({ value, onChange, context = "req", externalModels }: {
    value: string,
    onChange: (val: string | undefined) => void,
    context?: "req" | "res",
    externalModels?: WorkSpaceScripts[]
}) {
    const { themeKind } = useEditorConfig();
    const cpath = _monaco.Uri.parse((globalThis as any).__workspacePath.replace(/.bru$/, `.${context}.tsx`));
    const jsonDataMap: Record<string, any> = {};

    const beforeMount = useCallback<BeforeMount>((monaco) => {
        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
            target: monaco.languages.typescript.ScriptTarget.ES2020,
            module: monaco.languages.typescript.ModuleKind.ESNext,
            allowJs: true,
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            resolveJsonModule: true,
            moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
            jsx: monaco.languages.typescript.JsxEmit.React,
            baseUrl: ".",
        })
        //load prelude types.
        const libUri = `file:///brunoApi/index.d.ts`;
        const preludeUri = monaco.Uri.parse(libUri)
        const prelude = (globalThis as any).prelude_d_ts as string;

        monaco.languages.typescript.typescriptDefaults.addExtraLib(prelude, libUri);
        if (!monaco.editor.getModel(preludeUri)) {
            monaco.editor.createModel(prelude, "typescript", preludeUri);
        }

        if (!externalModels || 0 == externalModels.length) return;

        //check for external scripts
        for (const { file, content } of externalModels) {
            const fileUri = monaco.Uri.parse(`${file}`);

            if (file.endsWith('.json')) {
                try {
                    // Guarda en el map con clave “ruta relativa sin prefijos ./”
                    const key = file.replace(/^\.\//, '').replace(/\.json$/, '');
                    jsonDataMap[key] = JSON.parse(content);
                } catch (e) {
                    console.warn('JSON inválido en', file, e);
                }
                continue;
            }
            //create model
            if (!monaco.editor.getModel(fileUri)) {
                monaco.editor.createModel(content, "typescript", fileUri);
                // register as Lib for TS
                monaco.languages.typescript.typescriptDefaults.addExtraLib(
                    content,
                    fileUri.toString()
                )
            }
        }

        monaco.languages.registerCompletionItemProvider('typescript', {
            triggerCharacters: ['.'],
            provideCompletionItems: (model, position) => {
                // 1) Extrae el texto de la línea hasta el cursor
                const line = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
                // 2) Detecta un patrón “alias.” (p.ej. data.)
                const m = /([A-Za-z_$][\w$]*)\.$/.exec(line);
                if (!m) return { suggestions: [] };
                const alias = m[1];

                // 3) Busca en el documento la import que correspond a ese alias y que acabe en .json
                const allText = model.getValue();
                const importRegex = new RegExp(`import\\s+${alias}\\s+from\\s+['"](.+\\.json)['"]`);
                const imp = importRegex.exec(allText);
                if (!imp) return { suggestions: [] };
                // ruta como “src/users” sin extension .json
                const modPath = imp[1].replace(/^\.\//, '').replace(/\.json$/, '');

                // 4) Saca los datos parseados
                const data = jsonDataMap[modPath];
                if (data == null || typeof data !== 'object') return { suggestions: [] };

                // 5) Determina si es array o objeto
                const props = Array.isArray(data)
                    ? Object.keys(data[0] || {})
                    : Object.keys(data);

                // 6) Crea sugerencias
                const wordRange = new monaco.Range(
                    position.lineNumber,
                    position.column,
                    position.lineNumber,
                    position.column
                );
                const suggestions = props.map(key => ({
                    label: key,
                    kind: monaco.languages.CompletionItemKind.Property,
                    insertText: key,
                    range: wordRange,
                }));

                return { suggestions };
            }
        });
    }, [])

    const onMount = useCallback<OnMount>((editor, monaco) => {
        editor.onDidFocusEditorText((e) => {
            if (!externalModels || 0 == externalModels.length) return;
            const jsonDataMap: Record<string, any> = {};

            //check for external scripts
            for (const { file, content } of externalModels) {
                const fileUri = monaco.Uri.parse(`${file}`);

                if (file.endsWith('.json')) {
                    try {
                        // Guarda en el map con clave “ruta relativa sin prefijos ./”
                        const key = file.replace(/^\.\//, '').replace(/\.json$/, '');
                        jsonDataMap[key] = JSON.parse(content);
                    } catch (e) {
                        console.warn('JSON inválido en', file, e);
                    }
                    continue;
                }
                //create model
                if (!monaco.editor.getModel(fileUri)) {
                    monaco.editor.createModel(content, "typescript", fileUri);
                    // register as Lib for TS
                    monaco.languages.typescript.typescriptDefaults.addExtraLib(
                        content,
                        fileUri.toString()
                    )
                }
            }

        })
        //console.log("modules:", externalModels?.map(d => d.file))
        //console.log("globalthis.__workspacePath:", cpath.path.replace('/', ''))
        //console.log("currentDir:", (globalThis as any).__workspacePath.replace('/' + (globalThis as any).__filename, ''))
    }, [externalModels])

    return (
        <Editor
            language="typescript"
            theme={themeKind === 2 ? "vs-dark" : themeKind === 1 ? "light" : "hc-black"}
            height="100%"
            path={cpath.path.replace('/', '')}
            options={{ minimap: { enabled: false }, fixedOverflowWidgets: true }}
            value={value}
            onChange={onChange}
            beforeMount={beforeMount}
            onMount={onMount}
        />
    );
}
