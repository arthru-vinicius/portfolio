import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";

import { ImageResponse } from "next/og";

import { SHARE_IMAGE_SIZE } from "./metadata";

/** As cores do tema escuro do site. */
const COLORS = {
  page: "#060908",
  ink: "#eef5f1",
  muted: "#93a39b",
  line: "#1d2a24",
  accent: "#34d399",
  accent2: "#2dd4bf",
};

type Fonts = { regular: Buffer; bold: Buffer };

let fonts: Fonts | null = null;

/**
 * A Inter em WOFF, a mesma do PDF: o gerador de imagem não lê WOFF2, que é o
 * formato das fontes do site. Os caminhos ficam escritos por inteiro para o
 * build saber quais arquivos levar para a imagem.
 */
function loadFonts(): Fonts {
  fonts ??= {
    regular: readFileSync(
      path.join(
        process.cwd(),
        "node_modules/@fontsource/inter/files/inter-latin-400-normal.woff",
      ),
    ),
    bold: readFileSync(
      path.join(
        process.cwd(),
        "node_modules/@fontsource/inter/files/inter-latin-700-normal.woff",
      ),
    ),
  };
  return fonts;
}

/** O que a imagem de compartilhamento mostra. */
export type ShareImageContent = {
  /** O rótulo pequeno do alto, como `Portfólio`. */
  label: string;
  /** O host do site, como `portfolio.arthru.com`. */
  host: string | null;
  name: string;
  headline: string;
  location: string;
  /** A foto em PNG, se houver; o gerador de imagem não lê WebP. */
  photo: Buffer | null;
};

/**
 * Desenha a imagem de compartilhamento (Open Graph) no visual do site: fundo
 * quase preto, o nome em destaque, o título no degradê verde e a foto à
 * direita, quando há.
 *
 * @param content - Os textos e a foto.
 * @returns A imagem em PNG, 1200 × 630.
 */
export async function renderShareImage(
  content: ShareImageContent,
): Promise<Uint8Array> {
  const { regular, bold } = loadFonts();
  const photo =
    content.photo === null
      ? null
      : `data:image/png;base64,${content.photo.toString("base64")}`;

  const image = new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 56,
        padding: "72px 80px",
        backgroundColor: COLORS.page,
        backgroundImage: `radial-gradient(circle at 18% 22%, rgba(52, 211, 153, 0.16), transparent 55%), radial-gradient(circle at 92% 88%, rgba(45, 212, 191, 0.12), transparent 50%)`,
        color: COLORS.ink,
        fontFamily: "Inter",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          flexShrink: 1,
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 24,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: COLORS.muted,
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 12,
              backgroundColor: COLORS.accent,
            }}
          />
          {content.host === null
            ? content.label
            : `${content.label} · ${content.host}`}
        </div>
        <div
          style={{
            marginTop: 36,
            fontSize: 76,
            fontWeight: 700,
            lineHeight: 1.04,
            letterSpacing: -2,
          }}
        >
          {content.name}
        </div>
        <div
          style={{
            marginTop: 12,
            fontSize: 52,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: -1,
            backgroundImage: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.accent2})`,
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {content.headline}
        </div>
        <div style={{ marginTop: 32, fontSize: 28, color: COLORS.muted }}>
          {content.location}
        </div>
      </div>
      {photo !== null && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt=""
          width={340}
          height={340}
          style={{
            flexShrink: 0,
            borderRadius: 44,
            border: `3px solid ${COLORS.line}`,
            boxShadow: `0 0 80px rgba(52, 211, 153, 0.35)`,
            objectFit: "cover",
          }}
        />
      )}
    </div>,
    {
      ...SHARE_IMAGE_SIZE,
      fonts: [
        { name: "Inter", data: regular, weight: 400, style: "normal" },
        { name: "Inter", data: bold, weight: 700, style: "normal" },
      ],
    },
  );
  return new Uint8Array(await image.arrayBuffer());
}
