import TimeLineEvent from "./timeline/TimeLineEvent"
import { useTimelineContext } from "src/webview/context/TimeLineProvider"

export default function () {
    const { events } = useTimelineContext();

    return (
        <div className="w-full h-full flex flex-col overflow-y-auto min-h-0 px-2">
            {events.map((event, index) => (
                <TimeLineEvent key={index} ev={event} />
            ))}
        </div>
    )
}