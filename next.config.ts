import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A imagem Docker roda o .next/standalone: só o que o servidor usa, sem o
  // node_modules inteiro.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  poweredByHeader: false,
  // As páginas do site moram com a barra no fim (`/pt/`). Por padrão, o Next
  // tira a barra; com `trailingSlash: true`, ele a poria em tudo, inclusive no
  // `/api/health`, que o healthcheck do servidor chama sem a barra e que nunca
  // pode ser redirecionado. Então o Next não redireciona nada, e o proxy
  // acrescenta a barra só nas páginas dos idiomas.
  skipTrailingSlashRedirect: true,
  // Os geradores do currículo rodam com o `require` do Node, fora do bundle:
  // o pdfkit lê arquivos de dados ao lado do próprio código.
  serverExternalPackages: ["pdfkit", "docx"],
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
