import Editor, { type BeforeMount } from "@monaco-editor/react";
import { useEditorConfig } from "src/webview/context/EditorProvider";

export default function ({ value, onChange, context = "req", }: {
    value: string; onChange: (val: string | undefined) => void; context?: "req" | "res";
}) {
    const { themeKind } = useEditorConfig();

    const BeforeMount: BeforeMount = (monaco) => {
        //editor.onDidFocusEditorText(() => {
        const libSource = /*ts*/`
declare class bru {
    /** current version of the package. */
    static version: string;
    /** returns the absolute path location. */
    static cwd(): string;
}

declare class req {
    static body: any;
    static method: string;
    static headers: Record<string, string>;
    static url: string;
    static timeout: number | undefined;

    script_body: any;
    script_method: string;
    script_headers: Record<string, string>;
    script_url: string;
    script_timeout: string;

    static setMethod(method: string): void;
    static getMethod(): string;

    static setBody(body: any): void;
    static getBody<T>(): T | any;

    static getUrl(): void;
    static setUrl(url: string): void;

    static getHeader(header: string): void;
    static getHeaders(): void;
    static setHeader(header: string): void;
    static setHeaders(headers: Record<string, string>): void;

    static setMaxRedirects(count: number): void;

    static getTimeout(): void;
    static setTimeout(ms: number): void;

    static getExecutionMode(): void;
    static getExecutionPlatform(): "vscode" | "app" | "cli";
}

declare class res {
    static body: any;
}
            `;

        const libUri = `file:///brunoApi_${context}/index.d.ts`;

        monaco.languages.typescript.typescriptDefaults.addExtraLib(libSource, libUri);

        const uri = monaco.Uri.parse(libUri);
        if (!monaco.editor.getModel(uri)) {
            monaco.editor.createModel(libSource, "typescript", uri);
        }
        //  });
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
