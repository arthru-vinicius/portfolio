import { notFound } from "next/navigation";

import { THEME_SCRIPT } from "@/components/site/theme";
import { localeFromPath, localePaths, locales } from "@/i18n/config";

import { jakarta, jetbrains } from "../../fonts";

import "../../globals.css";
import "../../site.css";

/** Os dois idiomas são conhecidos no build: a casca de cada um sai pronta. */
export function generateStaticParams() {
  return locales.map((locale) => ({ locale: localePaths[locale] }));
}

/**
 * Layout raiz do site público, um por idioma (`/pt` e `/en`). O tema escolhido
 * pelo visitante entra antes da primeira pintura, pelo script do `<head>`; por
 * isso o `<html>` aceita a diferença na hidratação.
 */
export default async function SiteLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const locale = localeFromPath((await params).locale);
  if (locale === null) {
    notFound();
  }
  return (
    <html
      lang={locale}
      className={`site ${jakarta.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="bg-page font-site text-ink antialiased">{children}</body>
    </html>
  );
}
