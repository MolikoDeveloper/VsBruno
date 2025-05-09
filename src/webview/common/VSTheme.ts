import * as monaco from 'monaco-editor'; // o window.monaco si es global

export function applyVscodeTheme() {
    const root = document.documentElement;
    const style = getComputedStyle(root);

    // Mapeo básico de tokens de VSCode
    const theme: monaco.editor.IStandaloneThemeData = {
        base: 'vs-dark', // 'vs', 'vs-dark', or 'hc-black' — usado como fallback
        inherit: true,
        rules: [
            { token: '', foreground: style.getPropertyValue('--vscode-editor-foreground').trim().slice(1) },
            { token: '', background: style.getPropertyValue('--vscode-editor-background').trim().slice(1) },
        ],
        colors: {
            'editor.foreground': style.getPropertyValue('--vscode-editor-foreground').trim(),
            'editor.background': style.getPropertyValue('--vscode-editor-background').trim(),
            'editor.lineHighlightBackground': style.getPropertyValue('--vscode-editor-lineHighlightBackground').trim(),
            'editorCursor.foreground': style.getPropertyValue('--vscode-editorCursor-foreground').trim(),
            'editorWhitespace.foreground': style.getPropertyValue('--vscode-editorWhitespace-foreground').trim(),
        }
    };

    monaco.editor.defineTheme('vscode-theme', theme);
    monaco.editor.setTheme('vscode-theme');
}
