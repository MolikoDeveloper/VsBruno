import React from './react-global-shim';

export const Fragment = React.Fragment;

export function jsx(type: any, props: any, key?: any) {
    return React.createElement(type, { ...props, key });
}
export const jsxs = jsx;      // para múltiples hijos
export const jsxDEV = jsx;    // modo dev