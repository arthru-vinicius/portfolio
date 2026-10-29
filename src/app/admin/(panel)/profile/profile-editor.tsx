"use client";

import { useId, useState } from "react";

import { FieldScope, SelectField, TextField } from "@/components/admin/fields";
import {
  focusFirstAvailable,
  focusTargetsAfterRemoval,
  ItemControls,
} from "@/components/admin/item-controls";
import { LocalizedField } from "@/components/admin/localized-field";
import { SaveBar } from "@/components/admin/save-bar";
import { cardClass, secondaryButtonClass } from "@/components/admin/styles";
import { useDraftEditor } from "@/components/admin/use-draft-editor";
import { createSocialLink, moveInList } from "@/content/editing";
import { toFieldIssues } from "@/content/save-result";
import {
  contentLimits,
  profileSchema,
  socialLinkKinds,
  type Profile,
  type SocialLink,
} from "@/content/schema";
import { adminMessages } from "@/i18n/admin";

import { saveProfile } from "../content-actions";

import { PhotoField } from "./photo-field";

const { fields, linkKinds, profile: messages } = adminMessages;

const kindOptions = socialLinkKinds.map((kind) => ({
  value: kind,
  label: linkKinds[kind],
}));

/** Texto vazio vira campo ausente, como o schema espera dos opcionais. */
const optional = (text: string) => (text.trim() === "" ? undefined : text);

function validate(profile: Profile) {
  const result = profileSchema.safeParse(profile);
  return result.success ? [] : toFieldIssues(result.error);
}

/**
 * Editor do perfil.
 *
 * @param props.profile - O perfil do rascunho.
 * @param props.version - A versão do perfil lida junto.
 */
export function ProfileEditor({
  profile: serverValue,
  version,
}: {
  profile: Profile;
  version: string;
}) {
  const editor = useDraftEditor({
    name: "profile",
    serverValue,
    serverVersion: version,
    save: (baseVersion, profile) =>
      saveProfile({ version: baseVersion, profile }),
    validate,
  });
  const { value: profile, update, errors } = editor;
  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    update((current) => ({ ...current, [key]: value }));

  return (
    <FieldScope scope={editor.fieldScope}>
      <div className="flex flex-col gap-8">
        <section
          aria-labelledby="profile-identity"
          className={`${cardClass} flex flex-col gap-6`}
        >
          <h2 id="profile-identity" className="text-lg font-semibold">
            {messages.identity}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              path="displayName"
              label={fields.displayName}
              hint={fields.displayNameHint}
              value={profile.displayName}
              onChange={(value) => set("displayName", value)}
              maxLength={contentLimits.line}
              error={errors.displayName}
            />
            <TextField
              path="fullName"
              label={fields.fullName}
              hint={fields.fullNameHint}
              value={profile.fullName}
              onChange={(value) => set("fullName", value)}
              maxLength={contentLimits.line}
              error={errors.fullName}
            />
          </div>
          <LocalizedField
            path="headline"
            label={fields.headline}
            value={profile.headline}
            onChange={(value) => set("headline", value)}
            errors={errors}
          />
          <LocalizedField
            path="location"
            label={fields.location}
            value={profile.location}
            onChange={(value) => set("location", value)}
            errors={errors}
          />
        </section>

        <section
          aria-labelledby="profile-photo"
          className={`${cardClass} flex flex-col gap-6`}
        >
          <h2 id="profile-photo" className="text-lg font-semibold">
            {messages.photo}
          </h2>
          <PhotoField
            value={profile.photo}
            onChange={(photo) => set("photo", photo)}
          />
        </section>

        <section
          aria-labelledby="profile-contact"
          className={`${cardClass} flex flex-col gap-6`}
        >
          <h2 id="profile-contact" className="text-lg font-semibold">
            {messages.contact}
          </h2>
          <TextField
            path="publicEmail"
            type="email"
            label={fields.publicEmail}
            hint={fields.publicEmailHint}
            value={profile.publicEmail ?? ""}
            onChange={(value) => set("publicEmail", optional(value))}
            autoComplete="email"
            error={errors.publicEmail}
          />
          <LinksEditor
            links={profile.links}
            onChange={(links) => set("links", links)}
            errors={errors}
          />
        </section>

        <section
          aria-labelledby="profile-private"
          className={`${cardClass} flex flex-col gap-6`}
        >
          <h2 id="profile-private" className="text-lg font-semibold">
            {messages.private}
          </h2>
          <TextField
            path="private.phone"
            type="tel"
            label={fields.phone}
            hint={fields.phoneHint}
            value={profile.private.phone ?? ""}
            onChange={(value) =>
              set("private", { ...profile.private, phone: optional(value) })
            }
            autoComplete="tel"
            error={errors["private.phone"]}
          />
        </section>

        <SaveBar editor={editor} />
      </div>
    </FieldScope>
  );
}

