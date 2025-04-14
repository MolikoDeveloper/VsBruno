import * as React from "react";
import { createRoot } from "react-dom/client";

function App() {
    const [documentText, setDocumentText] = React.useState("");
    // Listen for messages from extension
    React.useEffect(() => {
        window.addEventListener("message", (event) => {
            const message: { type: "open" | "update", text: string } = event.data;
            console.log('bru:', message.type)
            if (message.type === "update" || message.type === 'open') {
                setDocumentText(message.text);
            }
        });
        // request the initial doc text from extension
        acquireVsCodeApi().postMessage({ type: "loaded" });
    }, []);

    // Parse the .bru text here or show a custom interface
    // ...
    // If user modifies something, send back to extension:
    const sendEdit = () => {
        const vsCode = acquireVsCodeApi(); // global
        vsCode.postMessage({ type: "edit", text: "..." });
    };

    return (
        <div>
            <h1>Bruno File Editor</h1>
            <p>Document text is:</p>
            <pre>{documentText}</pre>
            {/* Provide custom UI elements for user to modify content */}
            <button onClick={sendEdit}>Save changes</button>
        </div>
    );
}

const container = document.getElementById("root");
if (container) {
    createRoot(container).render(<App />);
}
