"use client";

import { useId, useState } from "react";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import {
  CheckboxField,
  FieldScope,
  SelectField,
} from "@/components/admin/fields";
import {
  focusFirstAvailable,
  focusTargetsAfterRemoval,
  ItemControls,
} from "@/components/admin/item-controls";
import { SaveBar } from "@/components/admin/save-bar";
import {
  badgeClass,
  cardClass,
  secondaryButtonClass,
} from "@/components/admin/styles";
import { GuardedLink } from "@/components/admin/unsaved-changes";
import { useDraftEditor } from "@/components/admin/use-draft-editor";
import {
  addableBlockTypes,
  createBlock,
  moveInList,
  type BlockSummary,
} from "@/content/editing";
import { contentLimits, type BlockType } from "@/content/schema";
import { adminMessages } from "@/i18n/admin";

import { saveBlockList } from "../content-actions";

const { blocks: messages, blockTypes, editor: editorMessages } = adminMessages;

/** Um bloco da lista; `isNew` marca o que ainda não foi salvo. */
type Entry = BlockSummary & { isNew?: boolean };

const hasItems = (type: BlockType) => type !== "about" && type !== "text";

/** Nome do bloco no painel: o título próprio, se houver, ou o do tipo. */
function blockName(entry: Entry): string {
  return entry.title?.["pt-BR"] || blockTypes[entry.type];
}

/**
 * Editor da lista de blocos. Mudanças de ordem, visibilidade, blocos novos e
 * removidos ficam na página até Salvar.
 *
 * @param props.blocks - Os blocos do rascunho, resumidos.
 * @param props.version - A versão da lista lida junto.
 */
export function BlockListEditor({
  blocks,
  version,
}: {
  blocks: BlockSummary[];
  version: string;
}) {
  const editor = useDraftEditor<Entry[]>({
    name: "blocks",
    serverValue: blocks,
    serverVersion: version,
    save: (baseVersion, entries) =>
      saveBlockList({
        version: baseVersion,
        blocks: entries.map(({ id, visible, type, isNew }) =>
          isNew ? { id, visible, newType: type } : { id, visible },
        ),
      }),
    // A lista não tem campo a validar: a regra de um bloco por tipo já vem
    // dos tipos oferecidos para adicionar.
    validate: () => [],
  });
  const { value: entries, update } = editor;
  const [removing, setRemoving] = useState<Entry | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const addButtonId = useId();
  const addable = addableBlockTypes(entries.map((entry) => entry.type));
  const [chosenType, setChosenType] = useState<BlockType>("about");
  const newType = addable.includes(chosenType) ? chosenType : addable[0];

  function add() {
    if (newType === undefined) {
      return;
    }
    const { id } = createBlock(newType);
    update((current) => [
      ...current,
      {
        id,
        type: newType,
        visible: true,
        title: null,
        itemCount: 0,
        visibleItemCount: 0,
        isNew: true,
      },
    ]);
    setAnnouncement(messages.added(blockTypes[newType]));
  }

  return (
    <FieldScope scope={editor.fieldScope}>
      <div className="flex flex-col gap-6">
        {entries.length === 0 ? (
          <p className="text-muted">{messages.empty}</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {entries.map((entry, index) => {
              const name = blockName(entry);
              return (
                <li
                  key={entry.id}
                  className={`${cardClass} flex flex-col gap-4 md:flex-row md:items-center md:justify-between`}
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <h2 className="flex flex-wrap items-center gap-2 font-medium">
                      <span>{blockTypes[entry.type]}</span>
                      {entry.isNew && (
                        <span className={`${badgeClass} border-control`}>
                          {messages.newBlock}
                        </span>
                      )}
                      {!entry.visible && (
                        <span
                          className={`${badgeClass} border-control text-muted`}
                        >
                          {editorMessages.hidden}
                        </span>
                      )}
                    </h2>
                    <p className="text-sm text-muted">
                      {[
                        entry.title !== null &&
                          messages.customTitle(entry.title["pt-BR"]),
                        hasItems(entry.type) &&
                          messages.itemCount(
                            entry.itemCount,
                            entry.visibleItemCount,
                          ),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <CheckboxField
                      path={`blocks.${entry.id}.visible`}
                      label={editorMessages.visible}
                      checked={entry.visible}
                      onChange={(visible) =>
                        update((current) =>
                          current.map((candidate) =>
                            candidate.id === entry.id
                              ? { ...candidate, visible }
                              : candidate,
                          ),
                        )
                      }
                    />
                    {entry.isNew ? (
                      <span className="text-sm text-muted">
                        {messages.saveToEdit}
                      </span>
                    ) : (
                      <GuardedLink
                        href={`/admin/blocks/${entry.id}`}
                        aria-label={editorMessages.editLabel(name)}
                        className={secondaryButtonClass}
                      >
                        {editorMessages.edit}
                      </GuardedLink>
                    )}
                    <ItemControls
                      id={`block-${entry.id}`}
                      name={name}
                      index={index}
                      total={entries.length}
                      onMove={(offset) => {
                        update((current) => moveInList(current, index, offset));
                        setAnnouncement(
                          editorMessages.moved(
                            name,
                            index + offset + 1,
                            entries.length,
                          ),
                        );
                      }}
                      onRemove={() => setRemoving(entry)}
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

        {newType !== undefined && entries.length < contentLimits.blocks && (
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-48">
              <SelectField
                path="new-block-type"
                label={messages.addType}
                value={newType}
                onChange={setChosenType}
                options={addable.map((type) => ({
                  value: type,
                  label: blockTypes[type],
                }))}
              />
            </div>
            <button
              id={addButtonId}
              type="button"
              onClick={add}
              className={secondaryButtonClass}
            >
              {messages.add}
            </button>
          </div>
        )}

        <SaveBar editor={editor} />

        <ConfirmDialog
          open={removing !== null}
          title={editorMessages.removeTitle(
            removing === null ? "" : blockName(removing),
          )}
          message={messages.removeBlockMessage(removing?.itemCount ?? 0)}
          confirmLabel={editorMessages.remove}
          tone="danger"
          onCancel={() => setRemoving(null)}
          onConfirm={() => {
            const removed = removing;
            setRemoving(null);
            if (removed !== null) {
              const ids = entries.map(({ id }) => id);
              update((current) =>
                current.filter((candidate) => candidate.id !== removed.id),
              );
              focusFirstAvailable(
                focusTargetsAfterRemoval(
                  "block-",
                  ids,
                  ids.indexOf(removed.id),
                  addButtonId,
                ),
              );
            }
          }}
        />
      </div>
    </FieldScope>
  );
}
