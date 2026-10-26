import type { Metadata } from "next";

import { adminMessages } from "@/i18n/admin";

import "../globals.css";

/** Metadados de todo o painel: fora da busca, com o título do painel. */
export const metadata: Metadata = {
  title: {
    default: adminMessages.title,
    template: `%s · ${adminMessages.title}`,
  },
  robots: { index: false, follow: false },
};

// Todo o painel lê a sessão a cada pedido; a navegação instantânea, que pede
// partes prontas antes do clique, não se aplica a ele.
export const instant = false;

/**
 * Layout raiz do painel, separado do layout do site: nada do painel entra no
 * cache das páginas públicas, e o painel é só em pt-BR.
 */
export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    // A margem de rolagem embaixo deixa o campo em foco acima da barra fixa
    // de salvar dos editores.
    <html lang="pt-BR" className="scroll-pb-28">
      <body className="bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
