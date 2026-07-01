import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// Standalone Dark Station app. Runs on its own, independent of the Dev·Dash app.
// `viteSingleFile` inlines JS/CSS into one self-contained index.html on build,
// so the whole thing can be opened directly in a browser (double-click, no server).
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  server: { host: "127.0.0.1", port: 5174 },
});
