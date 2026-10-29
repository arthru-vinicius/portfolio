import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { photoFileName } from "@/lib/media/photo";

const state = vi.hoisted(() => ({ directory: "" }));

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => {},
}));
vi.mock("@/lib/env", () => ({
  getServerEnv: () => ({
    databasePath: path.join(state.directory, "portfolio.db"),
  }),
}));

const { GET } = await import("./route");

const ID = "b".repeat(64);

function get(file: string) {
  return GET(new NextRequest(`https://portfolio.example.com/media/${file}`), {
    params: Promise.resolve({ file }),
  });
}

describe("entregar a foto", () => {
  beforeEach(async () => {
    state.directory = await mkdtemp(path.join(tmpdir(), "midia-"));
    await mkdir(path.join(state.directory, "media"));
    await writeFile(
      path.join(state.directory, "media", photoFileName(ID, 480)),
      "webp de teste",
    );
    // Um arquivo da pasta de dados que nunca pode sair por esta rota.
    await writeFile(path.join(state.directory, "portfolio.db"), "banco");
  });

  afterEach(async () => {
    await rm(state.directory, { recursive: true, force: true });
  });

  it("entrega a foto como WebP, com cache longo, porque o nome nunca muda", async () => {
    const response = await get(photoFileName(ID, 480));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("webp de teste");
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("responde 404 para foto que não existe e para qualquer outro nome", async () => {
    for (const file of [
      photoFileName(ID, 960),
      "portfolio.db",
      "..%2Fportfolio.db",
      "../portfolio.db",
    ]) {
      expect((await get(file)).status, file).toBe(404);
    }
  });
});
