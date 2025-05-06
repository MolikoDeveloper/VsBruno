export interface SerializedResponse<TBody = unknown> {
    ok: boolean;
    status: number;
    statusText: string;
    url: string;

    headers: Record<string, string>;

    parsedAs: "json" | "text" | "binary";

    body: TBody;
}

type TimelineEvent_t = {
    ok: boolean;
    status?: number,
    date?: Date
    url?: string
    method?: string,
    statusText?: string
}