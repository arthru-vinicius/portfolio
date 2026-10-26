"use client";

import { useId, useState, type ReactNode } from "react";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { CheckboxField, FieldScope } from "@/components/admin/fields";
import {
  focusFirstAvailable,
  focusTargetsAfterRemoval,
  ItemCard,
  ItemControls,
} from "@/components/admin/item-controls";
import { LocalizedField } from "@/components/admin/localized-field";
import { SaveBar } from "@/components/admin/save-bar";
import {
  badgeClass,
  cardClass,
  secondaryButtonClass,
} from "@/components/admin/styles";
import { useDraftEditor } from "@/components/admin/use-draft-editor";
import {
  createListItem,
  duplicateListItem,
  emptyText,
  moveInList,
  type ListBlockType,
  type ListItemOf,
} from "@/content/editing";
import { toFieldIssues } from "@/content/save-result";
import { containsMissingTranslation } from "@/content/translations";
import {
  blockSchema,
  contentLimits,
  type Block,
  type LocalizedText,
} from "@/content/schema";
import { adminMessages } from "@/i18n/admin";
import { getDictionary } from "@/i18n/dictionaries";

import { saveBlock } from "../../content-actions";

import {
  AwardForm,
  EducationForm,
  ExperienceForm,
  LanguageForm,
  ProjectForm,
  SkillGroupForm,
  type ItemFormProps,
} from "./item-forms";

const {
  blocks: blockMessages,
  editor: messages,
  fields,
  items: itemMessages,
} = adminMessages;

function validate(block: Block) {
  const result = blockSchema.safeParse(block);
  return result.success ? [] : toFieldIssues(result.error);
}

/** Títulos padrão das seções do site, nos dois idiomas. */
function defaultTitle(type: Exclude<Block["type"], "text">): LocalizedText {
  return {
    "pt-BR": getDictionary("pt-BR").sections[type],
    en: getDictionary("en").sections[type],
  };
}

/**
 * Editor de um bloco: os campos dele e, nos blocos de lista, os itens.
 *
 * @param props.block - O bloco, como está no rascunho.
 * @param props.version - A versão do bloco lida junto.
 * @param props.suggestions - Etiquetas já usadas no documento.
 */
export function BlockEditor({
  block: serverValue,
  version,
  suggestions,
}: {
  block: Block;
  version: string;
  suggestions: readonly string[];
}) {
  const editor = useDraftEditor({
    name: "block",
    serverValue,
    serverVersion: version,
    save: (baseVersion, block) => saveBlock({ version: baseVersion, block }),
    validate,
  });
  const { value: block, update, errors } = editor;
  // O Next pode manter dois editores de bloco no documento ao mesmo tempo.
  const settingsHeadingId = useId();

  return (
    <FieldScope scope={editor.fieldScope}>
      <div className="flex flex-col gap-8">
        <section
          aria-labelledby={settingsHeadingId}
          className={`${cardClass} flex flex-col gap-6`}
        >
          <h2 id={settingsHeadingId} className="text-lg font-semibold">
            {blockMessages.settings}
          </h2>
          <CheckboxField
            path="visible"
            label={messages.visible}
            checked={block.visible}
            onChange={(visible) =>
              update((current) => ({ ...current, visible }))
            }
          />
          {block.type === "text" ? (
            <>
              <LocalizedField
                path="title"
                label={fields.title}
                value={block.title}
                onChange={(title) =>
                  update((current) =>
                    current.type === "text" ? { ...current, title } : current,
                  )
                }
                errors={errors}
              />
              <LocalizedField
                path="body"
                label={fields.body}
                kind="richText"
                hint={messages.markdownHint}
                value={block.body}
                onChange={(body) =>
                  update((current) =>
                    current.type === "text" ? { ...current, body } : current,
                  )
                }
                errors={errors}
              />
            </>
          ) : (
            <LocalizedField
              path="title"
              label={fields.blockTitle}
              hint={fields.blockTitleHint(defaultTitle(block.type)["pt-BR"])}
              value={block.title ?? emptyText()}
              placeholder={defaultTitle(block.type)}
              onChange={(title) =>
                update((current) =>
                  current.type === "text"
                    ? current
                    : {
                        ...current,
                        // Os dois idiomas vazios voltam ao título padrão.
                        title:
                          title["pt-BR"] === "" && title.en === ""
                            ? undefined
                            : title,
                      },
                )
              }
              errors={errors}
            />
          )}
          {block.type === "about" && (
            <LocalizedField
              path="body"
              label={fields.body}
              kind="richText"
              hint={messages.markdownHint}
              value={block.body}
              onChange={(body) =>
                update((current) =>
                  current.type === "about" ? { ...current, body } : current,
                )
              }
              errors={errors}
            />
          )}
        </section>

        <BlockItems
          block={block}
          update={update}
          errors={errors}
          suggestions={suggestions}
        />

        <SaveBar editor={editor} />
      </div>
    </FieldScope>
  );
}

