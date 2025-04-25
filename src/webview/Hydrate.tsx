import { createRoot } from "react-dom/client";
import { BruProvider } from "src/webview/context/BruProvider";
import App from "./App";

const container = document.getElementById("root");

if (container)
    createRoot(container).render(
        <BruProvider>
            <App></App>
        </BruProvider>
    )