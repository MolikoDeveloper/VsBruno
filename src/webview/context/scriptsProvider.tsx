import { createContext, useContext, useState, type Dispatch, type FC, type ReactNode, type SetStateAction } from "react"
import type { WorkSpaceScripts } from "src/types/shared"

interface EditorScripts {
    scripts: WorkSpaceScripts[],
    setScripts: Dispatch<SetStateAction<WorkSpaceScripts[]>>
}

const EditorScriptsContext = createContext<EditorScripts | null>(null)

export const EditorScriptsProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [scripts, setScripts] = useState<WorkSpaceScripts[]>([])
    return <EditorScriptsContext.Provider value={{ scripts, setScripts }}>
        {children}
    </EditorScriptsContext.Provider>
}

export const useWorkspaceScripts = () => {
    const context = useContext(EditorScriptsContext);

    if (!context) throw new Error("useWorkspaceScripts must be used within a EditorScriptsContext");

    return context;
}