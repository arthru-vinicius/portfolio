import type { ProjectItem } from "@/content/schema";

import { ArrowUpRightIcon } from "../site/icons";
import { Markdown } from "../site/markdown";
import type { SiteContext } from "../site/site-context";

import { cardClass, Tags } from "./section";

/**
 * Os projetos em cartões: nome, resumo, tecnologias e links. A descrição
 * longa fica num "Mais detalhes", que abre sem JavaScript.
 *
 * @param props.items - Os projetos visíveis, na ordem do painel.
 * @param props.context - Idioma e textos da página.
 */
export function ProjectGrid({
  items,
  context,
}: {
  items: readonly ProjectItem[];
  context: SiteContext;
}) {
  const { dictionary: dict, text } = context;
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const description = text(item.description).trim();
        const links = [
          { href: item.repositoryUrl, label: dict.site.code },
          { href: item.websiteUrl, label: dict.site.website },
        ].filter(
          (link): link is { href: string; label: string } =>
            link.href !== undefined,
        );
        return (
          <article
            key={item.id}
            className={`${cardClass} flex min-w-0 flex-col gap-4`}
          >
            <h3 className="text-xl font-bold">{item.name}</h3>
            <p className="flex-1 text-ink-muted">{text(item.summary)}</p>
            {description !== "" && (
              <details className="group">
                <summary className="cursor-pointer text-sm font-semibold text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                  {dict.site.details}
                </summary>
                <Markdown
                  text={description}
                  newTabLabel={dict.site.opensInNewTab}
                  className="site-prose mt-3 text-[0.9375rem] text-ink-muted"
                />
              </details>
            )}
            <Tags
              items={item.technologies.slice(0, 6)}
              label={dict.site.technologies}
            />
            {links.length > 0 && (
              <p className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
                {links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-1.5 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {link.label}
                    <span className="sr-only">
                      {" "}
                      {item.name} {dict.site.opensInNewTab}
                    </span>
                    <ArrowUpRightIcon />
                  </a>
                ))}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
