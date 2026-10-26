import type { Metadata } from "next";

import { adminMessages } from "@/i18n/admin";
import { requireAdmin } from "@/lib/auth/require-admin";

import { draftParts, versionOf } from "../draft-parts";
import { loadEditableDraft } from "../editable-draft";

import { ProfileEditor } from "./profile-editor";

const messages = adminMessages.profile;

export const metadata: Metadata = { title: messages.title };

/** Perfil: nomes, título, local, links e contato. */
export default async function ProfilePage() {
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
        <ProfileEditor
          profile={draft.document.profile}
          version={versionOf(draftParts.profile(draft.document))}
        />
      )}
    </div>
  );
}
