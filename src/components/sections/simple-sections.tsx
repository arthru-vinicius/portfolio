import type {
  AwardItem,
  EducationItem,
  LanguageItem,
  SkillGroup,
} from "@/content/schema";
import { fillTemplate } from "@/i18n/template";

import { Markdown } from "../site/markdown";
import type { SiteContext } from "../site/site-context";

import { cardClass, Tags } from "./section";

const subtleCard = "site-card rounded-[1.25rem] border border-line bg-card p-6";
const kicker = "font-site-mono text-xs tracking-[0.12em] text-accent uppercase";

/**
 * Os grupos de habilidades em cartões, cada um com as suas etiquetas.
 *
 * @param props.groups - Os grupos visíveis.
 * @param props.context - Idioma e textos da página.
 */
export function SkillGroups({
  groups,
  context,
}: {
  groups: readonly SkillGroup[];
  context: SiteContext;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {groups.map((group) => {
        const name = context.text(group.name);
        return (
          <div key={group.id} className={`${subtleCard} flex flex-col gap-4`}>
            <h3 className="text-lg font-bold">{name}</h3>
            <Tags items={group.skills} label={name} />
          </div>
        );
      })}
    </div>
  );
}

/**
 * Os cursos: grau, instituição, período (ou previsão de conclusão) e
 * observações.
 *
 * @param props.items - Os cursos visíveis.
 * @param props.context - Idioma e textos da página.
 */
export function EducationList({
  items,
  context,
}: {
  items: readonly EducationItem[];
  context: SiteContext;
}) {
  const { dictionary: dict, text, month } = context;
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {items.map((item) => {
        const when =
          item.end === null && item.expectedEnd !== null
            ? `${month(item.start)} · ${fillTemplate(dict.site.expectedEnd, { date: month(item.expectedEnd) })}`
            : context.period(item.start, item.end);
        const notes = text(item.notes).trim();
        return (
          <article key={item.id} className={`${cardClass} flex flex-col gap-3`}>
            <p className={kicker}>{when}</p>
            <h3 className="text-xl font-bold text-balance">
              {text(item.degree)}
            </h3>
            <p className="text-ink-muted">
              {[item.institution, text(item.location)]
                .filter((part) => part !== "")
                .join(" · ")}
            </p>
            {notes !== "" && (
              <Markdown
                text={notes}
                newTabLabel={dict.site.opensInNewTab}
                className="site-prose text-ink-muted"
              />
            )}
          </article>
        );
      })}
    </div>
  );
}

/**
 * Os prêmios: título, quem concedeu, data e descrição.
 *
 * @param props.items - Os prêmios visíveis.
 * @param props.context - Idioma e textos da página.
 */
export function AwardList({
  items,
  context,
}: {
  items: readonly AwardItem[];
  context: SiteContext;
}) {
  const { dictionary: dict, text, month } = context;
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {items.map((item) => {
        const description = text(item.description).trim();
        return (
          <article key={item.id} className={`${cardClass} flex flex-col gap-3`}>
            <p className={kicker}>
              {item.issuer} · {month(item.date)}
            </p>
            <h3 className="text-xl font-bold text-balance">
              {text(item.title)}
            </h3>
            {description !== "" && (
              <Markdown
                text={description}
                newTabLabel={dict.site.opensInNewTab}
                className="site-prose text-ink-muted"
              />
            )}
          </article>
        );
      })}
    </div>
  );
}

/**
 * Os idiomas e o nível em cada um.
 *
 * @param props.items - Os idiomas visíveis.
 * @param props.context - Idioma e textos da página.
 */
export function LanguageList({
  items,
  context,
}: {
  items: readonly LanguageItem[];
  context: SiteContext;
}) {
  return (
    <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.id} className={`${subtleCard} flex flex-col gap-1`}>
          <dt className="text-lg font-bold">{context.text(item.name)}</dt>
          <dd className="text-ink-muted">{context.text(item.level)}</dd>
        </div>
      ))}
    </dl>
  );
}
