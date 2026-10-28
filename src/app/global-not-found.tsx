import type { Metadata } from "next";

import { NotFoundContent } from "@/components/site/not-found-content";
import { THEME_SCRIPT } from "@/components/site/theme";
import { en } from "@/i18n/dictionaries/en";
import { ptBR } from "@/i18n/dictionaries/pt-BR";

import { jakarta, jetbrains } from "./fonts";

import "./globals.css";
import "./site.css";

export const metadata: Metadata = {
  title: `${ptBR.notFound.title} · ${en.notFound.title}`,
};

/**
 * Página 404 de todo endereço que não casa com nenhuma rota, como
 * `/pt/nada`. O site tem duas raízes de layout (o site, por idioma, e o
 * painel), então esta página não passa por nenhuma: traz o próprio `<html>`,
 * as fontes e o tema. O idioma desconhecido (`/xx`) cai no `not-found.tsx`
 * da rota de idioma, com o mesmo conteúdo.
 */
export default function GlobalNotFound() {
  return (
    <html
      lang="pt-BR"
      className={`site ${jakarta.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="bg-page font-site text-ink antialiased">
        <NotFoundContent />
      </body>
    </html>
  );
}
