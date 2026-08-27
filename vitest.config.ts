import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    __DEV__: true,
  },
  test: {
    setupFiles: ["./vitest.setup.ts"],
    server: {
      deps: {
        inline: ["expo"],
      },
    },
  },
});
