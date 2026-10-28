"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  applyBlockList,
  BlockListMismatchError,
  blockTypes,
  replaceBlock,
  summarizeBlock,
  type BlockListEntry,
  type BlockSummary,
} from "@/content/editing";
import {
  ContentFileSyntaxError,
  parseContentFile,
} from "@/content/content-file";
import {
  migrateDocument,
  NewerDocumentVersionError,
} from "@/content/migrations";
import {
  toFieldIssues,
  type ImportResult,
  type SaveResult,
} from "@/content/save-result";
import {
  blockSchema,
  contentLimits,
  profileSchema,
  resumeSettingsSchema,
  type Block,
  type PortfolioDocument,
  type Profile,
  type ResumeSettings,
} from "@/content/schema";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getDatabase } from "@/lib/db/database";
import {
  DraftConflictError,
  readEditableDraft,
  updateDraft,
} from "@/lib/db/draft";

import { draftParts, versionOf } from "./draft-parts";

// Cada action confere a sessão antes de ler o pedido, valida o que chegou com
// o schema (o pedido pode não ter vindo do painel) e só então grava.

const versionSchema = z.string().max(100);

/** O tamanho máximo do arquivo importado, abaixo do limite das Server Actions. */
const IMPORT_LIMIT = 900_000;

type Part = (document: PortfolioDocument) => unknown;

type Edit<T> = {
  /** O que foi editado, para o log. */
  what: string;
  /** A parte editada, e a versão dela que a página abriu. */
  part: Part;
  baseVersion: string;
  change: (document: PortfolioDocument) => PortfolioDocument;
  /** O que devolver à página, tirado do documento salvo. */
  pick: (document: PortfolioDocument) => T;
  /** Onde a parte fica no documento, para os caminhos dos erros. */
  prefixOf: (document: PortfolioDocument) => PropertyKey[];
};

/**
 * Grava a mudança no rascunho, desde que a parte editada não tenha mudado
 * desde que a página abriu, e traduz as recusas para a resposta do painel.
 */
function persist<T>(edit: Edit<T>): SaveResult<T> {
  // O documento novo, guardado para achar o caminho de um erro de validação.
  const attempt: { changed?: PortfolioDocument } = {};
  try {
    const db = getDatabase();
    const current = readEditableDraft(db);
    if (versionOf(edit.part(current.document)) !== edit.baseVersion) {
      return { ok: false, reason: "conflict" };
    }
    // A leitura acima e a gravação rodam sem pausa no meio (o `node:sqlite` é
    // síncrono); a `lockVersion` confirma que nada mudou entre as duas.
    const draft = updateDraft(db, current.lockVersion, (document) => {
      attempt.changed = edit.change(document);
      return attempt.changed;
    });
    // Atualiza a página atual na mesma resposta, e as outras do painel na
    // próxima visita.
    revalidatePath("/admin", "layout");
    console.info(
      `[admin] rascunho salvo: ${edit.what} (versão ${draft.lockVersion})`,
    );
    return {
      ok: true,
      version: versionOf(edit.part(draft.document)),
      savedAt: draft.updatedAt,
      saved: edit.pick(draft.document),
    };
  } catch (error) {
    if (
      error instanceof DraftConflictError ||
      error instanceof BlockListMismatchError
    ) {
      return { ok: false, reason: "conflict" };
    }
    if (error instanceof NewerDocumentVersionError) {
      return { ok: false, reason: "newer-version" };
    }
    if (error instanceof z.ZodError) {
      const prefix =
        attempt.changed === undefined ? [] : edit.prefixOf(attempt.changed);
      return {
        ok: false,
        reason: "invalid",
        issues: toFieldIssues(error, prefix),
      };
    }
    throw error;
  }
}

function invalidInput<T>(
  error: z.ZodError,
  prefix: PropertyKey[],
): SaveResult<T> {
  return { ok: false, reason: "invalid", issues: toFieldIssues(error, prefix) };
}

const saveProfileInput = z.object({
  version: versionSchema,
  profile: profileSchema,
});

/**
 * Salva o perfil no rascunho.
 *
 * @param input - A versão do perfil que a página abriu e o perfil editado.
 * @returns O perfil salvo (normalizado pelo schema), ou o motivo da recusa.
 */
export async function saveProfile(input: {
  version: string;
  profile: Profile;
}): Promise<SaveResult<Profile>> {
  await requireAdmin();
  const parsed = saveProfileInput.safeParse(input);
  if (!parsed.success) {
    return invalidInput(parsed.error, ["profile"]);
  }
  const { version, profile } = parsed.data;
  return persist({
    what: "perfil",
    part: draftParts.profile,
    baseVersion: version,
    change: (document) => ({ ...document, profile }),
    pick: draftParts.profile,
    prefixOf: () => ["profile"],
  });
}

const blockListEntrySchema = z.union([
  // O bloco novo vem primeiro: sem isso, o outro formato aceitaria o pedido e
  // descartaria o `newType`.
  z.object({
    id: z.uuid(),
    visible: z.boolean(),
    newType: z.enum(blockTypes),
  }),
  z.object({ id: z.uuid(), visible: z.boolean() }),
]);

