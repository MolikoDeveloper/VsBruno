import { useEffect, useRef } from "react";

type IframeEditorProps = {
    value: string;
    globals: string;
    path: string;
    theme: "vs" | "vs-dark" | "hc-black";
    monacoBasePath: string;
    onChange?: (value: string) => void;
};

export default function ({
    value,
    globals,
    path,
    theme,
    monacoBasePath,
    onChange,
}: IframeEditorProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe?.contentWindow) return;

        iframe.contentWindow.postMessage(
            {
                type: "init",
                value,
                globals,
                path,
                theme,
                language: "typescript",
            },
            "*"
        );
    }, [value, globals, path, theme]);

    useEffect(() => {
        const handler = (e: MessageEvent) => {
            if (e.data?.type === "change") {
                onChange?.(e.data.value);
            }
        };
        window.addEventListener("message", handler);
        return () => window.removeEventListener("message", handler);
    }, [onChange]);

    const srcDoc = /* html */ `<!DOCTYPE html>
<html>
<head>
    <style>html, body, #container { margin: 0; padding: 0; height: 100%; }</style>
</head>
<body>
    <div id="container"></div>
    <script>
        globalThis.MONACO_BASE_PATH = '${monacoBasePath}';
    </script>
    <script src="${monacoBasePath}/loader.js"></script>
    <script>
        require.config({ paths: { vs: globalThis.MONACO_BASE_PATH } });

        let editor;

        window.addEventListener("message", (e) => {
            if (e.data?.type !== "init") return;

            const { language, path, theme, value, globals } = e.data;

            require(["vs/editor/editor.main"], () => {
                monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
                    target: monaco.languages.typescript.ScriptTarget.ESNext,
                    module: monaco.languages.typescript.ModuleKind.ESNext,
                    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
                    allowNonTsExtensions: true,
                    baseUrl: "file:///",
                    paths: { "*": ["*"] },
                    noEmit: true,
                });

                monaco.languages.typescript.typescriptDefaults.setExtraLibs([]);
                monaco.languages.typescript.typescriptDefaults.addExtraLib(globals, "file:///globals.d.ts");

                const model = monaco.editor.createModel(value, language, monaco.Uri.parse(path));
                editor = monaco.editor.create(document.getElementById("container"), {
                    model,
                    language,
                    theme,
                    automaticLayout: true,
                });

                editor.onDidChangeModelContent(() => {
                    window.parent.postMessage({
                        type: "change",
                        value: editor.getValue(),
                    }, "*");
                });
            });
        });
    </script>
</body>
</html>`;

    return (
        <iframe
            ref={iframeRef}
            sandbox="allow-scripts"
            srcDoc={srcDoc}
            style={{ width: "100%", height: "100%", border: "none" }}
        />
    );
}
