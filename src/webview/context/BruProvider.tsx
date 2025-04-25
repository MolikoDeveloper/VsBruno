import * as React from "react"
import type { BruCollection, BruFile } from "src/bruno/bruno";


interface BruContextType {
    bruContent: BruFile | null,
    setBruContent: React.Dispatch<React.SetStateAction<BruFile | null>>;
    bruCollection: BruCollection | null,
    setBruCollection: React.Dispatch<React.SetStateAction<BruCollection | null>>
}

const BruContext = React.createContext<BruContextType | undefined>(undefined);

export const BruProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [bruContent, setBruContent] = React.useState<BruFile | null>(null);
    const [bruCollection, setBruCollection] = React.useState<BruCollection | null>(null);

    return (
        <BruContext.Provider value={{ bruContent, setBruContent, bruCollection, setBruCollection }}>
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

