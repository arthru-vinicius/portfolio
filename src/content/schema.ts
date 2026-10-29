import { z } from "zod";

// O painel valida com estes schemas também no navegador, e a CSP do site não
// deixa usar `eval`. Sem isto, o zod testa `Function("")` para compilar os
// validadores, e o navegador registra a tentativa como violação da CSP.
z.config({ jitless: true });

/**
 * Versão atual do documento de conteúdo. Só sobe com mudança incompatível: um
 * campo novo e opcional não muda a versão, e assim a imagem anterior continua
 * lendo o documento depois de um rollback do deploy.
 */
export const CURRENT_SCHEMA_VERSION = 1;

/**
 * Limites de tamanho do conteúdo. Barram textos acidentais na importação de
 * JSON e no banco, e o painel usa os mesmos números nos campos.
 */
export const contentLimits = {
  /** Nomes, títulos, cargos e locais. */
  line: 200,
  /** Uma frase, como o resumo de um projeto ou um destaque. */
  sentence: 500,
  /** Texto com Markdown, como uma descrição ou o "Sobre". */
  richText: 5000,
  /** Uma tecnologia ou habilidade. */
  keyword: 60,
  /** Itens de uma lista. */
  listItems: 50,
  /** Links do perfil. */
  links: 20,
  /** Blocos do documento. */
  blocks: 30,
} as const;

// As mensagens aparecem no painel, embaixo do campo, e na importação de JSON.
const text = (max: number) =>
  z.string().trim().max(max, `use até ${max} caracteres`);

const localized = (max: number) =>
  z.object({
    "pt-BR": text(max),
    en: text(max),
  });

/**
 * Texto curto nos dois idiomas do site: títulos, cargos e locais. O rascunho
 * aceita vazio; a publicação exige os dois idiomas.
 */
export const localizedLineSchema = localized(contentLimits.line);

/** Frase nos dois idiomas, como um destaque de experiência ou o resumo de um projeto. */
export const localizedSentenceSchema = localized(contentLimits.sentence);

/**
 * Texto longo nos dois idiomas, escrito com o subconjunto de Markdown do site
 * (parágrafos, negrito, itálico, código, links e listas, sem HTML).
 */
export const localizedRichTextSchema = localized(contentLimits.richText);

/** Mês no formato `AAAA-MM`. O site e o currículo formatam com `Intl`. */
export const yearMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "use o formato AAAA-MM");

const idSchema = z.uuid();
const urlSchema = z
  .httpUrl("use um endereço completo, começando com https://")
  .max(500, "use até 500 caracteres");

const listOf = <T extends z.ZodType>(
  item: T,
  max: number = contentLimits.listItems,
) => z.array(item).max(max, `use até ${max} itens`);

/** Palavras-chave (tecnologias, habilidades) escritas como o mercado escreve, sem repetir. */
const keywordsSchema = listOf(
  text(contentLimits.keyword).min(1, "a etiqueta está vazia"),
).refine(
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
    error: "dê um nome a este link",
    path: ["label"],
  });

/**
 * Foto do perfil, enviada pelo painel. O `id` é o resumo SHA-256 do arquivo
 * maior: a mesma foto tem sempre o mesmo id, e uma foto nova, outro. Assim os
 * arquivos nunca mudam, e uma revisão antiga continua apontando para a foto
 * dela.
 */
export const profilePhotoSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{64}$/, "foto inválida"),
  /** Medidas do arquivo maior, em px, para a página reservar o espaço. */
  width: z.number().int().positive().max(4000),
  height: z.number().int().positive().max(4000),
});

/** Perfil: quem é a pessoa e como encontrá-la. */
export const profileSchema = z.object({
  /** Nome completo, usado no currículo. */
  fullName: text(contentLimits.line),
  /** Nome curto, usado no site. */
  displayName: text(contentLimits.line),
  headline: localizedLineSchema,
  location: localizedLineSchema,
  /** Opcional: sem foto, o topo do site ocupa a largura toda com o texto. */
  photo: profilePhotoSchema.optional(),
  links: listOf(socialLinkSchema, contentLimits.links),
  /** E-mail do currículo. */
  publicEmail: z
    .email("use um e-mail válido")
    .max(254, "use até 254 caracteres")
    .optional(),
  /** Campos que nunca saem do painel (ver `toPublicDocument`). */
  private: z.object({
    phone: text(40).optional(),
  }),
});

/** Uma experiência profissional. `end: null` é o emprego atual. */
export const experienceItemSchema = z
  .object({
    ...itemBase,
    company: text(contentLimits.line),
    companyUrl: urlSchema.optional(),
    role: localizedLineSchema,
    location: localizedLineSchema,
    workMode: z.enum(["onsite", "hybrid", "remote"]).optional(),
    start: yearMonthSchema,
    end: yearMonthSchema.nullable(),
    summary: localizedRichTextSchema,
    highlights: listOf(
      z.object({
        id: idSchema,
        text: localizedSentenceSchema,
        inResume: z.boolean(),
      }),
    ),
    technologies: keywordsSchema,
  })
  .refine(endNotBeforeStart, endNotBeforeStartError);

/** Um projeto. Sem `repositoryUrl` quando o código não é público. */
export const projectItemSchema = z.object({
  ...itemBase,
  name: text(contentLimits.line),
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
    institution: text(contentLimits.line),
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
  issuer: text(contentLimits.line),
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
  blocks: listOf(blockSchema, contentLimits.blocks),
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
/** Foto do perfil. */
export type ProfilePhoto = z.infer<typeof profilePhotoSchema>;
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
