import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    test: {
      setupFiles: ["./src/tests/setup.ts"],
      environment: "node",
      fileParallelism: false,
      env: env,
    },
  };
});
