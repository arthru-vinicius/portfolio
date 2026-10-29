"use client";

import { useEffect, useId, useRef } from "react";

import { ChevronDownIcon, DownloadIcon } from "./icons";

/** Um arquivo no menu, já com os textos do idioma dele. */
export type ResumeMenuFile = {
  href: string;
  /** O nome sugerido ao salvar. */
  fileName: string;
  /** O tipo, para o atributo `type` do link. */
  type: string;
  /** O formato, como `PDF`. */
  label: string;
  /** O tamanho, como `52 kB`, se já se sabe. */
  size: string | null;
};

/** Os arquivos de um idioma, com o nome do grupo escrito nesse idioma. */
export type ResumeMenuGroup = {
  lang: string;
  label: string;
  files: readonly ResumeMenuFile[];
};

/**
 * O botão "Baixar currículo": abre a lista dos arquivos, no idioma da página e
 * no outro. É um `<details>`, que abre pelo teclado e funciona mesmo antes do
 * JavaScript carregar; com ele, fecha com Esc (devolvendo o foco ao botão) e
 * ao clicar fora.
 *
 * @param props.label - O texto do botão.
 * @param props.groups - Os arquivos, por idioma; o da página vem primeiro.
 * @param props.placement - Para onde a lista abre: para baixo, no topo, ou
 *   para cima, no rodapé.
 * @param props.buttonClassName - Classes do botão.
 */
export function ResumeMenu({
  label,
  groups,
  placement,
  buttonClassName,
}: {
  label: string;
  groups: readonly ResumeMenuGroup[];
  placement: "down" | "up";
  buttonClassName: string;
}) {
  const id = useId();
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const details = detailsRef.current;
      if (event.key === "Escape" && details?.open === true) {
        details.open = false;
        details.querySelector("summary")?.focus();
      }
    };
    const onPointer = (event: PointerEvent) => {
      const details = detailsRef.current;
      if (details?.open === true && !details.contains(event.target as Node)) {
        details.open = false;
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, []);

  return (
    <details ref={detailsRef} className="group relative">
      <summary
        className={`${buttonClassName} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}
      >
        <DownloadIcon className="shrink-0 text-accent" />
        {label}
        <ChevronDownIcon
          className={`shrink-0 transition-transform motion-reduce:transition-none ${placement === "up" ? "rotate-180 group-open:rotate-0" : "group-open:rotate-180"}`}
        />
      </summary>
      <div
        className={`absolute left-0 z-30 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-card-2 p-2 shadow-[0_18px_40px_-16px_rgb(0_0_0/0.45)] ${placement === "up" ? "bottom-full mb-2" : "top-full mt-2"}`}
      >
        {groups.map((group, index) => (
          <div key={group.lang} lang={group.lang}>
            <p
              id={`${id}-${index}`}
              className="px-3 pt-2 pb-1 font-site-mono text-xs tracking-[0.12em] text-ink-muted uppercase"
            >
              {group.label}
            </p>
            <ul aria-labelledby={`${id}-${index}`}>
              {group.files.map((file) => (
                <li key={file.href}>
                  <a
                    href={file.href}
                    download={file.fileName}
                    type={file.type}
                    hrefLang={group.lang}
                    className="flex min-h-11 items-center justify-between gap-4 rounded-xl px-3 font-semibold text-ink hover:bg-card hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
                  >
                    {file.label}
                    {file.size !== null && (
                      <span className="font-site-mono text-xs font-normal text-ink-muted">
                        {file.size}
                      </span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}
