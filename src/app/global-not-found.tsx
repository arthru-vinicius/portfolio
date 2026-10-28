import type { Metadata } from "next";

import { THEME_SCRIPT } from "@/components/site/theme";
import { localePaths } from "@/i18n/config";
import { en } from "@/i18n/dictionaries/en";
import { ptBR } from "@/i18n/dictionaries/pt-BR";

import { jakarta, jetbrains } from "./fonts";

import "./globals.css";
import "./site.css";

export const metadata: Metadata = {
  title: `${ptBR.notFound.title} · ${en.notFound.title}`,
};

/**
 * Página 404 de todo endereço que não existe. O site tem duas raízes de
 * layout (o site, por idioma, e o painel), então esta página não passa por
 * nenhuma: traz o próprio `<html>`, as fontes e o tema. O endereço não diz o
 * idioma, e a página fala os dois.
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
        <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-10 px-4 py-16 sm:px-6">
          <p className="site-gradient font-site-mono text-sm tracking-[0.14em]">
            404
          </p>
          <section className="flex flex-col gap-3">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              {ptBR.notFound.title}
            </h1>
            <p className="text-lg text-ink-muted">{ptBR.notFound.body}</p>
            <a
              href={`/${localePaths["pt-BR"]}`}
              className="font-semibold text-accent underline-offset-4 hover:underline"
            >
              {ptBR.notFound.home}
            </a>
          </section>
          <section lang="en" className="flex flex-col gap-3">
            <h2 className="text-2xl font-bold tracking-tight">
              {en.notFound.title}
            </h2>
            <p className="text-ink-muted">{en.notFound.body}</p>
            <a
              href={`/${localePaths.en}`}
              className="font-semibold text-accent underline-offset-4 hover:underline"
            >
              {en.notFound.home}
            </a>
          </section>
        </main>
      </body>
    </html>
  );
}
