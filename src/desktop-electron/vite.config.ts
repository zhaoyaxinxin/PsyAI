import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(currentDir, "..");

export default defineConfig({
  base: "",
  plugins: [react()],
  root: "src/renderer",
  build: {
    outDir: path.resolve(currentDir, "dist", "renderer"),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@psyai/frontend": path.resolve(srcDir, "frontend", "src"),
      "@psyai/app-state": path.resolve(srcDir, "app-state", "src"),
      "@psyai/contracts": path.resolve(srcDir, "contracts", "src"),
      "@psyai/shared": path.resolve(srcDir, "shared", "src"),
      "@psyai/counseling": path.resolve(srcDir, "counseling", "src"),
      "@psyai/simulation": path.resolve(srcDir, "simulation", "src"),
      "@psyai/resonance": path.resolve(srcDir, "resonance", "src"),
      "@psyai/reporting": path.resolve(srcDir, "reporting", "src"),
      "@psyai/runtime": path.resolve(srcDir, "runtime", "src"),
      "@psyai/backend": path.resolve(srcDir, "backend", "src"),
    },
  },
});
