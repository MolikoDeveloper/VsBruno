// src/sandbox/index.ts
import { BrunoSandboxNode } from "./BrunoSandboxNode.js";
import { BrunoSandboxWeb } from "./BrunoSandboxWeb.js";
import type { Sandbox } from "./types";

export const SandboxImpl: Sandbox =
    typeof process === "object" && process.versions?.node
        ? new BrunoSandboxNode()
        : new BrunoSandboxWeb();
