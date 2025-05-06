import { useBruContent } from 'src/webview/context/BruProvider';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';

export default function () {
    const { bruContent, setBruContent } = useBruContent();

    return (
        <section className="flex flex-col flex-1 overflow-hidden pb-4">
            {/* ───── Pre Request ───── */}
            <div className="flex flex-col flex-1 min-h-0 mt-2 gap-y-2">
                <p className="text-xs text-[--var(--vscode-tab-inactiveForeground)]">
                    Pre Request
                </p>
                <CodeMirror
                    className="flex-1"
                    value={bruContent?.script?.req}
                    extensions={[javascript()]}
                    theme="dark"
                    lang="javascript"
                    height="100%"
                    onChange={val =>
                        setBruContent(prev => ({
                            ...prev,
                            script: { ...prev?.script!, req: val.trim() }
                        }))
                    }
                />
            </div>

            {/* ───── Post Response ───── */}
            <div className="flex flex-col flex-1 min-h-0 mt-2 gap-y-2">
                <p className="text-xs text-[--var(--vscode-tab-inactiveForeground)]">
                    Post Response
                </p>
                <CodeMirror
                    className="flex-1"
                    value={bruContent?.script?.res}
                    extensions={[javascript()]}
                    theme="dark"
                    lang="javascript"
                    height="100%"
                    onChange={val =>
                        setBruContent(prev => ({
                            ...prev,
                            script: { ...prev?.script!, res: val.trim() }
                        }))
                    }
                />
            </div>
        </section>
    );
}
