import { Suspense } from "react";

import { LogoutForm, PanelNav } from "@/components/admin/panel-nav";
import { UnsavedChangesProvider } from "@/components/admin/unsaved-changes";
import { adminMessages } from "@/i18n/admin";

import { logout } from "./actions";

/**
 * Moldura das páginas do painel que exigem sessão. A moldura em si não lê a
 * sessão: quem confere é cada página, porque um layout não roda de novo a
 * cada navegação.
 */
export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <UnsavedChangesProvider>
      <a
        href="#main-content"
        className="sr-only rounded-md bg-foreground px-4 py-2 text-background focus:not-sr-only focus:absolute focus:top-4 focus:left-4"
      >
        {adminMessages.skipToContent}
      </a>
      <header className="border-b border-control">
        <div className="mx-auto flex max-w-4xl flex-col gap-2 px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <p className="font-semibold">{adminMessages.title}</p>
            <LogoutForm action={logout} />
          </div>
          <PanelNav />
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-4xl px-6 py-10">
        <Suspense
          fallback={<p className="text-muted">{adminMessages.loading}</p>}
        >
          {children}
        </Suspense>
      </main>
    </UnsavedChangesProvider>
  );
}
