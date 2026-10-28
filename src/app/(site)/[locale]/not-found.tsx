import type { Metadata } from "next";

import { NotFoundContent } from "@/components/site/not-found-content";
import { en } from "@/i18n/dictionaries/en";
import { ptBR } from "@/i18n/dictionaries/pt-BR";

export const metadata: Metadata = {
  title: `${ptBR.notFound.title} · ${en.notFound.title}`,
};

/**
 * 404 de um segmento que não é idioma do site, como `/xx`: a página recusa o
 * idioma, e este arquivo responde dentro do layout do site. O Next 16, com
 * Cache Components, não tem `dynamicParams = false` para recusar antes.
 */
export default function LocaleNotFound() {
  return <NotFoundContent />;
}
