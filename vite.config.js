import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  define: process.env.VITEST === "true"
    ? {
        "import.meta.env.VITE_DATA_MODE": JSON.stringify("demo"),
        "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(""),
        "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(""),
      }
    : {},
  plugins: [react(), tailwindcss()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
    restoreMocks: true,
    clearMocks: true,
  },
});
