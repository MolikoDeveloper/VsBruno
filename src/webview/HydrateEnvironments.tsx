import { createRoot } from "react-dom/client";
import { BruProvider } from "src/webview/context/BruProvider";
import App_Environments from "./App_Environments";


const container = document.getElementById("root");

if (container)
    createRoot(container).render(
        <BruProvider>
            <App_Environments />
        </BruProvider>
    )