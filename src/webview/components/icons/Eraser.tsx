
export default function ({ width, height }: { width?: number, height?: number }) {
    return <svg
        xmlns="http://www.w3.org/2000/svg"
        width={width ?? 16}
        height={height ?? 16}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        className="icon icon-tabler icon-tabler-eraser"
        viewBox="0 0 24 24"
    >
        <path stroke="none" d="M0 0h24v24H0z" />
        <path d="M19 20H8.5l-4.21-4.3a1 1 0 0 1 0-1.41l10-10a1 1 0 0 1 1.41 0l5 5a1 1 0 0 1 0 1.41L11.5 20M18 13.3 11.7 7" />
    </svg>
}

