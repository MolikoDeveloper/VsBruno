import type { ReactNode } from "react"

interface Props {
    children: ReactNode
}

export default function ({ children }: Props) {
    return <div className="bg-[var(--vscode-input-background)] text-[15px] font-bold flex gap-1 m-0 px-2 py-1">
        {children}
    </div>
}