/** Os itens de um bloco de lista, cada tipo com o próprio formulário. */
function BlockItems({
  block,
  update,
  errors,
  suggestions,
}: {
  block: Block;
  update: (change: (current: Block) => Block) => void;
  errors: Readonly<Record<string, string>>;
  suggestions: readonly string[];
}) {
  // Cada tipo troca a própria lista; o `update` confere o tipo de novo porque
  // recebe o bloco mais recente, e não o desta renderização.
  const shared = { errors, suggestions };
  switch (block.type) {
    case "experience":
      return (
        <ItemList
          type="experience"
          items={block.items}
          onChange={(items) =>
            update((current) =>
              current.type === "experience" ? { ...current, items } : current,
            )
          }
          describe={(item) => ({
            title: item.company,
            subtitle: item.role["pt-BR"],
          })}
          Form={ExperienceForm}
          {...shared}
        />
      );
    case "projects":
      return (
        <ItemList
          type="projects"
          items={block.items}
          onChange={(items) =>
            update((current) =>
              current.type === "projects" ? { ...current, items } : current,
            )
          }
          describe={(item) => ({ title: item.name })}
          Form={ProjectForm}
          {...shared}
        />
      );
    case "skills":
      return (
        <ItemList
          type="skills"
          items={block.groups}
          onChange={(groups) =>
            update((current) =>
              current.type === "skills" ? { ...current, groups } : current,
            )
          }
          describe={(item) => ({
            title: item.name["pt-BR"],
            subtitle: item.skills.join(", "),
          })}
          Form={SkillGroupForm}
          {...shared}
        />
      );
    case "education":
      return (
        <ItemList
          type="education"
          items={block.items}
          onChange={(items) =>
            update((current) =>
              current.type === "education" ? { ...current, items } : current,
            )
          }
          describe={(item) => ({
            title: item.degree["pt-BR"],
            subtitle: item.institution,
          })}
          Form={EducationForm}
          {...shared}
        />
      );
    case "awards":
      return (
        <ItemList
          type="awards"
          items={block.items}
          onChange={(items) =>
            update((current) =>
              current.type === "awards" ? { ...current, items } : current,
            )
          }
          describe={(item) => ({
            title: item.title["pt-BR"],
            subtitle: item.issuer,
          })}
          Form={AwardForm}
          {...shared}
        />
      );
    case "languages":
      return (
        <ItemList
          type="languages"
          items={block.items}
          onChange={(items) =>
            update((current) =>
              current.type === "languages" ? { ...current, items } : current,
            )
          }
          describe={(item) => ({
            title: item.name["pt-BR"],
            subtitle: item.level["pt-BR"],
          })}
          Form={LanguageForm}
          {...shared}
        />
      );
    case "about":
    case "text":
      return null;
  }
}

type ItemListProps<T extends ListBlockType> = {
  type: T;
  items: readonly ListItemOf<T>[];
  onChange: (items: ListItemOf<T>[]) => void;
  /** Título e linha de apoio do cartão de cada item. */
  describe: (item: ListItemOf<T>) => { title: string; subtitle?: string };
  Form: (props: ItemFormProps<ListItemOf<T>>) => ReactNode;
  errors: Readonly<Record<string, string>>;
  suggestions: readonly string[];
};

