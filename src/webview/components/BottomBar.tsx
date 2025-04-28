import type { ReactNode } from "react"
import pkg from "package.json"
import { useBruContent } from "../context/BruProvider"

interface Props {
    children?: ReactNode
}

export default function ({ children }: Props) {
    const { bruConfig, bruContent } = useBruContent()

    return (
        <div className="bg-[var(--vscode-input-background)] text-[15px] font-bold m-0 px-2 py-1 w-full flex flex-auto">
            <div className="flex gap-1 w-full">
                <a className="cursor-default !text-yellow-600">
                    <abbr title={`URL: ${bruConfig?.data?.presets?.requestUrl}`} className=" decoration-transparent">
                        {bruContent?.meta?.type && `(${bruContent?.meta?.type})`}
                    </abbr>
                </a>
                <a className="cursor-default">{bruConfig?.data?.name && `${bruConfig?.data?.name}`}</a>
                <a className="!text-inherit">/</a>
                <a className="cursor-default !text-green-600">{bruContent?.meta?.name}</a>
                {children}
            </div>
            <p className="cursor-default self-end font-thin">{pkg?.version}</p>
        </div>
    )
}