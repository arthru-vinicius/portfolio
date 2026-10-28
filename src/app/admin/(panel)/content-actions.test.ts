import type { DatabaseSync } from "node:sqlite";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { serializeContentFile } from "@/content/content-file";
import { createBlock, createEmptyDocument } from "@/content/editing";
import type { Block, PortfolioDocument } from "@/content/schema";
import { SESSION_COOKIE_NAME, createSessionToken } from "@/lib/auth/session";
import { readDraft, saveDraft } from "@/lib/db/draft";
import { insertRevision, listRevisions } from "@/lib/db/revisions";
import type { AdminEnv } from "@/lib/env";

import { portfolioFixture } from "../../../../tests/fixtures/portfolio-document";
import {
  TEST_ADMIN_HOST,
  readyAdminEnv,
} from "../../../../tests/support/admin-env";
import { createTestDatabase } from "../../../../tests/support/database";
import { resetFakeRequest } from "../../../../tests/support/next-request";

import { draftParts, versionOf } from "./draft-parts";

const state = vi.hoisted(() => ({
  admin: undefined as unknown as AdminEnv,
  db: undefined as unknown as DatabaseSync,
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
  // Fora do Next não há pedido; aqui todo pedido é "de verdade".
  connection: async () => {},
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/env", () => ({ getAdminEnv: () => state.admin }));
vi.mock("@/lib/db/database", () => ({ getDatabase: () => state.db }));

const { revalidatePath } = await import("next/cache");
const {
  importDocument,
  restoreRevision,
  saveBlock,
  saveBlockList,
  saveProfile,
  saveResumeSettings,
} = await import("./content-actions");

const copy = (): PortfolioDocument => structuredClone(portfolioFixture);

function blockOfType<T extends Block["type"]>(
  document: PortfolioDocument,
  type: T,
): Extract<Block, { type: T }> {
  const block = document.blocks.find(
    (candidate): candidate is Extract<Block, { type: T }> =>
      candidate.type === type,
  );
  if (block === undefined) {
    throw new Error(`o fixture não tem bloco ${type}`);
  }
  return block;
}

/** Grava o fixture como rascunho, como se o painel o tivesse aberto. */
function seedDraft(): PortfolioDocument {
  const document = copy();
  saveDraft(state.db, document, 0);
  return document;
}

beforeEach(() => {
  state.admin = readyAdminEnv();
  state.db = createTestDatabase();
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

afterEach(() => {
  state.db.close();
});

describe("saveProfile", () => {
  it("cria o rascunho, devolve o perfil normalizado e atualiza o painel", async () => {
    const empty = createEmptyDocument();
    const profile = { ...copy().profile, displayName: "  Ana E.  " };

    const result = await saveProfile({
      version: versionOf(draftParts.profile(empty)),
      profile,
    });

    const saved = { ...profile, displayName: "Ana E." };
    expect(result).toEqual({
      ok: true,
      version: versionOf(saved),
      savedAt: expect.any(String),
      saved,
    });
    expect(readDraft(state.db)?.document.profile).toEqual(saved);
    expect(revalidatePath).toHaveBeenCalledWith("/admin", "layout");
  });

  it("recusa salvar sobre um perfil que mudou em outro lugar, sem gravar", async () => {
    const document = seedDraft();
    const opened = versionOf(document.profile);
    await saveProfile({
      version: opened,
      profile: { ...document.profile, displayName: "Outra aba" },
    });

    await expect(
      saveProfile({
        version: opened,
        profile: { ...document.profile, displayName: "Esta aba" },
      }),
    ).resolves.toEqual({ ok: false, reason: "conflict" });
    expect(readDraft(state.db)?.document.profile.displayName).toBe("Outra aba");
  });

  it("aponta o campo inválido com o caminho relativo ao perfil", async () => {
    const document = seedDraft();
    const [first, ...rest] = document.profile.links;
    if (first === undefined) throw new Error("o fixture não tem links");

    const result = await saveProfile({
      version: versionOf(document.profile),
      profile: {
        ...document.profile,
        links: [{ ...first, url: "sem-esquema" }, ...rest],
      },
    });

    expect(result).toEqual({
      ok: false,
      reason: "invalid",
      issues: [
        {
          path: "links.0.url",
          message: "use um endereço completo, começando com https://",
        },
      ],
    });
    expect(readDraft(state.db)?.lockVersion).toBe(1);
  });
});

describe("saveBlockList", () => {
  it("aplica a ordem, a visibilidade, os blocos novos e os removidos", async () => {
    const document = seedDraft();
    const [first, second] = document.blocks;
    if (first === undefined || second === undefined) {
      throw new Error("o fixture tem poucos blocos");
    }
    const added = createBlock("text");

    const result = await saveBlockList({
      version: versionOf(draftParts.blockList(document)),
      blocks: [
        { id: second.id, visible: false },
        { id: first.id, visible: true },
        { id: added.id, visible: true, newType: "text" },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.ok && result.saved.map(({ id }) => id)).toEqual([
      second.id,
      first.id,
      added.id,
    ]);
    expect(readDraft(state.db)?.document.blocks).toHaveLength(3);
  });

  it("não se atrapalha com o conteúdo de um bloco salvo em outra aba", async () => {
    const document = seedDraft();
    const listVersion = versionOf(draftParts.blockList(document));
    const about = blockOfType(document, "about");
    await saveBlock({
      version: versionOf(about),
      block: { ...about, body: { "pt-BR": "Novo", en: "New" } },
    });

    const result = await saveBlockList({
      version: listVersion,
      blocks: document.blocks.map(({ id }) => ({ id, visible: false })),
    });

    expect(result.ok).toBe(true);
    expect(
      blockOfType(readDraft(state.db)?.document ?? copy(), "about"),
    ).toMatchObject({ visible: false, body: { "pt-BR": "Novo", en: "New" } });
  });

  it("recusa a lista se a ordem mudou em outro lugar", async () => {
    const document = seedDraft();
    const opened = versionOf(draftParts.blockList(document));
    await saveBlockList({
      version: opened,
      blocks: [...document.blocks]
        .reverse()
        .map(({ id, visible }) => ({ id, visible })),
    });

    await expect(
      saveBlockList({
        version: opened,
        blocks: document.blocks.map(({ id, visible }) => ({ id, visible })),
      }),
    ).resolves.toEqual({ ok: false, reason: "conflict" });
  });

  it("recusa um segundo bloco do mesmo tipo", async () => {
    const document = seedDraft();

    const result = await saveBlockList({
      version: versionOf(draftParts.blockList(document)),
      blocks: [
        ...document.blocks.map(({ id, visible }) => ({ id, visible })),
        { id: createBlock("about").id, visible: true, newType: "about" },
      ],
    });

    expect(result).toMatchObject({ ok: false, reason: "invalid" });
    expect(readDraft(state.db)?.document.blocks).toEqual(document.blocks);
  });
});

describe("saveBlock", () => {
  it("troca o bloco e devolve a versão salva", async () => {
    const document = seedDraft();
    const projects = blockOfType(document, "projects");
    const changed = { ...projects, items: projects.items.slice(1) };

    const result = await saveBlock({
      version: versionOf(projects),
      block: changed,
    });

    expect(result).toEqual({
      ok: true,
      version: versionOf(changed),
      savedAt: expect.any(String),
      saved: changed,
    });
    expect(
      blockOfType(readDraft(state.db)?.document ?? copy(), "projects"),
    ).toEqual(changed);
  });

  it("não se atrapalha com o perfil salvo em outra aba", async () => {
    const document = seedDraft();
    const projects = blockOfType(document, "projects");
    await saveProfile({
      version: versionOf(document.profile),
      profile: { ...document.profile, displayName: "Outra aba" },
    });

    const result = await saveBlock({
      version: versionOf(projects),
      block: { ...projects, visible: false },
    });

    expect(result.ok).toBe(true);
    expect(readDraft(state.db)?.document.profile.displayName).toBe("Outra aba");
  });

  it("aponta o erro dentro do bloco, com o caminho relativo a ele", async () => {
    const document = seedDraft();
    const experience = blockOfType(document, "experience");
    const [job, ...rest] = experience.items;
    if (job === undefined) throw new Error("o fixture não tem experiência");

    const result = await saveBlock({
      version: versionOf(experience),
      block: { ...experience, items: [{ ...job, start: "2024-13" }, ...rest] },
    });

    expect(result).toEqual({
      ok: false,
      reason: "invalid",
      issues: [{ path: "items.0.start", message: "use o formato AAAA-MM" }],
    });
  });

  it("aponta id repetido em outro bloco, que só o documento inteiro vê", async () => {
    const document = seedDraft();
    const projects = blockOfType(document, "projects");
    const [project] = projects.items;
    const otherId = blockOfType(document, "about").id;
    if (project === undefined) throw new Error("o fixture não tem projeto");

    const result = await saveBlock({
      version: versionOf(projects),
      block: { ...projects, items: [{ ...project, id: otherId }] },
    });

    expect(result).toEqual({
      ok: false,
      reason: "invalid",
      issues: [{ path: "items.0.id", message: `id repetido: ${otherId}` }],
    });
  });

  it("trata um bloco que saiu do rascunho como conflito", async () => {
    seedDraft();
    const removed = createBlock("about");

    await expect(
      saveBlock({ version: versionOf(removed), block: removed }),
    ).resolves.toEqual({ ok: false, reason: "conflict" });
  });
});

describe("saveResumeSettings", () => {
  it("salva o resumo do currículo", async () => {
    const document = seedDraft();
    const resume = { summary: { "pt-BR": "Resumo", en: "Summary" } };

    await expect(
      saveResumeSettings({ version: versionOf(document.resume), resume }),
    ).resolves.toMatchObject({ ok: true, saved: resume });
    expect(readDraft(state.db)?.document.resume).toEqual(resume);
  });
});

describe("importDocument", () => {
  it("troca o rascunho pelo documento do arquivo YAML", async () => {
    const current = { ...copy(), blocks: [] };
    saveDraft(state.db, current, 0);

    const result = await importDocument({
      version: versionOf(current),
      text: serializeContentFile(portfolioFixture),
    });

    expect(result).toMatchObject({ ok: true, saved: null });
    expect(readDraft(state.db)?.document).toEqual(portfolioFixture);
  });

  it("aceita a cópia antiga, em JSON", async () => {
    const current = { ...copy(), blocks: [] };
    saveDraft(state.db, current, 0);

    await expect(
      importDocument({
        version: versionOf(current),
        text: JSON.stringify(portfolioFixture),
      }),
    ).resolves.toMatchObject({ ok: true });
    expect(readDraft(state.db)?.document).toEqual(portfolioFixture);
  });

  it("recusa o que não é YAML, com a linha do problema", async () => {
    await expect(
      importDocument({ version: "", text: "a:\n  b: 1\n c: 2\n" }),
    ).resolves.toEqual({ ok: false, reason: "unreadable", line: 3 });
    await expect(
      importDocument({ version: "", text: "a: &x [1]\nb: *x\n" }),
    ).resolves.toEqual({ ok: false, reason: "unreadable" });
    expect(readDraft(state.db)).toBeNull();
  });

  it("aponta os problemas com o caminho do documento inteiro", async () => {
    const document = copy();
    const experience = blockOfType(document, "experience");
    const [job] = experience.items;
    if (job === undefined) throw new Error("o fixture não tem experiência");
    job.start = "março";
    const index = document.blocks.indexOf(experience);

    await expect(
      importDocument({ version: "", text: JSON.stringify(document) }),
    ).resolves.toEqual({
      ok: false,
      reason: "invalid",
      issues: [
        {
          path: `blocks.${index}.items.0.start`,
          message: "use o formato AAAA-MM",
        },
      ],
    });
    expect(readDraft(state.db)).toBeNull();
  });

  it("recusa um arquivo de uma versão mais nova do painel", async () => {
    await expect(
      importDocument({
        version: "",
        text: JSON.stringify({ ...portfolioFixture, schemaVersion: 99 }),
      }),
    ).resolves.toEqual({ ok: false, reason: "newer-version" });
  });

  it("recusa importar sobre um rascunho que mudou desde que a página abriu", async () => {
    const opened = versionOf(createEmptyDocument());
    seedDraft();

    await expect(
      importDocument({
        version: opened,
        text: JSON.stringify(portfolioFixture),
      }),
    ).resolves.toEqual({ ok: false, reason: "conflict" });
  });
});

describe("restoreRevision", () => {
  it("troca o rascunho pela revisão, sem publicar", async () => {
    const revision = insertRevision(state.db, portfolioFixture);
    const current = { ...copy(), blocks: [] };
    saveDraft(state.db, current, 0);

    await expect(
      restoreRevision({ version: versionOf(current), revisionId: revision.id }),
    ).resolves.toMatchObject({ ok: true, saved: null });
    expect(readDraft(state.db)?.document).toEqual(portfolioFixture);
    expect(listRevisions(state.db)).toHaveLength(1);
  });

  it("recusa uma revisão que não existe", async () => {
    for (const revisionId of [7, 0, 1.5]) {
      await expect(
        restoreRevision({ version: "", revisionId }),
      ).resolves.toEqual({ ok: false, reason: "not-found" });
    }
  });

  it("recusa restaurar sobre um rascunho que mudou desde que a página abriu", async () => {
    const revision = insertRevision(state.db, portfolioFixture);
    const opened = versionOf(createEmptyDocument());
    seedDraft();

    await expect(
      restoreRevision({ version: opened, revisionId: revision.id }),
    ).resolves.toEqual({ ok: false, reason: "conflict" });
  });

  it("recusa uma revisão salva por uma versão mais nova do painel", async () => {
    const { lastInsertRowid } = state.db
      .prepare(
        `INSERT INTO published_revisions (schema_version, document, published_at)
         VALUES (99, ?, ?)`,
      )
      .run(
        JSON.stringify({ ...portfolioFixture, schemaVersion: 99 }),
        new Date().toISOString(),
      );

    await expect(
      restoreRevision({ version: "", revisionId: Number(lastInsertRowid) }),
    ).resolves.toEqual({ ok: false, reason: "newer-version" });
  });
});