/**
 * Lista de itens de um bloco: cada item num cartão que abre e fecha, com os
 * botões de ordenar, duplicar e remover. Um item com erro abre sozinho.
 */
function ItemList<T extends ListBlockType>({
  type,
  items,
  onChange,
  describe,
  Form,
  errors,
  suggestions,
}: ItemListProps<T>) {
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());
  const [removing, setRemoving] = useState<ListItemOf<T> | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const headingId = useId();
  const addButtonId = useId();
  const listKey = type === "skills" ? "groups" : "items";
  const nouns = itemMessages[type];
  const nameOf = (item: ListItemOf<T>) =>
    describe(item).title.trim() || nouns.untitled;

  const errorPaths = Object.keys(errors);
  const hasErrors = (index: number) =>
    errorPaths.some((path) => path.startsWith(`${listKey}.${index}.`));

  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  function focusPanel(id: string) {
    requestAnimationFrame(() => {
      document
        .getElementById(`item-${id}-panel`)
        ?.querySelector<HTMLElement>("input, textarea, select")
        ?.focus();
    });
  }

  function insertAt(index: number, item: ListItemOf<T>) {
    onChange([...items.slice(0, index), item, ...items.slice(index)]);
    setOpen((current) => new Set(current).add(item.id));
    focusPanel(item.id);
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <h2 id={headingId} className="text-lg font-semibold">
        {blockMessages.items}
      </h2>
      {items.length > 0 && (
        <ol className="flex flex-col gap-3">
          {items.map((item, index) => {
            const { subtitle } = describe(item);
            const name = nameOf(item);
            const path = `${listKey}.${index}`;
            return (
              <ItemCard
                key={item.id}
                id={`item-${item.id}`}
                title={name}
                subtitle={subtitle}
                expanded={open.has(item.id) || hasErrors(index)}
                onToggle={() => toggle(item.id)}
                badges={
                  <>
                    {!item.visible && (
                      <span className={`${badgeClass} border-control`}>
                        {messages.hidden}
                      </span>
                    )}
                    {item.inResume && (
                      <span className={`${badgeClass} border-control`}>
                        {messages.inResume}
                      </span>
                    )}
                    {containsMissingTranslation(item) && (
                      <span
                        className={`${badgeClass} border-warning text-warning`}
                      >
                        {messages.missingTranslation}
                      </span>
                    )}
                  </>
                }
                controls={
                  <ItemControls
                    id={`item-${item.id}`}
                    name={name}
                    index={index}
                    total={items.length}
                    onMove={(offset) => {
                      onChange(moveInList(items, index, offset));
                      setAnnouncement(
                        messages.moved(name, index + offset + 1, items.length),
                      );
                    }}
                    onDuplicate={
                      items.length < contentLimits.listItems
                        ? () => insertAt(index + 1, duplicateListItem(item))
                        : undefined
                    }
                    onRemove={() => setRemoving(item)}
                  />
                }
              >
                <Form
                  item={item}
                  onChange={(changed) =>
                    onChange(
                      items.map((current) =>
                        current.id === item.id ? changed : current,
                      ),
                    )
                  }
                  path={path}
                  errors={errors}
                  suggestions={suggestions}
                />
              </ItemCard>
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
          onClick={() => insertAt(items.length, createListItem(type))}
          disabled={items.length >= contentLimits.listItems}
          className={secondaryButtonClass}
        >
          {nouns.add}
        </button>
      </div>
      <ConfirmDialog
        open={removing !== null}
        title={messages.removeTitle(removing === null ? "" : nameOf(removing))}
        message={messages.removeItemMessage}
        confirmLabel={messages.remove}
        tone="danger"
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          const removed = removing;
          setRemoving(null);
          if (removed !== null) {
            const ids = items.map(({ id }) => id);
            onChange(items.filter((current) => current.id !== removed.id));
            focusFirstAvailable(
              focusTargetsAfterRemoval(
                "item-",
                ids,
                ids.indexOf(removed.id),
                addButtonId,
              ),
            );
          }
        }}
      />
    </section>
  );
}
