import Editor, { type BeforeMount } from "@monaco-editor/react";
import { useEditorConfig } from "src/webview/context/EditorProvider";

export default function ({ value, onChange, context = "req", }: {
    value: string; onChange: (val: string | undefined) => void; context?: "req" | "res";
}) {
    const { themeKind } = useEditorConfig();

    const BeforeMount: BeforeMount = (monaco) => {

        const libUri = `file:///brunoApi_${context}/index.d.ts`;

        monaco.languages.typescript.typescriptDefaults.addExtraLib((globalThis as any).prelude_d_ts, libUri);

        const uri = monaco.Uri.parse(libUri);
        if (!monaco.editor.getModel(uri)) {
            monaco.editor.createModel((globalThis as any).prelude_d_ts, "typescript", uri);
        }
    };

    return (
        <Editor
            language="typescript"
            theme={themeKind === 2 ? "vs-dark" : themeKind === 1 ? "light" : "hc-black"}
            height="100%"
            path={`file:///${context}/index.ts`}
            options={{ minimap: { enabled: false } }}
            value={value}
            onChange={onChange}
            beforeMount={BeforeMount}
        />
    );
}
