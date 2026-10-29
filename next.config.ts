import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A imagem Docker roda o .next/standalone: só o que o servidor usa, sem o
  // node_modules inteiro.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  poweredByHeader: false,
  // Os geradores do currículo rodam com o `require` do Node, fora do bundle:
  // o pdfkit lê arquivos de dados ao lado do próprio código.
  serverExternalPackages: ["pdfkit", "exceljs"],
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
