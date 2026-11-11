import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", setupFiles: [fileURLToPath(new URL("./tests/setup.ts", import.meta.url))], globals: true, include: ["tests/unit/**/*.test.{ts,tsx}"], coverage: { provider: "v8", reporter: ["text", "html"], include: ["src/components/**/*.tsx", "src/lib/brands.ts"] } },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)), "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)) } },
});
