import * as Bun from "bun"

Bun.serve({
    routes: {
        "/api/posts": {
            GET: () => new Response("List posts"),
            POST: async req => {
                if (!req.body) return new Response("error", { status: 400 })
                const body = await req.json();
                return Response.json(body);
            },
        }
    },

    fetch(req) {
        return new Response("Not Found", { status: 404 });
    },
});