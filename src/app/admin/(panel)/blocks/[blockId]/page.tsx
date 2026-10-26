import type { Metadata } from "next";

import { linkClass } from "@/components/admin/styles";
import { GuardedLink } from "@/components/admin/unsaved-changes";
import { collectKeywords } from "@/content/editing";
import type { Block } from "@/content/schema";
import { adminMessages } from "@/i18n/admin";
import { requireAdmin } from "@/lib/auth/require-admin";

import { draftParts, versionOf } from "../../draft-parts";
import { loadEditableDraft } from "../../editable-draft";

import { BlockEditor } from "./block-editor";

const messages = adminMessages.blocks;

/** Nome do bloco no painel: o título próprio, se houver, ou o do tipo. */
function blockName(block: Block): string {
  return block.title?.["pt-BR"] || adminMessages.blockTypes[block.type];
}

function findBlock(blockId: string) {
  const draft = loadEditableDraft();
  const block = draft?.document.blocks.find(
    (candidate) => candidate.id === blockId,
  );
  return { draft, block };
}

/**
 * Título da aba com o nome do bloco.
 *
 * @param props.params - O id do bloco.
 * @returns Os metadados da página.
 */
export async function generateMetadata({
  params,
}: PageProps<"/admin/blocks/[blockId]">): Promise<Metadata> {
  await requireAdmin();
  const { block } = findBlock((await params).blockId);
  return {
    title:
      block === undefined
        ? messages.title
        : `${blockName(block)} · ${messages.title}`,
  };
}

/** Um bloco do site: os campos dele e os itens. */
export default async function BlockPage({
  params,
}: PageProps<"/admin/blocks/[blockId]">) {
  await requireAdmin();
  const { draft, block } = findBlock((await params).blockId);

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label={messages.breadcrumb}>
        <GuardedLink href="/admin/blocks" className={linkClass}>
          {messages.backToList}
        </GuardedLink>
      </nav>
      {draft === null ? (
        <p role="alert">{adminMessages.home.draftFromNewerVersion}</p>
      ) : block === undefined ? (
        <>
          <h1 className="text-2xl font-semibold tracking-tight">
            {messages.title}
          </h1>
          <p>{messages.notFound}</p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold tracking-tight">
            {blockName(block)}
          </h1>
          <BlockEditor
            block={block}
            version={versionOf(draftParts.block(block.id)(draft.document))}
            suggestions={collectKeywords(draft.document)}
          />
        </>
      )}
    </div>
  );
}
