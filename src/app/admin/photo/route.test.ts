import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { NextRequest } from "next/server";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SESSION_COOKIE_NAME, createSessionToken } from "@/lib/auth/session";
import type { AdminEnv } from "@/lib/env";
import { MAX_PHOTO_UPLOAD_BYTES, photoFileName } from "@/lib/media/photo";

import {
  TEST_ADMIN_HOST,
  readyAdminEnv,
} from "../../../../tests/support/admin-env";
import { resetFakeRequest } from "../../../../tests/support/next-request";

const state = vi.hoisted(() => ({
  admin: undefined as unknown as AdminEnv,
  directory: "",
}));

vi.mock(
  "next/headers",
  async () =>
    (await import("../../../../tests/support/next-request")).nextHeadersMock,
);
vi.mock(
  "next/navigation",
  async () =>
    (await import("../../../../tests/support/next-request")).nextNavigationMock,
);
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => {},
}));
vi.mock("@/lib/env", () => ({
  getAdminEnv: () => state.admin,
  getServerEnv: () => ({
    databasePath: path.join(state.directory, "portfolio.db"),
  }),
}));

const { POST } = await import("./route");

function upload(
  body: BodyInit,
  headers: Record<string, string> = {},
): NextRequest {
  return new NextRequest(`https://${TEST_ADMIN_HOST}/admin/photo`, {
    method: "POST",
    body,
    headers: { "content-type": "image/jpeg", ...headers },
  });
}

async function jpeg(): Promise<Uint8Array<ArrayBuffer>> {
  return Uint8Array.from(
    await sharp({
      create: { width: 800, height: 600, channels: 3, background: "#123456" },
    })
      .jpeg()
      .toBuffer(),
  );
}

describe("enviar a foto do perfil", () => {
  beforeEach(async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    state.admin = readyAdminEnv();
    state.directory = await mkdtemp(path.join(tmpdir(), "foto-rota-"));
    if (state.admin.status !== "ready") {
      throw new Error("painel desligado");
    }
    resetFakeRequest(
      { host: TEST_ADMIN_HOST },
      {
        [SESSION_COOKIE_NAME]: createSessionToken(state.admin.config.sessionKey)
          .token,
      },
    );
  });

  afterEach(async () => {
    await rm(state.directory, { recursive: true, force: true });
  });

  it("grava a foto em /data/media e devolve o id e as medidas", async () => {
    const response = await POST(upload(await jpeg()));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(result).toEqual({
      ok: true,
      photo: {
        id: expect.stringMatching(/^[0-9a-f]{64}$/),
        width: 800,
        height: 600,
      },
    });
    expect((await readdir(path.join(state.directory, "media"))).sort()).toEqual(
      [
        photoFileName(result.photo.id, 480),
        photoFileName(result.photo.id, 960),
      ],
    );
  });

  it("recusa o pedido vindo de outra origem", async () => {
    const response = await POST(
      upload(await jpeg(), { origin: "https://outro.example" }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, reason: "forbidden" });
  });

  it("recusa o que não é imagem e o arquivo grande demais", async () => {
    const invalid = await POST(upload(new TextEncoder().encode("não é foto")));
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({
      ok: false,
      reason: "invalid-image",
    });

    const tooLarge = await POST(
      upload(new Uint8Array(MAX_PHOTO_UPLOAD_BYTES + 1)),
    );
    expect(tooLarge.status).toBe(413);
    expect(await tooLarge.json()).toEqual({ ok: false, reason: "too-large" });
  });
});
