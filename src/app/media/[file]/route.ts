import { readFile } from "node:fs/promises";
import path from "node:path";

import { connection, type NextRequest } from "next/server";

import { getServerEnv } from "@/lib/env";
import {
  mediaDirectoryFor,
  parsePhotoFileName,
  photoFileName,
} from "@/lib/media/photo";

function notFound(): Response {
  return new Response("Not Found", {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * Entrega um arquivo de foto de `/data/media`, como
 * `/media/ab12…-480.webp`. O nome é o resumo do conteúdo, então o arquivo
 * nunca muda, e a Cloudflare e o navegador podem guardá-lo por um ano.
 *
 * Só nomes no formato das fotos passam: nada de `..`, barra ou outro arquivo
 * da pasta de dados.
 *
 * @param _request - O pedido.
 * @param context - O nome do arquivo.
 * @returns A imagem, ou 404.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext<"/media/[file]">,
): Promise<Response> {
  await connection();
  const parsed = parsePhotoFileName((await context.params).file);
  const { databasePath } = getServerEnv();
  if (parsed === null || databasePath === null) {
    return notFound();
  }

  let data: Buffer;
  try {
    data = await readFile(
      path.join(
        mediaDirectoryFor(databasePath),
        photoFileName(parsed.id, parsed.width),
      ),
    );
  } catch {
    return notFound();
  }
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
