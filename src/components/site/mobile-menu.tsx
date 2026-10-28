"use client";

import { useEffect, useId, useRef, useState } from "react";

import { CloseIcon, MenuIcon } from "./icons";

/** Um link da navegação. */
export type NavItem = { href: string; label: string };

/**
 * Menu das seções em telas estreitas: um botão que abre a lista. Fecha ao escolher
 * uma seção, com Esc (devolvendo o foco ao botão) ou ao clicar fora.
 *
 * @param props.items - As seções.
 * @param props.label - Nome do botão e da lista ("Menu").
 */
export function MobileMenu({
  items,
  label,
}: {
  items: readonly NavItem[];
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-11 items-center justify-center rounded-full text-xl text-ink hover:bg-card-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {open ? <CloseIcon /> : <MenuIcon />}
      </button>
      <nav
        id={panelId}
        aria-label={label}
        hidden={!open}
        className="absolute inset-x-0 top-full border-b border-line bg-page shadow-lg"
      >
        <ul className="mx-auto flex max-w-6xl flex-col px-4 py-2">
          {items.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center rounded-lg px-2 text-lg font-medium text-ink hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
