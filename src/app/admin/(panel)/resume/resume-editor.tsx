"use client";

import { FieldScope } from "@/components/admin/fields";
import { LocalizedField } from "@/components/admin/localized-field";
import { SaveBar } from "@/components/admin/save-bar";
import { cardClass } from "@/components/admin/styles";
import { useDraftEditor } from "@/components/admin/use-draft-editor";
import { toFieldIssues } from "@/content/save-result";
import { resumeSettingsSchema, type ResumeSettings } from "@/content/schema";
import { adminMessages } from "@/i18n/admin";

import { saveResumeSettings } from "../content-actions";

const { editor: messages, fields } = adminMessages;

function validate(resume: ResumeSettings) {
  const result = resumeSettingsSchema.safeParse(resume);
  return result.success ? [] : toFieldIssues(result.error);
}

/**
 * Editor do que é próprio do currículo.
 *
 * @param props.resume - As configurações do rascunho.
 * @param props.version - A versão delas lida junto.
 */
export function ResumeEditor({
  resume: serverValue,
  version,
}: {
  resume: ResumeSettings;
  version: string;
}) {
  const editor = useDraftEditor({
    name: "resume",
    serverValue,
    serverVersion: version,
    save: (baseVersion, resume) =>
      saveResumeSettings({ version: baseVersion, resume }),
    validate,
  });
  const { value: resume, update, errors } = editor;

  return (
    <FieldScope scope={editor.fieldScope}>
      <div className="flex flex-col gap-8">
        <div className={`${cardClass} flex flex-col gap-6`}>
          <LocalizedField
            path="summary"
            label={fields.resumeSummary}
            kind="richText"
            hint={`${fields.resumeSummaryHint} ${messages.markdownHint}`}
            value={resume.summary}
            onChange={(summary) =>
              update((current) => ({ ...current, summary }))
            }
            errors={errors}
          />
        </div>
        <SaveBar editor={editor} />
      </div>
    </FieldScope>
  );
}
