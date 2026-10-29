import type { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getServerEnv } from "@/lib/env";
import {
  InvalidPhotoError,
  MAX_PHOTO_UPLOAD_BYTES,
  mediaDirectoryFor,
  processPhoto,
  savePhoto,
  type PhotoUploadResult,
} from "@/lib/media/photo";

function reply(result: PhotoUploadResult, status = 200): Response {
  return Response.json(result, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/** Lê o corpo até o limite; passou dele, para de ler e devolve `null`. */
async function readLimited(
  body: ReadableStream<Uint8Array> | null,
  limit: number,
): Promise<Buffer | null> {
  if (body === null) {
    return Buffer.alloc(0);
  }
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      return Buffer.concat(chunks);
    }
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
}

/**
 * Recebe a foto do perfil, enviada pelo painel como o próprio arquivo no
 * corpo. Ela é girada, reduzida, regravada em WebP sem os metadados e salva
 * em `/data/media`. A resposta traz o id, que o editor do perfil guarda no
 * rascunho: a foto só aparece no site depois de salvar e publicar.
 *
 * É um route handler, e não uma Server Action, porque as actions param em
 * 1 MB, e foto de celular passa disso.
 *
 * @param request - O pedido, com a imagem no corpo.
 * @returns A foto gravada, ou o motivo da recusa.
 */
export async function POST(request: NextRequest): Promise<Response> {
  await requireAdmin();

  // O cookie da sessão já é `SameSite=Strict`; conferir a origem fecha a
  // porta de um formulário de outro site que tente usar a sessão.
  const origin = request.headers.get("origin");
  if (origin !== null) {
    let sameHost = false;
    try {
      sameHost = new URL(origin).host === request.headers.get("host");
    } catch {
      sameHost = false;
    }
    if (!sameHost) {
      return reply({ ok: false, reason: "forbidden" }, 403);
    }
  }

  const { databasePath } = getServerEnv();
  if (databasePath === null) {
    return reply({ ok: false, reason: "unavailable" }, 503);
  }
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_PHOTO_UPLOAD_BYTES) {
    return reply({ ok: false, reason: "too-large" }, 413);
  }
  const body = await readLimited(request.body, MAX_PHOTO_UPLOAD_BYTES);
  if (body === null) {
    return reply({ ok: false, reason: "too-large" }, 413);
  }

  try {
    const processed = await processPhoto(body);
    await savePhoto(mediaDirectoryFor(databasePath), processed);
    console.info(`[admin] foto recebida: ${processed.photo.id}`);
    return reply({ ok: true, photo: processed.photo });
  } catch (error) {
    if (error instanceof InvalidPhotoError) {
      return reply({ ok: false, reason: "invalid-image" }, 400);
    }
    throw error;
  }
}
