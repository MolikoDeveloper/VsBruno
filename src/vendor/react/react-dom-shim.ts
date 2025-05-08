const ReactDOMClientGlobal = (window as any).ReactDOM as typeof import("react-dom/client");

export default ReactDOMClientGlobal;

export const {
    createRoot,
    hydrateRoot
} = ReactDOMClientGlobal;