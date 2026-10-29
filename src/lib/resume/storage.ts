import "server-only";

import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import type { PublicDocument } from "@/content/public-projection";

import { resumeFiles, type ResumeFile } from "./catalog";
import { RESUME_FORMAT_VERSION } from "./version";

/** A revisão publicada de onde saem os arquivos. */
export type ResumeSource = { revisionId: number; document: PublicDocument };

/** Tamanho de cada arquivo público, em bytes, pelo nome. */
export type ResumeFileSizes = ReadonlyMap<string, number>;

/**
 * A pasta do currículo, ao lado do banco (`/data/cv` no container).
 *
 * @param databasePath - Caminho do banco.
 * @returns A pasta.
 */
export function resumeDirectoryFor(databasePath: string): string {
  return path.join(path.dirname(databasePath), "cv");
}

const FOLDER = /^(\d+)-v(\d+)$/;

/** A pasta de uma revisão, com a versão do formato: `12-v1`. */
function folderName(revisionId: number): string {
  return `${revisionId}-v${RESUME_FORMAT_VERSION}`;
}

/**
 * Apaga as pastas que não servem mais: as de revisões anteriores e as da mesma
 * revisão em outra versão do formato. Uma revisão mais nova fica, mesmo que
 * esta gravação tenha terminado depois dela.
 */
async function pruneOlderFolders(
  root: string,
  revisionId: number,
): Promise<void> {
  for (const entry of await readdir(root)) {
    const match = FOLDER.exec(entry);
    const id = Number(match?.[1] ?? Number.NaN);
    const stale =
      match === null ||
      id < revisionId ||
      (id === revisionId && entry !== folderName(revisionId));
    if (stale) {
      await rm(path.join(root, entry), {
        recursive: true,
        force: true,
      });
    }
  }
}

/**
 * Grava os arquivos públicos de uma revisão e apaga os das anteriores. Cada
 * arquivo é escrito ao lado e renomeado: quem lê nunca vê um arquivo pela
 * metade.
 *
 * @param root - A pasta do currículo.
 * @param revisionId - A revisão publicada.
 * @param files - O conteúdo de cada arquivo, pelo nome.
 */
export async function saveResumeFiles(
  root: string,
  revisionId: number,
  files: ReadonlyMap<string, Buffer>,
): Promise<void> {
  const folder = path.join(root, folderName(revisionId));
  await mkdir(folder, { recursive: true });
  for (const [name, data] of files) {
    const target = path.join(folder, name);
    const temporary = `${target}.${process.pid}.tmp`;
    await writeFile(temporary, data);
    await rename(temporary, target);
  }
  await pruneOlderFolders(root, revisionId);
}

async function readSizes(folder: string): Promise<ResumeFileSizes | null> {
  const sizes = new Map<string, number>();
  for (const file of resumeFiles) {
    try {
      const info = await stat(path.join(folder, file.name));
      sizes.set(file.name, info.size);
    } catch {
      return null;
    }
  }
  return sizes;
}

// Pedidos ao mesmo tempo para uma revisão sem arquivos esperam a mesma
// geração, em vez de gerar cada um a sua.
const pending = new Map<string, Promise<ResumeFileSizes>>();

/**
 * Garante que os quatro arquivos públicos da revisão existem e devolve o
 * tamanho de cada um. Normalmente eles já foram gravados na publicação; faltam
 * na revisão publicada antes do currículo existir, depois de uma mudança do
 * formato ou se a gravação falhou, e então são gerados aqui.
 *
 * @param root - A pasta do currículo.
 * @param source - A revisão publicada.
 * @returns O tamanho de cada arquivo, em bytes.
 */
export async function ensureResumeFiles(
  root: string,
  source: ResumeSource,
): Promise<ResumeFileSizes> {
  const folder = path.join(root, folderName(source.revisionId));
  const running = pending.get(folder);
  if (running !== undefined) {
    return running;
  }
  const task = (async () => {
    const sizes = await readSizes(folder);
    if (sizes !== null) {
      return sizes;
    }
    // Os geradores só carregam quando há o que gerar: a página do site lê
    // os tamanhos a cada visita e não precisa do pdfkit para isso.
    const { renderPublicResumeFiles } = await import("./render");
    const files = await renderPublicResumeFiles(source.document);
    await saveResumeFiles(root, source.revisionId, files);
    console.info(`[cv] arquivos da revisão ${source.revisionId} gerados`);
    return new Map(
      [...files].map(([name, data]) => [name, data.length] as const),
    );
  })().finally(() => pending.delete(folder));
  pending.set(folder, task);
  return task;
}

/**
 * Lê um arquivo público do currículo, gerando os da revisão se faltarem.
 *
 * @param root - A pasta do currículo.
 * @param source - A revisão publicada.
 * @param file - O arquivo.
 * @returns O conteúdo do arquivo.
 */
export async function readResumeFile(
  root: string,
  source: ResumeSource,
  file: ResumeFile,
): Promise<Buffer> {
  await ensureResumeFiles(root, source);
  return readFile(path.join(root, folderName(source.revisionId), file.name));
}
