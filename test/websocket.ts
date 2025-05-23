

const server = Bun.serve({
    fetch(req, server) {
        const success = server.upgrade(req);
        if (success) {
            // Bun automatically returns a 101 Switching Protocols
            // if the upgrade succeeds
            return undefined;
        }

        // handle HTTP request normally
        return new Response("Hello world!");
    },
    websocket: {
        // this is called when a message is received
        async message(ws, message) {
            console.log(`Received ${message}`);
            // send back a message
            ws.send(`You said: ${message}`);
        },
        "sendPings": true,
        open(ws) {
            ws.send("websocket Open!");
        }
    },
});

console.log(`Listening on ${server.hostname}:${server.port}`);