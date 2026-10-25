import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A imagem Docker roda o .next/standalone: só o que o servidor usa, sem o
  // node_modules inteiro.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
