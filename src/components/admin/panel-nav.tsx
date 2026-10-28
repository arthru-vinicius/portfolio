"use client";

import { usePathname } from "next/navigation";

import { adminMessages } from "@/i18n/admin";

import { GuardedLink, useGuardedSubmit } from "./unsaved-changes";

const { nav } = adminMessages;

const sections = [
  { href: "/admin", label: nav.home },
  { href: "/admin/profile", label: nav.profile },
  { href: "/admin/blocks", label: nav.blocks },
  { href: "/admin/resume", label: nav.resume },
  { href: "/admin/history", label: nav.history },
] as const;

function isCurrent(pathname: string, href: string): boolean {
  return href === "/admin"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

/** Navegação entre as seções do painel, com a seção atual marcada. */
export function PanelNav() {
  const pathname = usePathname();
  return (
    <nav aria-label={nav.label}>
      <ul className="flex flex-wrap gap-1">
        {sections.map(({ href, label }) => {
          const current = isCurrent(pathname, href);
          return (
            <li key={href}>
              <GuardedLink
                href={href}
                aria-current={current ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-md px-3 py-2 outline-offset-2 hover:bg-surface focus-visible:outline-2 focus-visible:outline-foreground ${current ? "bg-surface font-semibold" : "text-muted"}`}
              >
                {label}
              </GuardedLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Botão Sair, que pergunta antes se a página tem alterações não salvas.
 *
 * @param props.action - A Server Action que encerra a sessão.
 */
export function LogoutForm({ action }: { action: () => Promise<void> }) {
  const onSubmit = useGuardedSubmit();
  return (
    <form action={action} onSubmit={onSubmit}>
      <button
        type="submit"
        className="min-h-11 rounded-md px-3 py-2 font-medium underline-offset-4 outline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-foreground"
      >
        {adminMessages.logout}
      </button>
    </form>
  );
}
