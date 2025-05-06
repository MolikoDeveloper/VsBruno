import { createRoot } from "react-dom/client";
import { BruProvider } from "src/webview/context/BruProvider";
import App from "./App";
import { TimelineProvider } from "./context/TimeLineProvider";

if (typeof ''.toLowerCase !== 'function') {
    Object.defineProperty(String.prototype, 'toLowerCase', {
        value() {
            return String(this).replace(/[A-Z]/g, c => c.toLocaleLowerCase());
        },
        configurable: true,
        writable: true,
    });
}

const container = document.getElementById("root");

if (container)
    createRoot(container).render(
        <BruProvider>
            <TimelineProvider>
                <App></App>
            </TimelineProvider>
        </BruProvider>
    )