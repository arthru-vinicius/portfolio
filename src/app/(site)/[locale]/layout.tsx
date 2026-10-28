import { THEME_SCRIPT } from "@/components/site/theme";
import {
  defaultLocale,
  localeFromPath,
  localePaths,
  locales,
} from "@/i18n/config";

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
 *
 * Um segmento que não é idioma (`/xx`) não é recusado aqui: um `notFound()` no
 * layout raiz não tem fronteira acima dele e cairia na página padrão do Next.
 * A página recusa, e o `not-found.tsx` responde com o visual do site.
 */
export default async function SiteLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const locale = localeFromPath((await params).locale) ?? defaultLocale;
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
