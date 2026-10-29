import type { ReactNode } from "react";

import {
  INLINE_PATTERN,
  safeHref,
  splitBlocks,
  toRuns,
} from "@/content/markdown-syntax";

/*
 * Os textos do painel viram elemento React, nunca HTML cru: um `<script>` no
 * texto aparece como texto. A gramática fica em `@/content/markdown-syntax`.
 */

type InlineOptions = { newTabLabel: string; linkClassName?: string };

function renderInline(
  text: string,
  options: InlineOptions,
  keyPrefix: string,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  // Cada chamada usa a própria cópia: a expressão tem estado (`lastIndex`).
  const pattern = new RegExp(INLINE_PATTERN.source, "g");
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
  const blocks = splitBlocks(text);

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
