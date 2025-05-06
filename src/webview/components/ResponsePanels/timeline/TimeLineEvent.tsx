import { useEffect, useMemo, useState } from "react"
import type { TimelineEvent_t } from "src/types/shared"

export default function ({ ev }: { ev: TimelineEvent_t }) {
    const [currentDate] = useState(new Date())
    const ago = useTimeAgo(ev.date)

    const ok = ev.ok ? "text-green-500 font-bold" : "text-red-500 font-bold"

    return (
        <div className="min-h-fit">
            <div className="border-b-2 border-amber-700/50 py-2">
                <div className="cursor-pointer">
                    <div className="flex justify-between items-center min-w-0">
                        <div className="flex items-center space-x-2 min-w-0">
                            <span className={ok}>{ev.status}</span>
                            <span className={ok}>{ev.method}</span>
                            <span className="text-gray-500 font-bold"></span>
                            <pre className="opacity-70">{`[${ev.date?.toLocaleDateString()} ${ev.date?.toLocaleTimeString()}]`}</pre>
                        </div>
                        <span className="text-sm text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap">
                            <pre className="text-xs">{ago}</pre>
                        </span>
                    </div>
                    <div className="text-sm pt-1 break-all">
                        {ev.url}
                    </div>
                </div>
            </div>
        </div>
    )
}
function calcTimeAgo(from?: Date, to?: Date): string {
    if (!from) return ""
    if (!to) return ""
    const diff = to.getTime() - from.getTime()
    const seconds = Math.floor(diff / 1000)
    if (seconds < 60) return `${seconds} second${seconds !== 1 ? "s" : ""} ago`

    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`

    const days = Math.floor(hours / 24)
    if (days < 30) return `${days} day${days !== 1 ? "s" : ""} ago`

    const months = Math.floor(days / 30)
    if (months < 12) return `${months} month${months !== 1 ? "s" : ""} ago`

    const years = Math.floor(months / 12)
    return `${years} year${years !== 1 ? "s" : ""} ago`
}

export function useTimeAgo(date?: Date | string): string {
    if (!date) return "";
    // forzamos un estado para disparar re-render cada minuto
    const [now, setNow] = useState(() => new Date())

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1_000)
        return () => clearInterval(id)
    }, [])

    return useMemo(() => {
        const eventDate = date instanceof Date ? date : new Date(date)
        return calcTimeAgo(eventDate, now)
    }, [date, now])
}