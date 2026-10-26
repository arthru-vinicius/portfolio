import type { Metadata } from "next";

import { adminMessages } from "@/i18n/admin";
import { requireAdmin } from "@/lib/auth/require-admin";

import { draftParts, versionOf } from "../draft-parts";
import { loadEditableDraft } from "../editable-draft";

import { ResumeEditor } from "./resume-editor";

const messages = adminMessages.resume;

export const metadata: Metadata = { title: messages.title };

/** O que é próprio do currículo, como o resumo profissional. */
export default async function ResumePage() {
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
        <ResumeEditor
          resume={draft.document.resume}
          version={versionOf(draftParts.resume(draft.document))}
        />
      )}
    </div>
  );
}
