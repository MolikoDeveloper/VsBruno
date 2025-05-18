import { createRoot } from "react-dom/client";
import { BruProvider } from "src/webview/context/BruProvider";
import App from "./App";
import { TimelineProvider } from "./context/TimeLineProvider";
import { EditorConfigProvider } from "./context/EditorProvider";
import { loader } from "@monaco-editor/react";
import { EditorScriptsProvider } from "./context/scriptsProvider";

loader.config({
    paths: { vs: (globalThis as any).MONACO_BASE_PATH },
});

const container = document.getElementById("root");

if (container) {
    (globalThis as any).__BRUNO_ROOT__ ??= createRoot(container);
    (globalThis as any).__BRUNO_ROOT__.render(
        <EditorScriptsProvider>
            <EditorConfigProvider>
                <BruProvider>
                    <TimelineProvider>
                        <App />
                    </TimelineProvider>
                </BruProvider>
            </EditorConfigProvider>
        </EditorScriptsProvider>
    );
}