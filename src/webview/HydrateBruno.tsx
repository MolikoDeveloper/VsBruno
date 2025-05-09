import { createRoot } from "react-dom/client";
import { BruProvider } from "src/webview/context/BruProvider";
import App from "./App";
import { TimelineProvider } from "./context/TimeLineProvider";
import { EditorConfigProvider } from "./context/EditorProvider";

const container = document.getElementById("root");

if (container)
    createRoot(container).render(
        <EditorConfigProvider>
            <BruProvider>
                <TimelineProvider>
                    <App></App>
                </TimelineProvider>
            </BruProvider>
        </EditorConfigProvider>
    )