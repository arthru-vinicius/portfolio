import { getDictionary } from "@/i18n/dictionaries";

/** Página provisória, nos dois idiomas, até o site público ficar pronto. */
export default function HomePage() {
  const portuguese = getDictionary("pt-BR");
  const english = getDictionary("en");

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-10 px-6 py-16">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">
          {portuguese.placeholder.title}
        </h1>
        <p className="mt-3 text-lg text-muted">{portuguese.placeholder.body}</p>
      </section>
      <section lang="en">
        <h2 className="text-xl font-semibold tracking-tight">
          {english.placeholder.title}
        </h2>
        <p className="mt-2 text-muted">{english.placeholder.body}</p>
      </section>
    </main>
  );
}
