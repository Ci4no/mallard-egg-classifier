import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/** Client-only production build for Hostinger Apache + PHP hosting. */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": resolve(import.meta.dirname, "src") },
    tsconfigPaths: true,
  },
  build: {
    outDir: ".output/hostinger-public",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(import.meta.dirname, "hosting/index.html"),
    },
  },
});
