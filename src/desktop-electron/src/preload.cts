import { contextBridge, ipcRenderer } from "electron";
import type { PsyAiBridge, PsyAiHostAction } from "./host-actions.js";

const bridge: PsyAiBridge = {
  getPageViewModel() {
    return ipcRenderer.invoke("psyai:getPageViewModel");
  },
  invokeAction(action: PsyAiHostAction) {
    return ipcRenderer.invoke("psyai:invokeAction", action);
  },
  onStateChanged(callback) {
    ipcRenderer.on("psyai:stateChanged", (_event, viewModel) => callback(viewModel));
  },
  invoke(channel: string, ...args: unknown[]) {
    return ipcRenderer.invoke(channel, ...args);
  },
  on(channel: string, callback: (...args: unknown[]) => void) {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  }
};

contextBridge.exposeInMainWorld("psyai", bridge);
