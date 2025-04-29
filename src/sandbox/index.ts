// src/sandbox/index.ts
import type { Sandbox } from "./types";
import { SandboxNode } from "./SandboxNode";
//import { SandboxWeb } from "./SandboxWeb";

export const SandboxImpl: Sandbox =
    typeof process !== "undefined" && !!process.versions?.node
        ? new SandboxNode()
        : new SandboxNode();
