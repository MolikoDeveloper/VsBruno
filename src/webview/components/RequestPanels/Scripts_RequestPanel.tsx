import { useBruContent } from "src/webview/context/BruProvider";
import MonacoBruno from "./utils/MonacoBruno";

export default function () {
    const { bruContent, setBruContent } = useBruContent();

    return (
        <section className="flex flex-col flex-1 overflow-hidden pb-4">
            {/* ───── Pre Request ───── */}
            <div className="flex flex-col flex-1 min-h-0 mt-2 gap-y-2">
                <p className="text-xs text-[--var(--vscode-tab-inactiveForeground)]">
                    Pre Request
                </p>
                <MonacoBruno
                    value={bruContent?.script?.req || ""}
                    context="req"
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
                    context="res"
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
