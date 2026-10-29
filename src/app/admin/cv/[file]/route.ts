import { notFound } from "next/navigation";
import type { NextRequest } from "next/server";

import { toPublicDocument } from "@/content/public-projection";
import { adminMessages } from "@/i18n/admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  downloadFileName,
  parseResumeFileName,
  resumeContentTypes,
} from "@/lib/resume/catalog";
import { renderResumeFile } from "@/lib/resume/render";

import { loadEditableDraft } from "../../(panel)/editable-draft";

const messages = adminMessages.resume;

/**
 * Gera o currículo do rascunho, na hora, para conferir antes de publicar:
 * `/admin/cv/curriculo.pdf` e os outros nomes de `/cv`.
 *
 * - Sem parâmetro: a versão pública, sem telefone.
 * - `?full=1`: a versão completa, com o telefone do campo privado. Ela é
 *   entregue só nesta resposta e nunca gravada junto dos arquivos públicos.
 *
 * Responde 404 se o nome não for de um arquivo do currículo, se a versão
 * completa for pedida sem telefone no perfil ou se o rascunho for de uma
 * versão mais nova do painel.
 *
 * @param request - O pedido.
 * @param context - O nome do arquivo.
 * @returns O arquivo.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext<"/admin/cv/[file]">,
): Promise<Response> {
  await requireAdmin();
  const file = parseResumeFileName((await context.params).file);
  const draft = loadEditableDraft();
  const full = request.nextUrl.searchParams.get("full") === "1";
  const phone = draft?.document.profile.private.phone;
  if (file === null || draft === null || (full && phone === undefined)) {
    notFound();
  }

  const data = await renderResumeFile(
    toPublicDocument(draft.document),
    file,
    full ? { phone } : {},
  );
  const name = downloadFileName(
    draft.document.profile.displayName,
    file,
    full ? messages.fullSuffix : messages.draftSuffix,
  );
  const disposition = file.format === "pdf" ? "inline" : "attachment";
  console.info(
    `[admin] currículo do rascunho gerado: ${file.name}${full ? " (completo)" : ""}`,
  );
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": resumeContentTypes[file.format],
      "Content-Disposition": `${disposition}; filename="${name}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
