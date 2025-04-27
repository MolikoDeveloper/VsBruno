// src/sandbox/index.ts
import { SandboxNode } from "./BrunoSandboxNode";
import { SandboxWeb } from "./BrunoSandboxWeb";
import { type Sandbox } from "./types";

export const SandboxImpl: Sandbox =
  typeof process === "object" && !!process.versions?.node
    ? new SandboxNode
    : new SandboxWeb;
