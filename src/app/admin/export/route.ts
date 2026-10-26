import { notFound } from "next/navigation";
import type { NextRequest } from "next/server";

import { NewerDocumentVersionError } from "@/content/migrations";
import type { PortfolioDocument } from "@/content/schema";
import { formatIsoDate } from "@/i18n/format";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getDatabase } from "@/lib/db/database";
import { readDraft } from "@/lib/db/draft";
import { readLatestRevision, readRevision } from "@/lib/db/revisions";

type Export = { document: PortfolioDocument; fileName: string };

function findExport(revisionParam: string | null): Export | null {
  const db = getDatabase();
  if (revisionParam !== null) {
    const id = /^[1-9]\d{0,9}$/.test(revisionParam) ? Number(revisionParam) : 0;
    const revision = id === 0 ? null : readRevision(db, id);
    return revision === null
      ? null
      : {
          document: revision.document,
          fileName: `portfolio-revisao-${revision.id}.json`,
        };
  }

  const draft = readDraft(db);
  if (draft !== null) {
    return {
      document: draft.document,
      fileName: `portfolio-rascunho-${formatIsoDate()}.json`,
    };
  }
  const latest = readLatestRevision(db);
  return latest === null
    ? null
    : {
        document: latest.document,
        fileName: `portfolio-revisao-${latest.id}.json`,
      };
}

/**
 * Baixa o conteúdo em JSON, com os campos privados: é a cópia de segurança do
 * painel, e o arquivo volta pelo Importar.
 *
 * - Sem parâmetro: o rascunho, ou a última revisão publicada se ainda não há
 *   rascunho.
 * - `?revision=12`: a revisão 12.
 *
 * Responde 404 se não houver o que baixar, e 409 se o documento foi gravado
 * por uma versão mais nova do painel (depois de um rollback do deploy).
 *
 * @param request - O pedido.
 * @returns O arquivo JSON, para baixar.
 */
export async function GET(request: NextRequest): Promise<Response> {
  await requireAdmin();

  let found: Export | null;
  try {
    found = findExport(request.nextUrl.searchParams.get("revision"));
  } catch (error) {
    if (error instanceof NewerDocumentVersionError) {
      return new Response(
        "Este conteúdo foi salvo por uma versão mais recente do painel.",
        {
          status: 409,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        },
      );
    }
    throw error;
  }
  if (found === null) {
    notFound();
  }

  console.info(`[admin] conteúdo exportado: ${found.fileName}`);
  return new Response(`${JSON.stringify(found.document, null, 2)}\n`, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${found.fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
