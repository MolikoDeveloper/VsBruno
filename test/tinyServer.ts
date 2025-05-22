import * as Bun from "bun"

Bun.serve({
    port: 9005,
    routes: {
        "/api/posts": {
            GET: () => new Response("List posts"),
            POST: async req => {
                if (!req.body) return new Response("error", { status: 400 })

                try {
                    const js = await req.json()
                    return Response.json(js);
                }
                catch (err: any) {
                    console.error(err)
                    return Response.json(err.message, { status: 500 })
                }
            },
        }
    },

    fetch(req) {
        return new Response("Not Found", { status: 404 });
    },
});