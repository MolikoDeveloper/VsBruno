// src/react-dom-unified.ts
import * as ReactDOM from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';
import type { Root, RootOptions } from 'react-dom/client';

// Métodos modernos de client
type ClientMethod = 'createRoot' | 'hydrateRoot';

export interface ReactDOMUnified extends typeof ReactDOM {
    createRoot(container: Element, options ?: RootOptions): Root;
    hydrateRoot(container: Element, children: React.ReactNode, options ?: RootOptions): Root;
}

// 1) Mezclamos API legacy + client
const ReactDOMUnified = {
    ...ReactDOM,
    createRoot: ReactDOMClient.createRoot,
    hydrateRoot: ReactDOMClient.hydrateRoot,
} as ReactDOMUnified;

// 2) Forzamos la global
if (typeof window !== 'undefined') {
    // TS-hint para que no proteste
    (window as any).ReactDOM = ReactDOMUnified;
}

// 3) Exportamos
export default ReactDOMUnified;
export const {
    createRoot,
    hydrateRoot,
    render,
    findDOMNode,
    // …otros que necesites
} = ReactDOMUnified;
