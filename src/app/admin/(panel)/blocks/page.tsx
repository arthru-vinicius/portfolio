import type { Metadata } from "next";

import { summarizeBlock } from "@/content/editing";
import { adminMessages } from "@/i18n/admin";
import { requireAdmin } from "@/lib/auth/require-admin";

import { draftParts, versionOf } from "../draft-parts";
import { loadEditableDraft } from "../editable-draft";

import { BlockListEditor } from "./block-list-editor";

const messages = adminMessages.blocks;

export const metadata: Metadata = { title: messages.title };

/** Lista de blocos do site: ordem, visibilidade, blocos novos e removidos. */
export default async function BlocksPage() {
  await requireAdmin();
  const draft = loadEditableDraft();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {messages.heading}
        </h1>
        <p className="text-muted">{messages.intro}</p>
      </div>
      {draft === null ? (
        <p role="alert">{adminMessages.home.draftFromNewerVersion}</p>
      ) : (
        <BlockListEditor
          blocks={draft.document.blocks.map(summarizeBlock)}
          version={versionOf(draftParts.blockList(draft.document))}
        />
      )}
    </div>
  );
}
