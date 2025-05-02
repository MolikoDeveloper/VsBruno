import { SandboxNode } from "./SandboxNode";
import { SandboxWeb } from "./SandboxWeb";
import type { Sandbox } from "./types";

export const SandboxImpl: Sandbox =
  typeof window === "undefined" ? SandboxNode : SandboxWeb;
