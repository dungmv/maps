import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: '/',
  build: {
    outDir: "dist",
  },
  optimizeDeps: {
    exclude: ["maplibre-gl"],
  },
  plugins: [tailwindcss()],
});
