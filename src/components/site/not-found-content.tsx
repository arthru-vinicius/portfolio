import { localeHomePath } from "@/i18n/config";
import { en } from "@/i18n/dictionaries/en";
import { ptBR } from "@/i18n/dictionaries/pt-BR";

const homeLink =
  "font-semibold text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/**
 * O conteúdo da página 404, nos dois idiomas: o endereço que não existe não
 * diz em qual idioma o visitante estava.
 */
export function NotFoundContent() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-10 px-4 py-16 sm:px-6">
      <p className="site-gradient font-site-mono text-sm tracking-[0.14em]">
        404
      </p>
      <section lang="pt-BR" className="flex flex-col gap-3">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          {ptBR.notFound.title}
        </h1>
        <p className="text-lg text-ink-muted">{ptBR.notFound.body}</p>
        <a href={localeHomePath("pt-BR")} className={homeLink}>
          {ptBR.notFound.home}
        </a>
      </section>
      <section lang="en" className="flex flex-col gap-3">
        <h2 className="text-2xl font-bold tracking-tight">
          {en.notFound.title}
        </h2>
        <p className="text-ink-muted">{en.notFound.body}</p>
        <a href={localeHomePath("en")} className={homeLink}>
          {en.notFound.home}
        </a>
      </section>
    </main>
  );
}
