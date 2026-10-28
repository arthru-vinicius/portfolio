import type { ReactNode } from "react";

/**
 * Moldura de toda seção do site: a âncora, o rótulo opcional em cima (como
 * "13 projetos") e o título, que nomeia a seção para leitores de tela.
 *
 * @param props.id - Âncora da seção, como `experiencia`.
 * @param props.eyebrow - Rótulo curto acima do título.
 * @param props.title - Título da seção.
 */
export function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  children: ReactNode;
}) {
  const titleId = `${id}-titulo`;
  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className="scroll-mt-20 border-t border-line py-16 sm:py-24"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 sm:px-6">
        <header className="flex flex-col gap-3">
          {eyebrow !== undefined && (
            <p className="site-eyebrow font-site-mono text-xs tracking-[0.14em] text-accent uppercase">
              {eyebrow}
            </p>
          )}
          <h2
            id={titleId}
            className="text-3xl font-extrabold tracking-tight text-balance sm:text-5xl"
          >
            {title}
          </h2>
        </header>
        {children}
      </div>
    </section>
  );
}

/**
 * Lista de etiquetas, como as tecnologias de um projeto.
 *
 * @param props.items - As etiquetas.
 * @param props.label - Nome da lista para leitores de tela.
 */
export function Tags({
  items,
  label,
}: {
  items: readonly string[];
  label: string;
}) {
  if (items.length === 0) {
    return null;
  }
  return (
    <ul aria-label={label} className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li
          key={item}
          className="rounded-full border border-line px-3 py-1 text-[0.8125rem] text-ink-muted"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Classe dos cartões das seções. */
export const cardClass =
  "site-card rounded-[1.25rem] border border-line bg-card p-6 sm:p-8";

/** Classe dos links de texto. */
export const textLinkClass =
  "font-semibold text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
