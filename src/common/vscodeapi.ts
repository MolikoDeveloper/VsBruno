// src/vscodeApi.ts
export const vscode = acquireVsCodeApi<{
    activetab?: {
        active_L_Tab?: string;
        active_R_Tab?: string;
    };
    panelSize?: {
        rightWidth?: number;
    };
    collapsedSchemas?: string[];
}>();