const saveBlockListInput = z.object({
  version: versionSchema,
  blocks: z.array(blockListEntrySchema).max(contentLimits.blocks),
});

/**
 * Salva a lista de blocos: a ordem, a visibilidade, os blocos novos e os
 * removidos. O conteúdo dos blocos existentes não vem do pedido: sai do
 * próprio rascunho.
 *
 * @param input - A versão da lista que a página abriu e a lista nova, na
 *   ordem do site.
 * @returns Os resumos dos blocos salvos, ou o motivo da recusa.
 */
export async function saveBlockList(input: {
  version: string;
  blocks: BlockListEntry[];
}): Promise<SaveResult<BlockSummary[]>> {
  await requireAdmin();
  const parsed = saveBlockListInput.safeParse(input);
  if (!parsed.success) {
    return invalidInput(parsed.error, ["blocks"]);
  }
  const { version, blocks } = parsed.data;
  return persist({
    what: "lista de blocos",
    part: draftParts.blockList,
    baseVersion: version,
    change: (document) => applyBlockList(document, blocks),
    pick: (document) => document.blocks.map(summarizeBlock),
    prefixOf: () => ["blocks"],
  });
}

const saveBlockInput = z.object({
  version: versionSchema,
  block: blockSchema,
});

/**
 * Salva um bloco, com os itens dele, no lugar da versão anterior.
 *
 * @param input - A versão do bloco que a página abriu e o bloco editado (o
 *   mesmo id e o mesmo tipo de um bloco do rascunho).
 * @returns O bloco salvo, ou o motivo da recusa.
 */
export async function saveBlock(input: {
  version: string;
  block: Block;
}): Promise<SaveResult<Block>> {
  await requireAdmin();
  const parsed = saveBlockInput.safeParse(input);
  if (!parsed.success) {
    return invalidInput(parsed.error, ["block"]);
  }
  const { version, block } = parsed.data;
  const part = draftParts.block(block.id);
  return persist({
    what: `bloco ${block.type}`,
    part,
    baseVersion: version,
    change: (document) => replaceBlock(document, block),
    pick: (document) => {
      const saved = part(document);
      if (saved === null) {
        throw new Error(`o bloco ${block.id} sumiu depois de salvo`);
      }
      return saved;
    },
    prefixOf: (document) => [
      "blocks",
      document.blocks.findIndex((candidate) => candidate.id === block.id),
    ],
  });
}

const saveResumeInput = z.object({
  version: versionSchema,
  resume: resumeSettingsSchema,
});

/**
 * Salva o que é próprio do currículo, como o resumo profissional.
 *
 * @param input - A versão que a página abriu e as configurações editadas.
 * @returns As configurações salvas, ou o motivo da recusa.
 */
export async function saveResumeSettings(input: {
  version: string;
  resume: ResumeSettings;
}): Promise<SaveResult<ResumeSettings>> {
  await requireAdmin();
  const parsed = saveResumeInput.safeParse(input);
  if (!parsed.success) {
    return invalidInput(parsed.error, ["resume"]);
  }
  const { version, resume } = parsed.data;
  return persist({
    what: "currículo",
    part: draftParts.resume,
    baseVersion: version,
    change: (document) => ({ ...document, resume }),
    pick: draftParts.resume,
    prefixOf: () => ["resume"],
  });
}

const importInput = z.object({
  version: versionSchema,
  text: z.string().max(IMPORT_LIMIT),
});

/**
 * Troca o rascunho pelo documento de um arquivo de conteúdo, em YAML ou JSON
 * (por exemplo, uma cópia exportada). Itens sem `id` ganham um, e documentos
 * de versões antigas do schema sobem para a atual. Nada é publicado.
 *
 * @param input - A versão do documento que a página abriu e o texto do
 *   arquivo.
 * @returns O resultado; nos erros de validação, os caminhos são do documento
 *   inteiro.
 */
export async function importDocument(input: {
  version: string;
  text: string;
}): Promise<ImportResult> {
  await requireAdmin();
  const parsed = importInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, reason: "unreadable" };
  }

  let data: unknown;
  try {
    data = parseContentFile(parsed.data.text);
  } catch (error) {
    if (error instanceof ContentFileSyntaxError) {
      return error.line === undefined
        ? { ok: false, reason: "unreadable" }
        : { ok: false, reason: "unreadable", line: error.line };
    }
    throw error;
  }

  let imported: PortfolioDocument;
  try {
    imported = migrateDocument(data);
  } catch (error) {
    if (error instanceof NewerDocumentVersionError) {
      return { ok: false, reason: "newer-version" };
    }
    if (error instanceof z.ZodError) {
      return { ok: false, reason: "invalid", issues: toFieldIssues(error) };
    }
    throw error;
  }

  return persist({
    what: "importação do arquivo de conteúdo",
    part: draftParts.document,
    baseVersion: parsed.data.version,
    change: () => imported,
    pick: () => null,
    prefixOf: () => [],
  });
}
