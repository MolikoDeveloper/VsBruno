import * as React from "react"
import type { BruFile, BruCollection, BruEnvFile } from "src/types/bruno/bruno";
import type { BrunoConfig } from "src/types/bruno/bruno.config";


interface BruContextType {
    bruContent: BruFile | null,
    setBruContent: React.Dispatch<React.SetStateAction<BruFile | null>>;
    bruCollection: BruCollection | null,
    setBruCollection: React.Dispatch<React.SetStateAction<BruCollection | null>>,
    bruConfig: BrunoConfig | null,
    setBruConfig: React.Dispatch<React.SetStateAction<BrunoConfig | null>>,
    bruEnvironment: BruEnvFile | null,
    setBruEnvironment: React.Dispatch<React.SetStateAction<BruEnvFile | null>>,
}

const BruContext = React.createContext<BruContextType | undefined>(undefined);

export const BruProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [bruContent, setBruContent] = React.useState<BruFile | null>(null);
    const [bruCollection, setBruCollection] = React.useState<BruCollection | null>(null);
    const [bruConfig, setBruConfig] = React.useState<BrunoConfig | null>(null);
    const [bruEnvironment, setBruEnvironment] = React.useState<BruEnvFile | null>(null);

    return (
        <BruContext.Provider value={{ bruContent, setBruContent, bruCollection, setBruCollection, bruConfig, setBruConfig, bruEnvironment, setBruEnvironment }}>
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

