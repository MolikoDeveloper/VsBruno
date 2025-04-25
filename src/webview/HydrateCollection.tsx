import { createRoot } from "react-dom/client";
import { BruProvider } from "src/webview/context/BruProvider";
import App_Collection from "./App_Collection";

const container = document.getElementById("root");

if (container)
    createRoot(container).render(
        <BruProvider>
            <App_Collection></App_Collection>
        </BruProvider>
    )