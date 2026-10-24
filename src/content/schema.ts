import { z } from "zod";

/**
 * Versão atual do documento de conteúdo. Só sobe com mudança incompatível: um
 * campo novo e opcional não muda a versão, e assim a imagem anterior continua
 * lendo o documento depois de um rollback do deploy.
 */
export const CURRENT_SCHEMA_VERSION = 1;

// Limites de tamanho: barram textos acidentais na importação de JSON e no banco.
const SHORT_TEXT = 200;
const SENTENCE = 500;
const LONG_TEXT = 5000;
const LIST_LIMIT = 50;

const text = (max: number) => z.string().trim().max(max);

const localized = (max: number) =>
  z.object({
    "pt-BR": text(max),
    en: text(max),
  });

/**
 * Texto curto nos dois idiomas do site: títulos, cargos e locais. O rascunho
 * aceita vazio; a publicação exige os dois idiomas.
 */
export const localizedLineSchema = localized(SHORT_TEXT);

/** Frase nos dois idiomas, como um destaque de experiência ou o resumo de um projeto. */
export const localizedSentenceSchema = localized(SENTENCE);

/**
 * Texto longo nos dois idiomas, escrito com o subconjunto de Markdown do site
 * (parágrafos, negrito, itálico, links e listas, sem HTML).
 */
export const localizedRichTextSchema = localized(LONG_TEXT);

/** Mês no formato `AAAA-MM`. O site e o currículo formatam com `Intl`. */
export const yearMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "use o formato AAAA-MM");

const idSchema = z.uuid();
const urlSchema = z.httpUrl().max(500);

/** Palavras-chave (tecnologias, habilidades) escritas como o mercado escreve, sem repetir. */
const keywordsSchema = z
  .array(text(60).min(1))
  .max(LIST_LIMIT)
  .refine(
    (keywords) =>
      new Set(keywords.map((keyword) => keyword.toLowerCase())).size ===
      keywords.length,
    { error: "palavra-chave repetida" },
  );

/** Itens de lista: aparecem no site se visíveis, e no currículo se marcados. */
const itemBase = {
  id: idSchema,
  visible: z.boolean(),
  inResume: z.boolean(),
};

const endNotBeforeStart = (item: { start: string; end: string | null }) =>
  item.end === null || item.end >= item.start;
const endNotBeforeStartError = {
  error: "o fim vem antes do início",
  path: ["end"],
};

/** Tipos de link do perfil. `other` exige um rótulo. */
export const socialLinkKinds = [
  "linkedin",
  "github",
  "website",
  "x",
  "bluesky",
  "instagram",
  "youtube",
  "other",
] as const;

/** Link do perfil (rede social ou site). */
export const socialLinkSchema = z
  .object({
    id: idSchema,
    kind: z.enum(socialLinkKinds),
    url: urlSchema,
    label: text(60).optional(),
  })
  .refine((link) => link.kind !== "other" || Boolean(link.label), {
    error: "um link do tipo other precisa de rótulo",
    path: ["label"],
  });

/** Perfil: quem é a pessoa e como encontrá-la. */
export const profileSchema = z.object({
  /** Nome completo, usado no currículo. */
  fullName: text(SHORT_TEXT),
  /** Nome curto, usado no site. */
  displayName: text(SHORT_TEXT),
  headline: localizedLineSchema,
  location: localizedLineSchema,
  links: z.array(socialLinkSchema).max(20),
  /** E-mail do currículo. */
  publicEmail: z.email().max(254).optional(),
  /** Campos que nunca saem do painel (ver `toPublicDocument`). */
  private: z.object({
    phone: text(40).optional(),
  }),
});

