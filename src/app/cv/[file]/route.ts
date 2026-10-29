import { connection, type NextRequest } from "next/server";

import { readPublishedContent } from "@/content/read-published";
import { getServerEnv } from "@/lib/env";
import {
  downloadFileName,
  parseResumeFileName,
  resumeContentTypes,
  resumeDisposition,
} from "@/lib/resume/catalog";
import { RESUME_FORMAT_VERSION } from "@/lib/resume/version";
import { readResumeFile, resumeDirectoryFor } from "@/lib/resume/storage";

function notFound(): Response {
  return new Response("Not Found", {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });
}

/** Se o `If-None-Match` do pedido traz a ETag, com ou sem `W/`. */
function matchesEtag(header: string | null, etag: string): boolean {
  return (header ?? "")
    .split(",")
    .some((candidate) => candidate.trim().replace(/^W\//, "") === etag);
}

/**
 * Entrega o currículo publicado, em PDF, DOCX, Markdown e JSON Resume:
 * `/cv/curriculo.pdf`, `/cv/curriculo.md`, `/cv/resume.json` e assim por
 * diante.
 *
 * A URL não muda a cada publicação. Por isso a resposta sai com
 * `Cache-Control: no-cache` e a ETag da revisão: a Cloudflare e o navegador
 * conferem antes de usar a cópia, e nunca servem um currículo velho depois de
 * publicar.
 *
 * @param request - O pedido.
 * @param context - O nome do arquivo.
 * @returns O arquivo, 304 se a cópia de quem pediu vale, ou 404.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext<"/cv/[file]">,
): Promise<Response> {
  await connection();
  const file = parseResumeFileName((await context.params).file);
  const { databasePath } = getServerEnv();
  if (file === null || databasePath === null) {
    return notFound();
  }
  const content = await readPublishedContent();
  if (content === null) {
    return notFound();
  }
  const { publicOrigin } = getServerEnv();

  const etag = `"${content.revisionId}-v${RESUME_FORMAT_VERSION}"`;
  const headers = {
    "Cache-Control": "public, no-cache",
    ETag: etag,
  };
  if (matchesEtag(request.headers.get("if-none-match"), etag)) {
    return new Response(null, { status: 304, headers });
  }

  const data = await readResumeFile(
    resumeDirectoryFor(databasePath),
    { ...content, origin: publicOrigin },
    file,
  );
  return new Response(new Uint8Array(data), {
    headers: {
      ...headers,
      "Content-Type": resumeContentTypes[file.format],
      "Content-Disposition": `${resumeDisposition(file.format)}; filename="${downloadFileName(content.document.profile.displayName, file)}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
