import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    svelte({
      hot: !process.env.VITEST,
    }),
  ],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/tests/setup.ts"],
    include: ["src/**/*.{test,spec}.{js,ts}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/tests/setup.ts",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData",
        "build/",
      ],
    },
  },
  resolve: {
    alias: {
      $lib: resolve(__dirname, "./src/lib"),
    },
    conditions: ["browser"],
  },
});