/** Uma experiência profissional. `end: null` é o emprego atual. */
export const experienceItemSchema = z
  .object({
    ...itemBase,
    company: text(SHORT_TEXT),
    companyUrl: urlSchema.optional(),
    role: localizedLineSchema,
    location: localizedLineSchema,
    workMode: z.enum(["onsite", "hybrid", "remote"]).optional(),
    start: yearMonthSchema,
    end: yearMonthSchema.nullable(),
    summary: localizedRichTextSchema,
    highlights: z
      .array(
        z.object({
          id: idSchema,
          text: localizedSentenceSchema,
          inResume: z.boolean(),
        }),
      )
      .max(LIST_LIMIT),
    technologies: keywordsSchema,
  })
  .refine(endNotBeforeStart, endNotBeforeStartError);

/** Um projeto. Sem `repositoryUrl` quando o código não é público. */
export const projectItemSchema = z.object({
  ...itemBase,
  name: text(SHORT_TEXT),
  summary: localizedSentenceSchema,
  description: localizedRichTextSchema,
  technologies: keywordsSchema,
  repositoryUrl: urlSchema.optional(),
  websiteUrl: urlSchema.optional(),
});

/** Um grupo de habilidades, como "Backend" ou "Dados". */
export const skillGroupSchema = z.object({
  ...itemBase,
  name: localizedLineSchema,
  skills: keywordsSchema,
});

/**
 * Um curso. `end: null` é curso em andamento; nesse caso, `expectedEnd` é a
 * previsão de conclusão.
 */
export const educationItemSchema = z
  .object({
    ...itemBase,
    degree: localizedLineSchema,
    institution: text(SHORT_TEXT),
    location: localizedLineSchema,
    start: yearMonthSchema,
    end: yearMonthSchema.nullable(),
    expectedEnd: yearMonthSchema.nullable(),
    notes: localizedRichTextSchema,
  })
  .refine(endNotBeforeStart, endNotBeforeStartError);

/** Um prêmio ou reconhecimento. */
export const awardItemSchema = z.object({
  ...itemBase,
  title: localizedLineSchema,
  issuer: text(SHORT_TEXT),
  date: yearMonthSchema,
  description: localizedRichTextSchema,
});

/** Um idioma e o nível nele. */
export const languageItemSchema = z.object({
  ...itemBase,
  name: localizedLineSchema,
  level: localizedLineSchema,
});

const blockBase = {
  id: idSchema,
  visible: z.boolean(),
  /** Substitui o título padrão do tipo de bloco. */
  title: localizedLineSchema.optional(),
};

const listOf = <T extends z.ZodType>(item: T) => z.array(item).max(LIST_LIMIT);

/**
 * Um bloco do site. A ordem do array de blocos é a ordem no site, e o design de
 * cada tipo é do código, nunca do conteúdo.
 */
export const blockSchema = z.discriminatedUnion("type", [
  z.object({
    ...blockBase,
    type: z.literal("about"),
    body: localizedRichTextSchema,
  }),
  z.object({
    ...blockBase,
    type: z.literal("experience"),
    items: listOf(experienceItemSchema),
  }),
  z.object({
    ...blockBase,
    type: z.literal("projects"),
    items: listOf(projectItemSchema),
  }),
  z.object({
    ...blockBase,
    type: z.literal("skills"),
    groups: listOf(skillGroupSchema),
  }),
  z.object({
    ...blockBase,
    type: z.literal("education"),
    items: listOf(educationItemSchema),
  }),
  z.object({
    ...blockBase,
    type: z.literal("awards"),
    items: listOf(awardItemSchema),
  }),
  z.object({
    ...blockBase,
    type: z.literal("languages"),
    items: listOf(languageItemSchema),
  }),
  // Bloco livre: o único que pode se repetir, e por isso o título é obrigatório.
  z.object({
    id: idSchema,
    visible: z.boolean(),
    type: z.literal("text"),
    title: localizedLineSchema,
    body: localizedRichTextSchema,
  }),
]);

/** O que é exclusivo do currículo. A ordem das seções dele é fixa, no padrão do mercado. */
export const resumeSettingsSchema = z.object({
  /** Resumo de 3 a 4 linhas, mais curto e objetivo que o "Sobre" do site. */
  summary: localizedRichTextSchema,
});

