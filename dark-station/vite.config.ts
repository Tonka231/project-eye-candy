import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Standalone Dark Station app. Runs on its own, independent of the Dev·Dash app.
export default defineConfig({
  plugins: [react()],
  server: { host: "127.0.0.1", port: 5174 },
});
