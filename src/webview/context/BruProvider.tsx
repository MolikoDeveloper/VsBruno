import { createContext, useContext, useState, type Dispatch, type FC, type ReactNode, type SetStateAction } from "react";
import type { BruFile, BruCollection, BruEnvFile } from "src/types/bruno/bruno";
import type { BrunoConfig } from "src/types/bruno/bruno.config";
import type { SerializedResponse } from "src/types/shared";


interface BruContextType {
    bruContent: BruFile | null,
    setBruContent: Dispatch<SetStateAction<BruFile | null>>;
    bruCollection: BruCollection | null,
    setBruCollection: Dispatch<SetStateAction<BruCollection | null>>,
    bruConfig: BrunoConfig | null,
    setBruConfig: Dispatch<SetStateAction<BrunoConfig | null>>,
    bruEnvironment: BruEnvFile | null,
    setBruEnvironment: Dispatch<SetStateAction<BruEnvFile | null>>,
    bruResponse: SerializedResponse | null,
    setBruResponse: Dispatch<SetStateAction<SerializedResponse | null>>,
}

const BruContext = createContext<BruContextType | undefined>(undefined);

export const BruProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [bruContent, setBruContent] = useState<BruFile | null>(null);
    const [bruCollection, setBruCollection] = useState<BruCollection | null>(null);
    const [bruConfig, setBruConfig] = useState<BrunoConfig | null>(null);
    const [bruEnvironment, setBruEnvironment] = useState<BruEnvFile | null>(null);
    const [bruResponse, setBruResponse] = useState<SerializedResponse | null>(null);

    return (
        <BruContext.Provider value={{ bruContent, setBruContent, bruCollection, setBruCollection, bruConfig, setBruConfig, bruEnvironment, setBruEnvironment, bruResponse, setBruResponse }}>
            {children}
        </BruContext.Provider>
    )
}

export const useBruContent = () => {
    const context = useContext(BruContext);
    if (!context)
        throw new Error("useBruContent must be used within a BruProvider");

    return context;
}

