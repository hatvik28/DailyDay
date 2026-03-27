import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "lcov"],
      include: ["src/lib/**/*.ts"],
      exclude: [
        "src/lib/prisma.ts",
        "src/lib/auth*.ts",
        "src/lib/test-runner.ts",
        "src/lib/fitbit.ts",
        "src/lib/fitbit-cache.ts",
        "src/lib/gmail/client.ts",
        "src/lib/gmail/cache.ts",
        "src/**/*.test.*",
        "src/test/**",
        "src/generated/**",
      ],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80,
      },
    },
  },
});
