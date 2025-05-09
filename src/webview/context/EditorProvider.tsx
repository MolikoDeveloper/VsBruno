import { type Dispatch, type ReactNode, type SetStateAction, type FC, createContext, useState, useContext } from "react";

interface EditorInfo {
    themeKind: 1 | 2 | 3,
    setThemeKind: Dispatch<SetStateAction<1 | 2 | 3>>;
}

const EditorConfigContext = createContext<EditorInfo | null>(null)

export const EditorConfigProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [themeKind, setThemeKind] = useState<1 | 2 | 3>(2);

    return (
        <EditorConfigContext.Provider value={{ themeKind, setThemeKind }}>
            {children}
        </EditorConfigContext.Provider>
    )
}

export const useEditorConfig = () => {
    const context = useContext(EditorConfigContext)
    if (!context)
        throw new Error("UseEditorConfig must be used within a EditorConfigContext");

    return context;
}