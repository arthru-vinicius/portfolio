"use client";

import { useId, useState } from "react";

import {
  CheckboxField,
  MonthField,
  SelectField,
  TextField,
} from "@/components/admin/fields";
import {
  focusFirstAvailable,
  focusTargetsAfterRemoval,
  ItemControls,
} from "@/components/admin/item-controls";
import { KeywordsField } from "@/components/admin/keywords-field";
import { LocalizedField } from "@/components/admin/localized-field";
import { secondaryButtonClass } from "@/components/admin/styles";
import { createHighlight, moveInList } from "@/content/editing";
import type {
  AwardItem,
  EducationItem,
  ExperienceItem,
  LanguageItem,
  ProjectItem,
  SkillGroup,
} from "@/content/schema";
import { contentLimits } from "@/content/schema";
import { adminMessages } from "@/i18n/admin";

const { fields, editor: messages, workModes } = adminMessages;

/** Propriedades de todo formulário de item. */
export type ItemFormProps<T> = {
  item: T;
  onChange: (item: T) => void;
  /** Caminho do item no bloco, como `items.2`. */
  path: string;
  errors: Readonly<Record<string, string>>;
  /** Etiquetas já usadas no documento. */
  suggestions: readonly string[];
};

/** Texto vazio vira campo ausente, como o schema espera dos opcionais. */
const optional = (text: string) => (text.trim() === "" ? undefined : text);

/** "Visível no site" e "No currículo", comuns a todo item. */
function VisibilityFields<T extends { visible: boolean; inResume: boolean }>({
  item,
  onChange,
  path,
}: Pick<ItemFormProps<T>, "item" | "onChange" | "path">) {
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-2">
      <CheckboxField
        path={`${path}.visible`}
        label={messages.visible}
        checked={item.visible}
        onChange={(visible) => onChange({ ...item, visible })}
      />
      <CheckboxField
        path={`${path}.inResume`}
        label={messages.inResume}
        hint={messages.inResumeHint}
        checked={item.inResume}
        onChange={(inResume) => onChange({ ...item, inResume })}
      />
    </div>
  );
}

const workModeOptions = [
  { value: "none", label: workModes.none },
  { value: "onsite", label: workModes.onsite },
  { value: "hybrid", label: workModes.hybrid },
  { value: "remote", label: workModes.remote },
] as const;

/** Formulário de uma experiência. */
export function ExperienceForm({
  item,
  onChange,
  path,
  errors,
  suggestions,
}: ItemFormProps<ExperienceItem>) {
  const set = <K extends keyof ExperienceItem>(
    key: K,
    value: ExperienceItem[K],
  ) => onChange({ ...item, [key]: value });

  return (
    <>
      <VisibilityFields item={item} onChange={onChange} path={path} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          path={`${path}.company`}
          label={fields.company}
          value={item.company}
          onChange={(company) => set("company", company)}
          maxLength={contentLimits.line}
          error={errors[`${path}.company`]}
        />
        <TextField
          path={`${path}.companyUrl`}
          type="url"
          label={fields.companyUrl}
          value={item.companyUrl ?? ""}
          onChange={(url) => set("companyUrl", optional(url))}
          placeholder="https://"
          error={errors[`${path}.companyUrl`]}
        />
      </div>
      <LocalizedField
        path={`${path}.role`}
        label={fields.role}
        value={item.role}
        onChange={(role) => set("role", role)}
        errors={errors}
      />
      <LocalizedField
        path={`${path}.location`}
        label={fields.location}
        value={item.location}
        onChange={(location) => set("location", location)}
        errors={errors}
      />
      <div className="grid gap-5 sm:grid-cols-3">
        <SelectField
          path={`${path}.workMode`}
          label={fields.workMode}
          value={item.workMode ?? "none"}
          onChange={(mode) =>
            set("workMode", mode === "none" ? undefined : mode)
          }
          options={workModeOptions}
        />
        <MonthField
          path={`${path}.start`}
          label={fields.start}
          value={item.start}
          onChange={(start) => set("start", start)}
          error={errors[`${path}.start`]}
        />
        <MonthField
          path={`${path}.end`}
          label={fields.end}
          value={item.end ?? ""}
          onChange={(end) => set("end", end)}
          disabled={item.end === null}
          error={errors[`${path}.end`]}
        />
      </div>
      <CheckboxField
        path={`${path}.current`}
        label={fields.currentJob}
        checked={item.end === null}
        onChange={(current) => set("end", current ? null : item.start)}
      />
      <LocalizedField
        path={`${path}.summary`}
        label={fields.summary}
        kind="richText"
        hint={messages.markdownHint}
        value={item.summary}
        onChange={(summary) => set("summary", summary)}
        errors={errors}
      />
      <HighlightsEditor
        highlights={item.highlights}
        onChange={(highlights) => set("highlights", highlights)}
        path={`${path}.highlights`}
        errors={errors}
      />
      <KeywordsField
        path={`${path}.technologies`}
        label={fields.technologies}
        value={item.technologies}
        onChange={(technologies) => set("technologies", technologies)}
        suggestions={suggestions}
        errors={errors}
      />
    </>
  );
}

