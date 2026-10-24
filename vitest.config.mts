import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const fromRoot = (relativePath: string) =>
  fileURLToPath(new URL(relativePath, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": fromRoot("./src"),
      // O Next resolve `server-only` sozinho; fora dele, o import vira um módulo vazio.
      "server-only": fromRoot("./tests/support/server-only.ts"),
    },
  },
  test: {
    // Testes de unidade ficam ao lado do código; os do Playwright, em tests/e2e.
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
    restoreMocks: true,
    unstubEnvs: true,
  },
});
