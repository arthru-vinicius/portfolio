import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A imagem Docker roda o .next/standalone: só o que o servidor usa, sem o
  // node_modules inteiro.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  poweredByHeader: false,
  experimental: {
    // Com duas raízes de layout (o site por idioma e o painel), não há um
    // layout de onde montar o 404; o `global-not-found.tsx` é a saída que a
    // documentação do Next indica para esse caso.
    globalNotFound: true,
  },
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
