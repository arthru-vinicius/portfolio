import type { SocialLink } from "@/content/schema";

import { HeroParticles } from "./hero-particles";
import { ArrowUpRightIcon, PinIcon } from "./icons";
import type { SiteContext } from "./site-context";

/** Um link do perfil, com o nome que o site mostra. */
export type ProfileLink = SocialLink & { name: string };

/**
 * Topo do site: o local, o nome, o título com o degradê, os botões e os
 * links, sobre a rede de partículas.
 *
 * @param props.name - Nome de exibição.
 * @param props.headline - Título profissional, no idioma da página.
 * @param props.location - Local, no idioma da página.
 * @param props.links - Links do perfil que o site mostra.
 * @param props.projectsHref - Âncora dos projetos, se a seção existir.
 * @param props.contactHref - Âncora do contato.
 * @param props.context - Idioma e textos da página.
 */
export function Hero({
  name,
  headline,
  location,
  links,
  projectsHref,
  contactHref,
  context,
}: {
  name: string;
  headline: string;
  location: string;
  links: readonly ProfileLink[];
  projectsHref: string | null;
  contactHref: string;
  context: SiteContext;
}) {
  const { dictionary: dict } = context;
  return (
    <section
      id="topo"
      aria-labelledby="topo-titulo"
      className="relative scroll-mt-20 overflow-hidden"
    >
      <HeroParticles />
      <div
        aria-hidden="true"
        className="site-hero-glow pointer-events-none absolute inset-0"
      />
      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:py-36">
        {location !== "" && (
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-card/70 px-4 py-1.5 font-site-mono text-xs tracking-[0.12em] text-ink-muted uppercase">
            <PinIcon className="text-sm text-accent" />
            {location}
          </p>
        )}
        <h1
          id="topo-titulo"
          className="mt-7 text-[clamp(2.25rem,10.5vw,3rem)] leading-[1.02] font-extrabold tracking-[-0.03em] text-balance hyphens-auto sm:text-7xl lg:text-[5.25rem]"
        >
          {name}
          {headline !== "" && (
            <>
              <br />
              <span className="site-gradient [box-decoration-break:clone]">
                {headline}
              </span>
            </>
          )}
        </h1>
        <div className="mt-10 flex flex-wrap gap-3">
          {projectsHref !== null && (
            <a
              href={projectsHref}
              className="inline-flex min-h-12 items-center rounded-full bg-accent px-6 font-bold text-on-accent shadow-[0_0_28px_-6px_var(--site-accent)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {dict.site.seeProjects}
            </a>
          )}
          <a
            href={contactHref}
            className="inline-flex min-h-12 items-center rounded-full border border-line bg-card/70 px-6 font-bold hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {dict.site.contactCta}
          </a>
        </div>
        {links.length > 0 && (
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-1">
            {links.map((link) => (
              <li key={link.id}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-ink-muted hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {link.name}
                  <span className="sr-only"> {dict.site.opensInNewTab}</span>
                  <ArrowUpRightIcon />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/**
 * Faixa com as habilidades correndo devagar, entre o topo e as seções. É só
 * decoração: as mesmas habilidades estão na seção delas, então a faixa fica
 * fora da leitura de tela. Com "reduzir movimento", fica parada.
 *
 * @param props.skills - As habilidades, na ordem dos grupos.
 */
export function SkillsMarquee({ skills }: { skills: readonly string[] }) {
  if (skills.length === 0) {
    return null;
  }
  // A lista vai duas vezes: quando a primeira sai da tela, a segunda está no
  // lugar dela, e a animação recomeça sem salto.
  const run = skills.map((skill, index) => (
    <span
      key={`${skill}-${index}`}
      className="inline-flex items-center gap-10 whitespace-nowrap"
    >
      {skill}
      <span className="size-1 rounded-full bg-accent" />
    </span>
  ));
  return (
    <div
      aria-hidden="true"
      className="site-marquee overflow-hidden border-y border-line py-4"
    >
      <div className="site-marquee-track flex w-max gap-10 font-site-mono text-[0.8125rem] tracking-[0.14em] text-ink-muted uppercase">
        {run}
        {run}
      </div>
    </div>
  );
}
