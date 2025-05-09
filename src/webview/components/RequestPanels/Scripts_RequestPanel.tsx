import { useBruContent } from "src/webview/context/BruProvider";
import MonacoBruno from "./utils/MonacoBruno";
import { useEditorConfig } from "src/webview/context/EditorProvider";

export default function () {
    const { bruContent, setBruContent } = useBruContent();
    const { themeKind } = useEditorConfig()

    return (
        <section className="flex flex-col flex-1 overflow-hidden pb-4">
            {/* ───── Pre Request ───── */}
            <div className="flex flex-col flex-1 min-h-0 mt-2 gap-y-2">
                <p className="text-xs text-[--var(--vscode-tab-inactiveForeground)]">
                    Pre Request
                </p>
                <MonacoBruno
                    value={bruContent?.script?.req || ""}
                    path="file:///pre/index.ts"
                    globals={`declare const bru: any; declare const req: string;`}
                    theme={themeKind === 2 ? "vs-dark" : themeKind === 1 ? "vs" : "hc-black"}
                    monacoBasePath={(globalThis as any).MONACO_BASE_PATH} // inyectado desde global o desde el provider
                    onChange={(val) =>
                        setBruContent(prev => ({
                            ...prev,
                            script: { ...prev?.script!, req: val },
                        }))
                    }
                />
            </div>

            {/* ───── Post Response ───── */}
            <div className="flex flex-col flex-1 min-h-0 mt-2 gap-y-2">
                <p className="text-xs text-[--var(--vscode-tab-inactiveForeground)]">
                    Post Response
                </p>
                <MonacoBruno
                    value={bruContent?.script?.res || ""}
                    path="file:///post/index.ts"
                    globals={`declare const bru: any; declare const req: string; declare const res: string;`}
                    theme={themeKind === 2 ? "vs-dark" : themeKind === 1 ? "vs" : "hc-black"}
                    monacoBasePath={(globalThis as any).MONACO_BASE_PATH} // inyectado desde global o desde el provider
                    onChange={(val) =>
                        setBruContent(prev => ({
                            ...prev,
                            script: { ...prev?.script!, res: val },
                        }))
                    }
                />
            </div>
        </section>
    );
}
