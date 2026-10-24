import type { NextConfig } from "next";

/**
 * Único host indexável. Qualquer outro (a homologação, ou o `127.0.0.1` do
 * healthcheck) recebe `noindex`, para a busca nunca indexar uma cópia do site.
 */
const CANONICAL_HOST = "arthru.com";

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
  async headers() {
    return [
      {
        source: "/:path*",
        // O valor é uma expressão regular: o ponto precisa de escape.
        missing: [
          { type: "host", value: CANONICAL_HOST.replaceAll(".", "\\.") },
        ],
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
    ];
  },
};

export default nextConfig;
