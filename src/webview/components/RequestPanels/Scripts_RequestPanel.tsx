import { useBruContent } from "src/webview/context/BruProvider"
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';

export default function () {
    const { bruContent, setBruContent } = useBruContent()

    return (
        <section className="flex w-full flex-[1]">
            <div className="w-full flex flex-col">
                <div className="flex flex-col flex-[1] mt-2 gap-y-2">
                    <p className="text-xs text-[--var(--vscode-tab-inactiveForeground)]">Pre Request</p>
                    <div className="h-full w-full flex flex-col relative">
                        <CodeMirror value={bruContent?.script?.req} extensions={[javascript()]} theme={'dark'} lang='json' height="35vh" onChange={(val, viewUpdate) => { setBruContent(prev => ({ ...prev, script: { ...prev?.script!, req: val.trim() } })) }} />
                    </div>
                </div>
                <div className="flex flex-col flex-[1] mt-2 gap-y-2">
                    <p className="text-xs text-[--var(--vscode-tab-inactiveForeground)]">Post Response</p>
                    <div className="h-full w-full flex flex-col relative">
                        <CodeMirror value={bruContent?.script?.res} extensions={[javascript()]} theme={'dark'} lang='json' height="35vh" onChange={(val, viewUpdate) => { setBruContent(prev => ({ ...prev, script: { ...prev?.script!, res: val.trim() } })) }} />
                    </div>
                </div>
            </div>
        </section>
    )
}