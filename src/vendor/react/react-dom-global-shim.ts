// src/webview/shims/react-dom-global-shim.ts
const ReactDOM = (window as any).ReactDOM as typeof import('react-dom');
const ClientDOM = (window as any).ReactDOMClient as typeof import('react-dom/client');

export default ClientDOM ?? ReactDOM;   // por si acaso

export const createRoot = ClientDOM?.createRoot ?? (() => { throw new Error('createRoot missing'); });
export const hydrateRoot = ClientDOM?.hydrateRoot ?? (() => { throw new Error('hydrateRoot missing'); });
