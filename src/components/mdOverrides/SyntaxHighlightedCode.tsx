import * as React from 'react';

type Props = React.ComponentProps<'code'>;

export function SyntaxHighlightedCode(props: Props) {
  const ref = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (el && props.className?.includes('lang-') && (window as any).hljs) {
      // Quitar la marca para forzar a hljs a rehacer el resaltado
      el.removeAttribute('data-highlighted');
      (window as any).hljs.highlightElement(el);
    }
  }, [props.className, props.children]);

  return <code ref={ref} {...props} />;
}
