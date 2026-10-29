import type { ReactNode } from "react";

import type { ProfilePhoto, SocialLink } from "@/content/schema";
import { fillTemplate } from "@/i18n/template";

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
 * @param props.photo - Foto do perfil, se houver; sem ela, o texto ocupa a
 *   largura toda.
 * @param props.links - Links do perfil que o site mostra.
 * @param props.projectsHref - Âncora dos projetos, se a seção existir.
 * @param props.contactHref - Âncora do contato.
 * @param props.resumeMenu - O botão "Baixar currículo", quando há currículo.
 * @param props.context - Idioma e textos da página.
 */
export function Hero({
  name,
  headline,
  location,
  photo,
  links,
  projectsHref,
  contactHref,
  resumeMenu,
  context,
}: {
  name: string;
  headline: string;
  location: string;
  photo: ProfilePhoto | undefined;
  links: readonly ProfileLink[];
  projectsHref: string | null;
  contactHref: string;
  resumeMenu?: ReactNode;
  context: SiteContext;
}) {
  const { dictionary: dict } = context;
  return (
    <section
      id="topo"
      aria-labelledby="topo-titulo"
      className="relative scroll-mt-20 overflow-x-clip"
    >
      <HeroParticles />
      <div
        aria-hidden="true"
        className="site-hero-glow pointer-events-none absolute inset-0"
      />
      <div
        className={`relative mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:py-36 ${photo === undefined ? "" : "items-center lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]"}`}
      >
        {photo !== undefined && (
          <div className="site-photo relative w-full max-w-[15rem] sm:max-w-[18rem] lg:order-last lg:max-w-none">
            {/* Os tamanhos já saem prontos do envio (WebP, 480 e 960 px). O
                `sizes` segue a largura máxima da foto em cada faixa de tela,
                para o celular comum baixar a de 480. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/media/${photo.id}-960.webp`}
              srcSet={`/media/${photo.id}-480.webp 480w, /media/${photo.id}-960.webp 960w`}
              sizes="(min-width: 1024px) 22rem, (min-width: 640px) 18rem, 15rem"
              width={photo.width}
              height={photo.height}
              alt={fillTemplate(dict.site.photoAlt, { name })}
              fetchPriority="high"
              className="relative aspect-square w-full rounded-[1.75rem] border border-line object-cover"
            />
          </div>
        )}
        <div className="min-w-0">
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
            {resumeMenu}
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
