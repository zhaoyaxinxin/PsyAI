import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));

export const desktopElectronRoot = path.resolve(moduleDirectory, "..");
export const projectRoot = path.resolve(desktopElectronRoot, "..", "..");
export const dataDirectory = path.join(projectRoot, "data");
export const task12LibraryRoot = path.join(projectRoot, "架构约束", "task12", "设定库");
