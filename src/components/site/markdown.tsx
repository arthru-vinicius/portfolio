import type { ReactNode } from "react";

/**
 * O subconjunto de Markdown dos textos do painel: parágrafos (separados por
 * linha em branco), listas com `- ` ou `1. `, **negrito**, *itálico*,
 * `código` e [links](https://exemplo.com).
 *
 * Tudo vira elemento React, nunca HTML cru: um `<script>` no texto aparece
 * como texto. Links só com `https:`, `http:` ou `mailto:`; outro esquema (como
 * `javascript:`) deixa só o texto do link.
 */

const INLINE =
  /(`[^`\n]+`)|\[([^\]\n]+)\]\(([^)\s]+)\)|\*\*([^*\n]+?)\*\*|\*([^*\n]+?)\*|(?<!\w)_([^_\n]+?)_(?!\w)/g;

const ALLOWED_PROTOCOLS = new Set(["https:", "http:", "mailto:"]);

function safeHref(url: string): string | null {
  try {
    return ALLOWED_PROTOCOLS.has(new URL(url).protocol) ? url : null;
  } catch {
    return null;
  }
}

type InlineOptions = { newTabLabel: string; linkClassName?: string };

function renderInline(
  text: string,
  options: InlineOptions,
  keyPrefix: string,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  // Cada chamada usa a própria cópia: a expressão tem estado (`lastIndex`).
  const pattern = new RegExp(INLINE.source, "g");
  for (
    let match = pattern.exec(text);
    match !== null;
    match = pattern.exec(text)
  ) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    const key = `${keyPrefix}-${match.index}`;
    const [whole, code, linkText, linkUrl, bold, italic, underscored] = match;
    if (code !== undefined) {
      nodes.push(<code key={key}>{code.slice(1, -1)}</code>);
    } else if (linkText !== undefined && linkUrl !== undefined) {
      const href = safeHref(linkUrl);
      const inner = renderInline(linkText, options, key);
      if (href === null) {
        nodes.push(...inner);
      } else if (href.startsWith("mailto:")) {
        nodes.push(
          <a key={key} href={href} className={options.linkClassName}>
            {inner}
          </a>,
        );
      } else {
        nodes.push(
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={options.linkClassName}
          >
            {inner}
            <span className="sr-only"> {options.newTabLabel}</span>
          </a>,
        );
      }
    } else if (bold !== undefined) {
      nodes.push(<strong key={key}>{renderInline(bold, options, key)}</strong>);
    } else {
      const emphasis = italic ?? underscored ?? whole;
      nodes.push(<em key={key}>{renderInline(emphasis, options, key)}</em>);
    }
    last = match.index + whole.length;
  }
  if (last < text.length) {
    nodes.push(text.slice(last));
  }
  return nodes;
}

type Run =
  | { kind: "paragraph"; lines: string[] }
  | { kind: "ul" | "ol"; items: string[] };

const BULLET = /^\s*[-*]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;

function toRuns(block: string): Run[] {
  const runs: Run[] = [];
  for (const line of block.split("\n")) {
    const bullet = BULLET.exec(line);
    const numbered = bullet === null ? NUMBERED.exec(line) : null;
    const kind =
      bullet !== null ? "ul" : numbered !== null ? "ol" : "paragraph";
    const current = runs.at(-1);
    if (kind === "paragraph") {
      if (current?.kind === "paragraph") {
        current.lines.push(line.trim());
      } else {
        runs.push({ kind, lines: [line.trim()] });
      }
      continue;
    }
    const item = (bullet ?? numbered)?.[1] ?? "";
    if (current?.kind === kind) {
      current.items.push(item);
    } else {
      runs.push({ kind, items: [item] });
    }
  }
  return runs;
}

/**
 * Mostra um texto do painel escrito no subconjunto de Markdown do site.
 *
 * @param props.text - O texto.
 * @param props.newTabLabel - O aviso, só para leitores de tela, de que um link
 *   abre em outra aba.
 * @param props.className - Classe do contêiner.
 * @param props.linkClassName - Classe dos links.
 */
export function Markdown({
  text,
  newTabLabel,
  className,
  linkClassName,
}: {
  text: string;
  newTabLabel: string;
  className?: string;
  linkClassName?: string;
}) {
  const options: InlineOptions = { newTabLabel, linkClassName };
  const blocks = text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block !== "");

  return (
    <div className={className}>
      {blocks.flatMap((block, blockIndex) =>
        toRuns(block).map((run, runIndex) => {
          const key = `${blockIndex}-${runIndex}`;
          if (run.kind === "paragraph") {
            return (
              <p key={key}>{renderInline(run.lines.join(" "), options, key)}</p>
            );
          }
          const List = run.kind;
          return (
            <List key={key}>
              {run.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  {renderInline(item, options, `${key}-${itemIndex}`)}
                </li>
              ))}
            </List>
          );
        }),
      )}
    </div>
  );
}
