import { adminMessages } from "@/i18n/admin";

const segments: Readonly<Record<string, string>> = {
  profile: "Perfil",
  blocks: "Bloco",
  items: "Item",
  groups: "Grupo",
  highlights: "Destaque",
  links: "Link",
  resume: "Currículo",
  private: "Só no painel",
  text: "Texto",
  url: adminMessages.fields.linkUrl,
  label: adminMessages.fields.linkLabel,
  kind: adminMessages.fields.linkKind,
  "pt-BR": "em português",
  en: "em inglês",
};

/**
 * Descreve, em palavras, o caminho de um problema de validação, para a
 * importação de JSON apontar onde o arquivo está errado.
 *
 * @param path - Caminho do problema, como `blocks.2.items.0.start`.
 * @returns Por exemplo, `Bloco 3 › Item 1 › Início`.
 */
export function describeIssuePath(path: string): string {
  const parts: string[] = [];
  for (const segment of path.split(".").filter(Boolean)) {
    const position = Number(segment);
    const last = parts.length - 1;
    if (Number.isInteger(position) && last >= 0) {
      // "Bloco" seguido de 2 vira "Bloco 3": o painel conta a partir de 1.
      parts[last] = `${parts[last]} ${position + 1}`;
      continue;
    }
    const field = (adminMessages.fields as Readonly<Record<string, unknown>>)[
      segment
    ];
    parts.push(
      segments[segment] ?? (typeof field === "string" ? field : segment),
    );
  }
  return parts.join(" › ");
}
