// @ts-ignore
const React = (window as any).React as typeof import("react");

export default React;
export const {
    // Núcleo
    Children,
    Component,
    PureComponent,
    Fragment,
    StrictMode,
    Suspense,
    // APIs de creación / comprobación
    createElement,
    cloneElement,
    isValidElement,
    // Contexto y refs
    createContext,
    createRef,
    forwardRef,
    useImperativeHandle,
    // Hooks básicos
    useState,
    useReducer,
    useEffect,
    useLayoutEffect,
    useInsertionEffect,
    useCallback,
    useMemo,
    useRef,
    useContext,
    // Hooks avanzados (18+)
    useDebugValue,
    useDeferredValue,
    useTransition,
    startTransition,
    useId,
    useSyncExternalStore,
    // Utilidades
    memo,
    lazy
} = React;