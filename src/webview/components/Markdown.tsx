import { type HTMLAttributes } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

interface MarkdownProps extends HTMLAttributes<HTMLDivElement> {
    children?: string;
}

/**
 * Componente Markdown usando marked + DOMPurify para sanitizar.
 *
 * Uso:
 * <Markdown className="my-md" style={{...}}># Hola</Markdown>
 */
export function Markdown({ children = "", className, style }: MarkdownProps) {
    // Convertimos Markdown a HTML con marked
    const rawHtml = marked(children).toString();

    // Sanitizamos el HTML con DOMPurify
    const sanitizedHtml = DOMPurify.sanitize(rawHtml);

    return (
        <div
            className={`markdown ${className}`}
            style={style}
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
    );
}

export default Markdown;
