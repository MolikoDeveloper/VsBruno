import { useBruContent } from "src/webview/context/BruProvider"

const authOptions = [
    {
        name: "AWS Sig v4",
        key: "awsv4",
        active: false
    },
    {
        name: "Basic Auth",
        key: "basic",
        active: false
    },
    {
        name: "Bearer Token",
        key: "bearer",
        active: false
    },
    {
        name: "Digest Auth",
        key: "digest",
        active: false
    },
    {
        name: "NTLM Auth",
        key: "ntlm",
        active: false
    },
    {
        name: "OAuth 2.0",
        key: "oauth2",
        active: false
    },
    {
        name: "WSSE Auth",
        key: "wsse",
        active: false
    },
    {
        name: "API Key",
        key: "apikey",
        active: false
    },
    {
        name: "Inherit",
        key: "inherit",
        active: false
    },
    {
        name: "No Auth",
        key: "none",
        active: true
    },
]

export default function () {
    const { bruContent } = useBruContent()

    return <section className="flex w-full flex-1">
        <div className="w-full mt-1 overflow-y-scroll">
            <div className="flex flex-grow items-center justify-start">
                <select className="bg-transparent text-amber-400 py-1 [&>*]:bg-[var(--vscode-input-background)]" defaultValue={"none"} value={bruContent?.http?.auth} style={{ outline: 0 }}>
                    {authOptions.map((a, i) => (
                        <option value={a.key} className={`text-[var(--vscode-tab-activeForeground)] ${!a.active && "text-red-400"}`}>{a.name}</option>
                    ))}
                </select>
            </div>
        </div>
    </section>
}