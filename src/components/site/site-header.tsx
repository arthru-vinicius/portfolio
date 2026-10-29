import { localeHomePath, locales, type Locale } from "@/i18n/config";

import { GlobeIcon } from "./icons";
import { MobileMenu, type NavItem } from "./mobile-menu";
import type { SiteContext } from "./site-context";
import { ThemeToggle } from "./theme-toggle";

/**
 * Cabeçalho fixo do site: o nome, as seções principais, o tema, o idioma e o
 * botão "Fale comigo", que leva ao contato. Abaixo de 1280 px, as seções vão
 * para o menu, que termina com o contato: abaixo de 640 px, o botão sai do
 * cabeçalho.
 *
 * @param props.brand - O nome curto que abre o cabeçalho.
 * @param props.items - As seções do menu, na ordem da página.
 * @param props.contactHref - A âncora da seção de contato.
 * @param props.context - Idioma e textos da página.
 */
export function SiteHeader({
  brand,
  items,
  contactHref,
  context,
}: {
  brand: string;
  items: readonly NavItem[];
  contactHref: string;
  context: SiteContext;
}) {
  const { dictionary: dict, locale } = context;
  const other: Locale =
    locales.find((candidate) => candidate !== locale) ?? locale;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-page/80 backdrop-blur-md">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center gap-1 px-4 sm:px-6">
        <a
          href="#topo"
          className="mr-auto inline-flex min-h-11 items-center gap-2 text-lg font-extrabold tracking-[0.06em] uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {brand}
          <span
            aria-hidden="true"
            className="site-dot size-1.5 rounded-full bg-accent"
          />
        </a>
        <nav aria-label={dict.site.navigation} className="hidden xl:block">
          <ul className="flex items-center gap-1">
            {items.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="inline-flex min-h-11 items-center rounded-full px-3 text-[0.9375rem] text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <ThemeToggle labels={dict.theme} />
        <a
          href={localeHomePath(other)}
          hrefLang={other}
          lang={other}
          title={dict.language.switchTo}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold hover:bg-card-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <GlobeIcon className="text-base" />
          {/* O nome acessível começa pelo texto visível ("EN"), para quem
              comanda o leitor de tela pela voz dizer o que vê. */}
          {dict.language.short}
          <span className="sr-only"> {dict.language.switchTo}</span>
        </a>
        <a
          href={contactHref}
          className="ml-2 hidden min-h-11 items-center rounded-full bg-accent px-5 text-sm font-bold text-on-accent shadow-[0_0_24px_-6px_var(--site-accent)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:inline-flex"
        >
          {dict.site.contactCta}
        </a>
        <div className="xl:hidden">
          <MobileMenu
            items={[
              ...items,
              { href: contactHref, label: dict.site.contactCta },
            ]}
            label={dict.site.menu}
          />
        </div>
      </div>
    </header>
  );
}
