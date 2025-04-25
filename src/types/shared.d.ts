export interface SerializedResponse<TBody = unknown> {
    ok: boolean;
    status: number;
    statusText: string;
    url: string;

    headers: Record<string, string>;

    parsedAs: "json" | "text" | "binary";

    body: TBody;
}
