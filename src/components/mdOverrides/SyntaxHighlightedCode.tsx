// SyntaxHighlightedCode.tsx ─────────────────────────────────────────────────
import React from "react";
import { JsonSchemaViewer } from "./JsonSchemaViewer";

type Props = React.ComponentProps<"code">;

export function SyntaxHighlightedCode(props: Props) {
  const cls = props.className ?? "";

  /* ① Solo para ```jsons``` */
  if (cls.includes("lang-jsons") && typeof props.children === "string") {
    try {
      const json = JSON.parse(props.children);
      return <JsonSchemaViewer data={json} />;
    } catch {
      /* Si falla el parseo seguimos al resaltado normal */
    }
  }

  /* ② Highlight.js normal */
  const ref = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (ref.current && cls.includes("lang-") && (window as any).hljs) {
      ref.current.removeAttribute("data-highlighted");
      (window as any).hljs.highlightElement(ref.current);
    }
  }, [cls, props.children]);

  return <code ref={ref} {...props} />;
}
