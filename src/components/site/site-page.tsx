import type { ReactNode } from "react";

import { ExperienceList } from "@/components/sections/experience-section";
import { ProjectGrid } from "@/components/sections/projects-section";
import { Section, textLinkClass } from "@/components/sections/section";
import {
  AwardList,
  EducationList,
  LanguageList,
  SkillGroups,
} from "@/components/sections/simple-sections";
import { listItemsOf, isListBlock } from "@/content/editing";
import type { PublicDocument } from "@/content/public-projection";
import type { Block } from "@/content/schema";
import { customTitle, siteBlocks, slugify } from "@/content/site-view";
import { locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { pluralize } from "@/i18n/template";
import { resumeContentTypes, type ResumeDownload } from "@/lib/resume/catalog";

import { Hero, SkillsMarquee, type ProfileLink } from "./hero";
import { MailIcon } from "./icons";
import { Markdown } from "./markdown";
import type { NavItem } from "./mobile-menu";
import { ResumeMenu, type ResumeMenuGroup } from "./resume-menu";
import { ScrollProgress } from "./scroll-progress";
import { createSiteContext, type SiteContext } from "./site-context";
import { SiteHeader } from "./site-header";

/** O botão do currículo no topo, igual ao "Fale comigo". */
const heroButtonClass =
  "inline-flex min-h-12 items-center gap-2 rounded-full border border-line bg-card/70 px-6 font-bold group-open:border-accent hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** O botão do currículo no rodapé, discreto como os links dele. */
const footerButtonClass =
  "inline-flex min-h-11 items-center gap-2 font-semibold text-ink-muted group-open:text-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

type PlannedSection = { block: Block; anchor: string; title: string };

/**
 * As seções que entram no menu do cabeçalho: as principais. Habilidades e
 * idiomas são curtas, e os blocos livres são complementos; as três continuam
 * na página. O contato fica com o botão "Fale comigo".
 */
const NAV_BLOCK_TYPES: ReadonlySet<Block["type"]> = new Set([
  "about",
  "experience",
  "projects",
  "education",
  "awards",
]);

/** Dá a cada bloco a âncora e o título que ele tem nesta página. */
function planSections(
  blocks: readonly Block[],
  context: SiteContext,
): PlannedSection[] {
  const { dictionary: dict, locale } = context;
  const used = new Set<string>([dict.anchors.contact, "topo", "conteudo"]);
  return blocks.map((block, index) => {
    const title =
      block.type === "text"
        ? context.text(block.title)
        : (customTitle(block.title, locale) ?? dict.sections[block.type]);
    const base =
      block.type === "text"
        ? slugify(title) || `secao-${index + 1}`
        : dict.anchors[block.type];
    let anchor = base;
    for (let suffix = 2; used.has(anchor); suffix++) {
      anchor = `${base}-${suffix}`;
    }
    used.add(anchor);
    return { block, anchor, title };
  });
}

/** O rótulo acima do título: quantos itens a seção tem. */
function eyebrowOf(block: Block, context: SiteContext): string | undefined {
  if (!isListBlock(block)) {
    return undefined;
  }
  const count =
    block.type === "skills"
      ? block.groups.reduce((total, group) => total + group.skills.length, 0)
      : listItemsOf(block).length;
  return pluralize(
    context.dictionary.counts[block.type],
    count,
    context.locale,
  );
}

/** Os arquivos do currículo por idioma: o da página primeiro, cada um com os textos dele. */
function resumeMenuGroups(
  downloads: readonly ResumeDownload[],
  pageLocale: Locale,
): ResumeMenuGroup[] {
  const order = [
    pageLocale,
    ...locales.filter((locale) => locale !== pageLocale),
  ];
  return order.flatMap((locale) => {
    const files = downloads.filter((file) => file.locale === locale);
    if (files.length === 0) {
      return [];
    }
    const dict = getDictionary(locale).resumeDownload;
    const kilobytes = new Intl.NumberFormat(locale, {
      style: "unit",
      unit: "kilobyte",
      maximumFractionDigits: 0,
    });
    return [
      {
        lang: locale,
        label: dict.language,
        files: files.map((file) => ({
          href: file.href,
          fileName: file.fileName,
          type: resumeContentTypes[file.format],
          label: dict[file.format],
          size:
            file.size === null
              ? null
              : kilobytes.format(Math.max(1, Math.round(file.size / 1000))),
        })),
      },
    ];
  });
}

function BlockContent({
  block,
  context,
}: {
  block: Block;
  context: SiteContext;
}) {
  const newTabLabel = context.dictionary.site.opensInNewTab;
  switch (block.type) {
    case "about":
      return (
        <Markdown
          text={context.text(block.body)}
          newTabLabel={newTabLabel}
          className="site-prose max-w-3xl text-lg leading-relaxed text-ink-muted sm:text-xl"
        />
      );
    case "text":
      return (
        <Markdown
          text={context.text(block.body)}
          newTabLabel={newTabLabel}
          className="site-prose max-w-3xl text-lg leading-relaxed text-ink-muted"
        />
      );
    case "experience":
      return <ExperienceList items={block.items} context={context} />;
    case "projects":
      return <ProjectGrid items={block.items} context={context} />;
    case "skills":
      return <SkillGroups groups={block.groups} context={context} />;
    case "education":
      return <EducationList items={block.items} context={context} />;
    case "awards":
      return <AwardList items={block.items} context={context} />;
    case "languages":
      return <LanguageList items={block.items} context={context} />;
  }
}

/**
 * O site inteiro de um idioma, a partir de um documento: o publicado, nas
 * páginas públicas, ou o rascunho, na pré-visualização do painel.
 *
 * Mostra só os blocos e itens visíveis, na ordem do painel. O link do perfil
 * que aponta para o próprio site fica de fora: ele serve ao currículo.
 *
 * @param props.document - O documento, sem os campos privados.
 * @param props.locale - O idioma da página.
 * @param props.ownHost - O host do próprio site, para esconder o link dele.
 * @param props.contactForm - O formulário de contato, quando ele está ligado;
 *   sem ele, a seção mostra só o e-mail e as redes.
 * @param props.resume - Os arquivos do currículo, para o botão "Baixar
 *   currículo" do topo e do rodapé; sem eles, o botão não aparece.
 */
export function SitePage({
  document,
  locale,
  ownHost,
  contactForm,
  resume,
}: {
  document: PublicDocument;
  locale: Locale;
  ownHost: string | null;
  contactForm?: ReactNode;
  resume?: readonly ResumeDownload[];
}) {
  const context = createSiteContext(locale);
  const { dictionary: dict } = context;
  const { profile } = document;
  const sections = planSections(siteBlocks(document), context);
  const contactAnchor = dict.anchors.contact;
  const projects = sections.find(
    (section) => section.block.type === "projects",
  );
  const skills = sections
    .map((section) => section.block)
    .flatMap((block) =>
      block.type === "skills"
        ? block.groups.flatMap((group) => group.skills)
        : [],
    );
  const links: ProfileLink[] = profile.links
    .filter((link) => {
      if (link.kind !== "website" || ownHost === null) {
        return true;
      }
      try {
        return new URL(link.url).hostname !== ownHost;
      } catch {
        return true;
      }
    })
    .map((link) => ({
      ...link,
      name:
        link.kind === "other"
          ? (link.label ?? link.url)
          : dict.links[link.kind],
    }));
  const navItems: NavItem[] = sections
    .filter(({ block }) => NAV_BLOCK_TYPES.has(block.type))
    .map(({ anchor, title }) => ({ href: `#${anchor}`, label: title }));
  const brand = profile.displayName.split(/\s+/)[0] ?? profile.displayName;
  const resumeGroups =
    resume === undefined ? [] : resumeMenuGroups(resume, locale);

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:font-bold focus:text-on-accent"
      >
        {dict.site.skipToContent}
      </a>
      <ScrollProgress />
      <SiteHeader
        brand={brand}
        items={navItems}
        contactHref={`#${contactAnchor}`}
        context={context}
      />
      <main id="conteudo" tabIndex={-1} className="outline-none">
        <Hero
          name={profile.displayName}
          headline={context.text(profile.headline)}
          location={context.text(profile.location)}
          photo={profile.photo}
          links={links}
          projectsHref={projects === undefined ? null : `#${projects.anchor}`}
          contactHref={`#${contactAnchor}`}
          resumeMenu={
            resumeGroups.length > 0 ? (
              <ResumeMenu
                label={dict.resumeDownload.button}
                groups={resumeGroups}
                placement="down"
                buttonClassName={heroButtonClass}
              />
            ) : undefined
          }
          context={context}
        />
        <SkillsMarquee skills={skills} />
        {sections.map(({ block, anchor, title }) => (
          <Section
            key={block.id}
            id={anchor}
            title={title}
            eyebrow={eyebrowOf(block, context)}
          >
            <BlockContent block={block} context={context} />
          </Section>
        ))}
        <Section id={contactAnchor} title={dict.sections.contact}>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14">
            <div className="flex min-w-0 flex-col gap-6">
              <p className="text-lg text-ink-muted">{dict.site.contactText}</p>
              {profile.publicEmail !== undefined && (
                <p className="flex flex-col gap-1">
                  <span className="font-site-mono text-xs tracking-[0.12em] text-accent uppercase">
                    {dict.site.emailLabel}
                  </span>
                  <a
                    href={`mailto:${profile.publicEmail}`}
                    className="inline-flex items-center gap-2 text-xl font-bold break-all hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:text-2xl"
                  >
                    <MailIcon className="shrink-0 text-accent" />
                    {profile.publicEmail}
                  </a>
                </p>
              )}
              {links.length > 0 && (
                <ul
                  aria-label={dict.site.linksLabel}
                  className="flex flex-wrap gap-x-6 gap-y-2"
                >
                  {links.map((link) => (
                    <li key={link.id}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={textLinkClass}
                      >
                        {link.name}
                        <span className="sr-only">
                          {" "}
                          {dict.site.opensInNewTab}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {contactForm !== undefined && (
              <div className="site-card min-w-0 rounded-[1.25rem] border border-line bg-card p-6 sm:p-8">
                <h3 className="mb-6 text-xl font-bold">
                  {dict.contactForm.title}
                </h3>
                {contactForm}
              </div>
            )}
          </div>
        </Section>
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-8 text-sm text-ink-muted sm:px-6">
          <p>
            © {new Date().getFullYear()} {profile.displayName}
          </p>
          <p>{dict.site.footerNote}</p>
          {resumeGroups.length > 0 && (
            <ResumeMenu
              label={dict.resumeDownload.button}
              groups={resumeGroups}
              placement="up"
              buttonClassName={footerButtonClass}
            />
          )}
          <a href="#topo" className={textLinkClass}>
            {dict.site.backToTop}
          </a>
        </div>
      </footer>
    </>
  );
}
