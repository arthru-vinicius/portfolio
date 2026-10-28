import type { ExperienceItem } from "@/content/schema";

import { CheckIcon } from "../site/icons";
import { Markdown } from "../site/markdown";
import type { SiteContext } from "../site/site-context";

import { cardClass, Tags, textLinkClass } from "./section";

/**
 * As experiências, uma por cartão: período e empresa à esquerda; cargo,
 * resumo, destaques e tecnologias à direita.
 *
 * @param props.items - As experiências visíveis, na ordem do painel.
 * @param props.context - Idioma e textos da página.
 */
export function ExperienceList({
  items,
  context,
}: {
  items: readonly ExperienceItem[];
  context: SiteContext;
}) {
  const { dictionary: dict, text, period } = context;
  return (
    <div className="flex flex-col gap-5">
      {items.map((item) => {
        // Local e modo de trabalho, sem repetir quando o local já é o modo
        // ("Remoto").
        const where = [
          ...new Set(
            [
              text(item.location),
              item.workMode === undefined ? "" : dict.workModes[item.workMode],
            ].filter((part) => part !== ""),
          ),
        ];
        return (
          <article
            key={item.id}
            className={`${cardClass} grid gap-6 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-10`}
          >
            <div className="flex flex-col gap-2">
              <p className="font-site-mono text-xs tracking-[0.08em] text-accent uppercase">
                {period(item.start, item.end)}
              </p>
              <p className="font-semibold">
                {item.companyUrl === undefined ? (
                  item.company
                ) : (
                  <a
                    href={item.companyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={textLinkClass}
                  >
                    {item.company}
                    <span className="sr-only"> {dict.site.opensInNewTab}</span>
                  </a>
                )}
              </p>
              {where.length > 0 && (
                <p className="text-sm text-ink-muted">{where.join(" · ")}</p>
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-4">
              <h3 className="text-xl font-bold text-balance sm:text-2xl">
                {text(item.role)}
              </h3>
              <Markdown
                text={text(item.summary)}
                newTabLabel={dict.site.opensInNewTab}
                className="site-prose text-ink-muted"
              />
              {item.highlights.length > 0 && (
                <ul
                  aria-label={dict.site.highlights}
                  className="flex flex-col gap-2.5"
                >
                  {item.highlights.map((highlight) => (
                    <li key={highlight.id} className="flex gap-3">
                      <CheckIcon className="mt-1 shrink-0 text-accent" />
                      <span>{text(highlight.text)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Tags items={item.technologies} label={dict.site.technologies} />
            </div>
          </article>
        );
      })}
    </div>
  );
}
