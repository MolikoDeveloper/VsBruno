import * as React from "react"
import type { TimelineEvent_t } from "src/types/shared";


interface TimelineContextType {
    events: TimelineEvent_t[],
    setEvents: React.Dispatch<React.SetStateAction<TimelineEvent_t[]>>;
}

const TimelineContext = React.createContext<TimelineContextType | undefined>(undefined);

export const TimelineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [events, setEvents] = React.useState<TimelineEvent_t[]>([]);

    return (
        <TimelineContext.Provider value={{ events, setEvents }}>
            {children}
        </TimelineContext.Provider>
    )
}

export const useTimelineContext = () => {
    const context = React.useContext(TimelineContext);
    if (!context)
        throw new Error("useTimelineContext must be used within a TimelineProvider");

    return context;
}

