import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./vitest.setup.ts"],
    // Integration tests share one MySQL/Redis test instance - running them
    // concurrently would race on the same rows during the truncate-and-seed
    // cycle each test relies on.
    fileParallelism: false,
  },
});
