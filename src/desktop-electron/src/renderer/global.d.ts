import type { PsyAiBridge } from "../host-actions.js";

declare global {
  interface Window {
    psyai?: PsyAiBridge;
  }
}

export {};
