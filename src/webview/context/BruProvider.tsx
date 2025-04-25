import * as React from "react"
import type { BruFile } from "src/bruno/bruno";


interface BruContextType {
    bruContent: BruFile,
    setBruContent: React.Dispatch<React.SetStateAction<BruFile>>;
}

const BruContext = React.createContext<BruContextType | undefined>(undefined);

export const BruProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [bruContent, setBruContent] = React.useState<BruFile>({});

    return (
        <BruContext.Provider value={{ bruContent, setBruContent }}>
            {children}
        </BruContext.Provider>
    )
}

export const useBruContent = () => {
    const context = React.useContext(BruContext);
    if (!context)
        throw new Error("useBruContent must be used within a BruProvider");

    return context;
}