function LinksEditor({
  links,
  onChange,
  errors,
}: {
  links: readonly SocialLink[];
  onChange: (links: SocialLink[]) => void;
  errors: Readonly<Record<string, string>>;
}) {
  const [announcement, setAnnouncement] = useState("");
  const addButtonId = useId();
  const replace = (index: number, link: SocialLink) =>
    onChange(
      links.map((current, position) => (position === index ? link : current)),
    );

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-2 font-medium">{fields.links}</legend>
      {links.length > 0 && (
        <ol className="flex flex-col gap-4">
          {links.map((link, index) => {
            // O tipo basta como nome, a não ser que se repita na lista.
            const repeated =
              links.filter((other) => other.kind === link.kind).length > 1;
            const name =
              link.kind === "other" && link.label
                ? link.label
                : repeated
                  ? `${linkKinds[link.kind]} ${index + 1}`
                  : linkKinds[link.kind];
            return (
              <li
                key={link.id}
                className="flex flex-col gap-4 rounded-md border border-control p-4"
              >
                <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
                  <SelectField
                    path={`links.${index}.kind`}
                    label={fields.linkKind}
                    value={link.kind}
                    onChange={(kind) =>
                      replace(index, {
                        ...link,
                        kind,
                        // O nome só existe no tipo "Outro".
                        label: kind === "other" ? link.label : undefined,
                      })
                    }
                    options={kindOptions}
                  />
                  <TextField
                    path={`links.${index}.url`}
                    type="url"
                    label={fields.linkUrl}
                    value={link.url}
                    onChange={(url) => replace(index, { ...link, url })}
                    placeholder="https://"
                    error={errors[`links.${index}.url`]}
                  />
                </div>
                {link.kind === "other" && (
                  <TextField
                    path={`links.${index}.label`}
                    label={fields.linkLabel}
                    value={link.label ?? ""}
                    onChange={(label) =>
                      replace(index, { ...link, label: optional(label) })
                    }
                    maxLength={60}
                    error={errors[`links.${index}.label`]}
                  />
                )}
                <ItemControls
                  id={`link-${link.id}`}
                  name={name}
                  index={index}
                  total={links.length}
                  onMove={(offset) => {
                    onChange(moveInList(links, index, offset));
                    setAnnouncement(
                      adminMessages.editor.moved(
                        name,
                        index + offset + 1,
                        links.length,
                      ),
                    );
                  }}
                  onRemove={() => {
                    onChange(links.filter((current) => current.id !== link.id));
                    focusFirstAvailable(
                      focusTargetsAfterRemoval(
                        "link-",
                        links.map(({ id }) => id),
                        index,
                        addButtonId,
                      ),
                    );
                  }}
                />
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
          onClick={() => onChange([...links, createSocialLink()])}
          disabled={links.length >= contentLimits.links}
          className={secondaryButtonClass}
        >
          {fields.addLink}
        </button>
      </div>
    </fieldset>
  );
}
