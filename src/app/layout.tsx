import type { Metadata } from "next";

import { defaultLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

import "./globals.css";

const dictionary = getDictionary(defaultLocale);

/** Metadados provisórios, no idioma padrão. */
export const metadata: Metadata = {
  title: dictionary.metadata.title,
  description: dictionary.metadata.description,
};

/** Layout raiz provisório, até as rotas por idioma do site público. */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={defaultLocale}>
      <body className="bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
