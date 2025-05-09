
import { acceptCompletion, autocompletion, completionKeymap, completionStatus } from "@codemirror/autocomplete";
import { completeFromList } from "@codemirror/autocomplete";
import { indentWithTab } from "@codemirror/commands";
import type { Completion, CompletionInfo } from "@codemirror/autocomplete";
import { keymap } from "@codemirror/view";
import headers from "src/common/headers.json"
import { createRoot } from "react-dom/client";

const container = document.createElement("div");
const root = createRoot(container);

const header = headers.map((d, key) => ({
    label: d.label,
    info: (com: Completion): CompletionInfo | Promise<CompletionInfo> => {
        root.render(<div key={key}>
            <div>{d.info}</div>
            <a href={d.detail}>[see details]</a>
        </div>
        );
        return {
            dom: container,

        }
    }
}))

const headerCompletion = completeFromList(header);  // :contentReference[oaicite:0]{index=0}

const tabAcceptCompletion = keymap.of([{
    key: "Tab",
    preventDefault: true,
    run(view) {
        const status = completionStatus(view.state);
        if (status === "active" || status === "pending") {
            return acceptCompletion(view);
        }
        return false;
    }
}]);

export const headersAutocomplete = [
    tabAcceptCompletion,
    keymap.of(completionKeymap),                 // atajos básicos (Ctrl+Espacio, ⬆/⬇, Enter…)
    autocompletion({
        override: [headerCompletion],              // sólo estas opciones
        activateOnTyping: true,                    // muestra en cuanto el usuario escribe
        maxRenderedOptions: 20
    })
];