/**
 * Forma do documento sem as regras entre campos (ids únicos, um bloco por
 * tipo). Serve de base para projeções, como a pública.
 */
export const basePortfolioDocumentSchema = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  profile: profileSchema,
  blocks: z.array(blockSchema).max(30),
  resume: resumeSettingsSchema,
});

type DocumentShape = z.infer<typeof basePortfolioDocumentSchema>;

/** Lista cada id do documento com o caminho dele, para apontar repetições. */
function* collectIds(
  document: DocumentShape,
): Generator<{ id: string; path: (string | number)[] }> {
  for (const [index, link] of document.profile.links.entries()) {
    yield { id: link.id, path: ["profile", "links", index, "id"] };
  }
  for (const [blockIndex, block] of document.blocks.entries()) {
    yield { id: block.id, path: ["blocks", blockIndex, "id"] };

    const childKey = block.type === "skills" ? "groups" : "items";
    const children: readonly {
      id: string;
      highlights?: readonly { id: string }[];
    }[] =
      block.type === "skills"
        ? block.groups
        : "items" in block
          ? block.items
          : [];
    for (const [childIndex, child] of children.entries()) {
      const childPath = ["blocks", blockIndex, childKey, childIndex];
      yield { id: child.id, path: [...childPath, "id"] };
      for (const [highlightIndex, highlight] of (
        child.highlights ?? []
      ).entries()) {
        yield {
          id: highlight.id,
          path: [...childPath, "highlights", highlightIndex, "id"],
        };
      }
    }
  }
}

/**
 * Schema completo do documento de conteúdo: a fonte dos tipos do painel, do
 * site e do currículo.
 *
 * Além dos tipos, garante que os ids são únicos no documento inteiro e que cada
 * tipo de bloco aparece no máximo uma vez, exceto o bloco livre (`text`).
 */
export const portfolioDocumentSchema = basePortfolioDocumentSchema.superRefine(
  (document, ctx) => {
    const firstBlockOfType = new Map<string, number>();
    for (const [index, block] of document.blocks.entries()) {
      if (block.type === "text") {
        continue;
      }
      const first = firstBlockOfType.get(block.type);
      if (first === undefined) {
        firstBlockOfType.set(block.type, index);
      } else {
        ctx.addIssue({
          code: "custom",
          path: ["blocks", index, "type"],
          message: `já existe um bloco ${block.type} na posição ${first}`,
          input: block.type,
        });
      }
    }

    const seenIds = new Set<string>();
    for (const { id, path } of collectIds(document)) {
      if (seenIds.has(id)) {
        ctx.addIssue({
          code: "custom",
          path,
          message: `id repetido: ${id}`,
          input: id,
        });
      }
      seenIds.add(id);
    }
  },
);

/** Texto nos dois idiomas do site. */
export type LocalizedText = z.infer<typeof localizedLineSchema>;
/** Link do perfil. */
export type SocialLink = z.infer<typeof socialLinkSchema>;
/** Perfil, com os campos privados. */
export type Profile = z.infer<typeof profileSchema>;
/** Experiência profissional. */
export type ExperienceItem = z.infer<typeof experienceItemSchema>;
/** Projeto. */
export type ProjectItem = z.infer<typeof projectItemSchema>;
/** Grupo de habilidades. */
export type SkillGroup = z.infer<typeof skillGroupSchema>;
/** Curso. */
export type EducationItem = z.infer<typeof educationItemSchema>;
/** Prêmio. */
export type AwardItem = z.infer<typeof awardItemSchema>;
/** Idioma. */
export type LanguageItem = z.infer<typeof languageItemSchema>;
/** Bloco do site. */
export type Block = z.infer<typeof blockSchema>;
/** Tipo de bloco. */
export type BlockType = Block["type"];
/** Configuração própria do currículo. */
export type ResumeSettings = z.infer<typeof resumeSettingsSchema>;
/** Documento de conteúdo completo, com os campos privados. */
export type PortfolioDocument = z.infer<typeof portfolioDocumentSchema>;
