import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Markdown } from "./markdown";

function html(text: string): string {
  return renderToStaticMarkup(
    <Markdown text={text} newTabLabel="(abre em outra aba)" />,
  );
}

describe("Markdown", () => {
  it("separa parágrafos por linha em branco e junta as linhas de um parágrafo", () => {
    expect(html("Primeira linha\nsegunda linha.\r\n\r\nOutro parágrafo.")).toBe(
      "<div><p>Primeira linha segunda linha.</p><p>Outro parágrafo.</p></div>",
    );
  });

  it("monta listas com hífen e numeradas, também logo depois de um parágrafo", () => {
    expect(html("Projetos:\n- um\n- dois\n\n1. primeiro\n2. segundo")).toBe(
      "<div><p>Projetos:</p><ul><li>um</li><li>dois</li></ul><ol><li>primeiro</li><li>segundo</li></ol></div>",
    );
  });

  it("aplica negrito, itálico e código", () => {
    expect(
      html("**TypeScript**, *Rust*, _Go_ e `npm test`; snake_case fica."),
    ).toBe(
      "<div><p><strong>TypeScript</strong>, <em>Rust</em>, <em>Go</em> e <code>npm test</code>; snake_case fica.</p></div>",
    );
  });

  it("abre links externos em outra aba, com aviso para leitores de tela", () => {
    expect(html("[Código **aberto**](https://example.com/repo)")).toBe(
      '<div><p><a href="https://example.com/repo" target="_blank" rel="noopener noreferrer">Código <strong>aberto</strong><span class="sr-only"> (abre em outra aba)</span></a></p></div>',
    );
    expect(html("[e-mail](mailto:ana@example.com)")).toBe(
      '<div><p><a href="mailto:ana@example.com">e-mail</a></p></div>',
    );
  });

  it("nunca solta HTML cru nem link com esquema perigoso", () => {
    const output = html(
      '<script>alert(1)</script> [clique](javascript:alert(1)) <img src=x onerror="alert(1)">',
    );

    expect(output).not.toContain("<script");
    expect(output).not.toContain("<img");
    expect(output).not.toContain('href="javascript');
    expect(output).toContain("&lt;script&gt;");
    expect(output).toContain("clique");
  });
});