type Highlight = ExperienceItem["highlights"][number];

function HighlightsEditor({
  highlights,
  onChange,
  path,
  errors,
}: {
  highlights: readonly Highlight[];
  onChange: (highlights: Highlight[]) => void;
  path: string;
  errors: Readonly<Record<string, string>>;
}) {
  const [announcement, setAnnouncement] = useState("");
  const addButtonId = useId();
  const replace = (index: number, highlight: Highlight) =>
    onChange(
      highlights.map((current, position) =>
        position === index ? highlight : current,
      ),
    );

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-1 font-medium">{fields.highlights}</legend>
      <p className="text-sm text-muted">{fields.highlightsHint}</p>
      {highlights.length > 0 && (
        <ol className="flex flex-col gap-4">
          {highlights.map((highlight, index) => {
            const name = fields.highlight(index + 1);
            const highlightPath = `${path}.${index}`;
            return (
              <li
                key={highlight.id}
                className="flex flex-col gap-3 rounded-md border border-control p-4"
              >
                <LocalizedField
                  path={`${highlightPath}.text`}
                  label={name}
                  kind="sentence"
                  value={highlight.text}
                  onChange={(text) => replace(index, { ...highlight, text })}
                  errors={errors}
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CheckboxField
                    path={`${highlightPath}.inResume`}
                    label={messages.inResume}
                    checked={highlight.inResume}
                    onChange={(inResume) =>
                      replace(index, { ...highlight, inResume })
                    }
                  />
                  <ItemControls
                    id={`highlight-${highlight.id}`}
                    name={name}
                    index={index}
                    total={highlights.length}
                    onMove={(offset) => {
                      onChange(moveInList(highlights, index, offset));
                      setAnnouncement(
                        messages.moved(
                          name,
                          index + offset + 1,
                          highlights.length,
                        ),
                      );
                    }}
                    onRemove={() => {
                      onChange(
                        highlights.filter(
                          (current) => current.id !== highlight.id,
                        ),
                      );
                      focusFirstAvailable(
                        focusTargetsAfterRemoval(
                          "highlight-",
                          highlights.map(({ id }) => id),
                          index,
                          addButtonId,
                        ),
                      );
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <div>
        <button
          id={addButtonId}
          type="button"
          onClick={() => onChange([...highlights, createHighlight()])}
          disabled={highlights.length >= contentLimits.listItems}
          className={secondaryButtonClass}
        >
          {fields.addHighlight}
        </button>
      </div>
    </fieldset>
  );
}

/** Formulário de um projeto. */
export function ProjectForm({
  item,
  onChange,
  path,
  errors,
  suggestions,
}: ItemFormProps<ProjectItem>) {
  const set = <K extends keyof ProjectItem>(key: K, value: ProjectItem[K]) =>
    onChange({ ...item, [key]: value });

  return (
    <>
      <VisibilityFields item={item} onChange={onChange} path={path} />
      <TextField
        path={`${path}.name`}
        label={fields.name}
        value={item.name}
        onChange={(name) => set("name", name)}
        maxLength={contentLimits.line}
        error={errors[`${path}.name`]}
      />
      <LocalizedField
        path={`${path}.summary`}
        label={fields.summary}
        kind="sentence"
        hint={fields.projectSummaryHint}
        value={item.summary}
        onChange={(summary) => set("summary", summary)}
        errors={errors}
      />
      <LocalizedField
        path={`${path}.description`}
        label={fields.description}
        kind="richText"
        hint={messages.markdownHint}
        value={item.description}
        onChange={(description) => set("description", description)}
        errors={errors}
      />
      <KeywordsField
        path={`${path}.technologies`}
        label={fields.technologies}
        value={item.technologies}
        onChange={(technologies) => set("technologies", technologies)}
        suggestions={suggestions}
        errors={errors}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          path={`${path}.repositoryUrl`}
          type="url"
          label={fields.repositoryUrl}
          hint={fields.repositoryUrlHint}
          value={item.repositoryUrl ?? ""}
          onChange={(url) => set("repositoryUrl", optional(url))}
          placeholder="https://"
          error={errors[`${path}.repositoryUrl`]}
        />
        <TextField
          path={`${path}.websiteUrl`}
          type="url"
          label={fields.websiteUrl}
          value={item.websiteUrl ?? ""}
          onChange={(url) => set("websiteUrl", optional(url))}
          placeholder="https://"
          error={errors[`${path}.websiteUrl`]}
        />
      </div>
    </>
  );
}

/** Formulário de um grupo de habilidades. */
export function SkillGroupForm({
  item,
  onChange,
  path,
  errors,
  suggestions,
}: ItemFormProps<SkillGroup>) {
  return (
    <>
      <VisibilityFields item={item} onChange={onChange} path={path} />
      <LocalizedField
        path={`${path}.name`}
        label={fields.name}
        value={item.name}
        onChange={(name) => onChange({ ...item, name })}
        errors={errors}
      />
      <KeywordsField
        path={`${path}.skills`}
        label={fields.skills}
        value={item.skills}
        onChange={(skills) => onChange({ ...item, skills })}
        suggestions={suggestions}
        errors={errors}
      />
    </>
  );
}

/** Formulário de um curso. */
export function EducationForm({
  item,
  onChange,
  path,
  errors,
}: ItemFormProps<EducationItem>) {
  const set = <K extends keyof EducationItem>(
    key: K,
    value: EducationItem[K],
  ) => onChange({ ...item, [key]: value });
  const inProgress = item.end === null;

  return (
    <>
      <VisibilityFields item={item} onChange={onChange} path={path} />
      <LocalizedField
        path={`${path}.degree`}
        label={fields.degree}
        value={item.degree}
        onChange={(degree) => set("degree", degree)}
        errors={errors}
      />
      <TextField
        path={`${path}.institution`}
        label={fields.institution}
        value={item.institution}
        onChange={(institution) => set("institution", institution)}
        maxLength={contentLimits.line}
        error={errors[`${path}.institution`]}
      />
      <LocalizedField
        path={`${path}.location`}
        label={fields.location}
        value={item.location}
        onChange={(location) => set("location", location)}
        errors={errors}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <MonthField
          path={`${path}.start`}
          label={fields.start}
          value={item.start}
          onChange={(start) => set("start", start)}
          error={errors[`${path}.start`]}
        />
        {inProgress ? (
          <MonthField
            path={`${path}.expectedEnd`}
            label={fields.expectedEnd}
            value={item.expectedEnd ?? ""}
            onChange={(expectedEnd) =>
              set("expectedEnd", expectedEnd === "" ? null : expectedEnd)
            }
            error={errors[`${path}.expectedEnd`]}
          />
        ) : (
          <MonthField
            path={`${path}.end`}
            label={fields.end}
            value={item.end ?? ""}
            onChange={(end) => set("end", end)}
            error={errors[`${path}.end`]}
          />
        )}
      </div>
      <CheckboxField
        path={`${path}.inProgress`}
        label={fields.inProgress}
        checked={inProgress}
        onChange={(checked) =>
          onChange({
            ...item,
            end: checked ? null : (item.expectedEnd ?? item.start),
            // A previsão só faz sentido enquanto o curso não terminou.
            expectedEnd: checked ? item.expectedEnd : null,
          })
        }
      />
      <LocalizedField
        path={`${path}.notes`}
        label={fields.notes}
        kind="richText"
        hint={messages.markdownHint}
        value={item.notes}
        onChange={(notes) => set("notes", notes)}
        errors={errors}
      />
    </>
  );
}

/** Formulário de um prêmio. */
export function AwardForm({
  item,
  onChange,
  path,
  errors,
}: ItemFormProps<AwardItem>) {
  const set = <K extends keyof AwardItem>(key: K, value: AwardItem[K]) =>
    onChange({ ...item, [key]: value });

  return (
    <>
      <VisibilityFields item={item} onChange={onChange} path={path} />
      <LocalizedField
        path={`${path}.title`}
        label={fields.title}
        value={item.title}
        onChange={(title) => set("title", title)}
        errors={errors}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          path={`${path}.issuer`}
          label={fields.issuer}
          value={item.issuer}
          onChange={(issuer) => set("issuer", issuer)}
          maxLength={contentLimits.line}
          error={errors[`${path}.issuer`]}
        />
        <MonthField
          path={`${path}.date`}
          label={fields.date}
          value={item.date}
          onChange={(date) => set("date", date)}
          error={errors[`${path}.date`]}
        />
      </div>
      <LocalizedField
        path={`${path}.description`}
        label={fields.description}
        kind="richText"
        hint={messages.markdownHint}
        value={item.description}
        onChange={(description) => set("description", description)}
        errors={errors}
      />
    </>
  );
}

/** Formulário de um idioma. */
export function LanguageForm({
  item,
  onChange,
  path,
  errors,
}: ItemFormProps<LanguageItem>) {
  return (
    <>
      <VisibilityFields item={item} onChange={onChange} path={path} />
      <LocalizedField
        path={`${path}.name`}
        label={fields.name}
        value={item.name}
        onChange={(name) => onChange({ ...item, name })}
        errors={errors}
      />
      <LocalizedField
        path={`${path}.level`}
        label={fields.level}
        value={item.level}
        onChange={(level) => onChange({ ...item, level })}
        errors={errors}
      />
    </>
  );
}
