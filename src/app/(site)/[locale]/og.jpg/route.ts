import path from "node:path";

import { cacheLife, cacheTag } from "next/cache";
import { connection, type NextRequest } from "next/server";
import sharp from "sharp";

import {
  CONTENT_CACHE_TAG,
  readPublishedContent,
} from "@/content/read-published";
import { localeFromPath, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getServerEnv } from "@/lib/env";
import { mediaDirectoryFor, photoFileName } from "@/lib/media/photo";
import { renderShareImage } from "@/lib/seo/share-image";

function notFound(): Response {
  return new Response("Not Found", {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });
}

/** A foto do perfil em PNG, para o gerador de imagem, que não lê WebP. */
async function photoAsPng(id: string): Promise<Buffer | null> {
  const { databasePath } = getServerEnv();
  if (databasePath === null) {
    return null;
  }
  try {
    return await sharp(
      path.join(mediaDirectoryFor(databasePath), photoFileName(id, 480)),
    )
      .png()
      .toBuffer();
  } catch {
    // Sem a foto, a imagem sai só com o texto.
    return null;
  }
}

/**
 * A imagem de um idioma, em cache até a próxima publicação: gerar custa, e o
 * endereço com `?v=` qualquer não pode forçar uma geração nova.
 */
async function shareImage(locale: Locale): Promise<Uint8Array | null> {
  "use cache";
  cacheLife("max");
  cacheTag(CONTENT_CACHE_TAG);

  const content = await readPublishedContent();
  if (content === null) {
    return null;
  }
  const { profile } = content.document;
  const { publicOrigin } = getServerEnv();
  const png = await renderShareImage({
    label: getDictionary(locale).metadata.imageLabel,
    host: publicOrigin === null ? null : new URL(publicOrigin).host,
    name: profile.displayName,
    headline: profile.headline[locale],
    location: profile.location[locale],
    photo:
      profile.photo === undefined ? null : await photoAsPng(profile.photo.id),
  });
  return Uint8Array.from(
    await sharp(png).jpeg({ quality: 82, mozjpeg: true }).toBuffer(),
  );
}

/**
 * A imagem de compartilhamento (Open Graph) de um idioma: `/pt/og.jpg` e
 * `/en/og.jpg`. Sai em JPEG para ficar leve: com a foto, o PNG passa dos
 * 300 kB, e algumas redes, como o WhatsApp, deixam de mostrar a prévia. Os metadados da página apontam para ela com `?v=<revisão>`,
 * então as redes buscam a imagem nova depois de cada publicação.
 *
 * @param _request - O pedido.
 * @param context - O idioma.
 * @returns A imagem em JPEG, ou 404 sem idioma válido ou sem nada publicado.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext<"/[locale]/og.jpg">,
): Promise<Response> {
  await connection();
  const locale = localeFromPath((await context.params).locale);
  if (locale === null) {
    return notFound();
  }
  const image = await shareImage(locale);
  if (image === null) {
    return notFound();
  }
  return new Response(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
