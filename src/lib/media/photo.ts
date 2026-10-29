import "server-only";

import { createHash } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import type { ProfilePhoto } from "@/content/schema";

/** Larguras em que a foto é guardada: o celular baixa a menor. */
export const PHOTO_WIDTHS = [480, 960] as const;

/** Uma das larguras da foto. */
export type PhotoWidth = (typeof PHOTO_WIDTHS)[number];

/** Tamanho máximo do arquivo enviado: cabe a foto de qualquer celular. */
export const MAX_PHOTO_UPLOAD_BYTES = 15 * 1024 * 1024;

/** Limite de pixels da imagem de entrada, contra arquivos feitos para estourar a memória. */
const MAX_INPUT_PIXELS = 50_000_000;

const FILE_NAME = /^([0-9a-f]{64})-(480|960)\.webp$/;

/** O arquivo enviado não é uma imagem que dê para ler. */
export class InvalidPhotoError extends Error {
  constructor() {
    super("O arquivo não é uma imagem válida.");
    this.name = "InvalidPhotoError";
  }
}

/**
 * Resposta do envio de foto do painel (`POST /admin/photo`).
 *
 * - `too-large`: passou de `MAX_PHOTO_UPLOAD_BYTES`.
 * - `invalid-image`: não é uma imagem legível.
 * - `forbidden`: o pedido veio de outra origem.
 * - `unavailable`: o servidor está sem a pasta de dados.
 */
export type PhotoUploadResult =
  | { ok: true; photo: ProfilePhoto }
  | {
      ok: false;
      reason: "too-large" | "invalid-image" | "forbidden" | "unavailable";
    };

/** A foto pronta para gravar: os metadados e um arquivo por largura. */
export type ProcessedPhoto = {
  photo: ProfilePhoto;
  files: ReadonlyMap<PhotoWidth, Buffer>;
};

/**
 * Nome do arquivo de uma foto numa largura.
 *
 * @param id - O id da foto.
 * @param width - A largura.
 * @returns Por exemplo, `ab12…-480.webp`.
 */
export function photoFileName(id: string, width: PhotoWidth): string {
  return `${id}-${width}.webp`;
}

/**
 * Lê o nome de um arquivo de foto. Serve também de filtro: nenhum outro nome
 * passa, nem com `..` ou barra.
 *
 * @param name - O nome pedido na URL.
 * @returns O id e a largura, ou `null` se o nome não for de foto.
 */
export function parsePhotoFileName(
  name: string,
): { id: string; width: PhotoWidth } | null {
  const match = FILE_NAME.exec(name);
  if (match === null) {
    return null;
  }
  const [, id = "", width] = match;
  return { id, width: Number(width) as PhotoWidth };
}

/**
 * A pasta das fotos, ao lado do banco (`/data/media` no container).
 *
 * @param databasePath - Caminho do banco.
 * @returns A pasta.
 */
export function mediaDirectoryFor(databasePath: string): string {
  return path.join(path.dirname(databasePath), "media");
}

/**
 * Prepara uma foto enviada pelo painel:
 *
 * - gira pela orientação da câmera e só então descarta os metadados (EXIF,
 *   GPS e afins não saem do servidor);
 * - reduz para cada largura de `PHOTO_WIDTHS`, sem aumentar a original;
 * - grava em WebP.
 *
 * @param input - O arquivo enviado.
 * @returns A foto, com o id tirado do resumo do arquivo maior.
 * @throws {InvalidPhotoError} Se o arquivo não for uma imagem legível.
 */
export async function processPhoto(input: Buffer): Promise<ProcessedPhoto> {
  const files = new Map<PhotoWidth, Buffer>();
  let largest: { width: number; height: number; data: Buffer } | null = null;
  try {
    for (const width of PHOTO_WIDTHS) {
      const { data, info } = await sharp(input, {
        limitInputPixels: MAX_INPUT_PIXELS,
        failOn: "error",
      })
        .rotate()
        .resize({
          width,
          height: width,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 82 })
        .toBuffer({ resolveWithObject: true });
      files.set(width, data);
      largest = { width: info.width, height: info.height, data };
    }
  } catch {
    throw new InvalidPhotoError();
  }
  if (largest === null) {
    throw new InvalidPhotoError();
  }
  const id = createHash("sha256").update(largest.data).digest("hex");
  return {
    photo: { id, width: largest.width, height: largest.height },
    files,
  };
}

/**
 * Grava os arquivos de uma foto na pasta. Cada arquivo é escrito ao lado e
 * renomeado: quem lê nunca vê um arquivo pela metade.
 *
 * @param directory - A pasta das fotos.
 * @param processed - A foto preparada por `processPhoto`.
 */
export async function savePhoto(
  directory: string,
  processed: ProcessedPhoto,
): Promise<void> {
  await mkdir(directory, { recursive: true });
  for (const [width, data] of processed.files) {
    const target = path.join(
      directory,
      photoFileName(processed.photo.id, width),
    );
    const temporary = `${target}.${process.pid}.tmp`;
    await writeFile(temporary, data);
    await rename(temporary, target);
  }
}
