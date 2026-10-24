import { describe, expect, it } from "vitest";

import {
  FIXTURE_PHONE,
  portfolioFixture,
} from "../../tests/fixtures/portfolio-document";

import { toPublicDocument } from "./public-projection";

describe("toPublicDocument", () => {
  it("remove os campos privados do perfil", () => {
    const publicDocument = toPublicDocument(portfolioFixture);

    expect(publicDocument.profile).not.toHaveProperty("private");
  });

  it("não deixa o telefone escapar em lugar nenhum do documento", () => {
    const serialized = JSON.stringify(toPublicDocument(portfolioFixture));

    expect(serialized).not.toContain(FIXTURE_PHONE);
    expect(serialized).not.toMatch(/91234-?5678/);
  });

  it("mantém todo o resto do documento", () => {
    const publicProfile: Record<string, unknown> = {
      ...portfolioFixture.profile,
    };
    delete publicProfile.private;

    expect(toPublicDocument(portfolioFixture)).toEqual({
      ...portfolioFixture,
      profile: publicProfile,
    });
  });

  it("não altera o documento original", () => {
    toPublicDocument(portfolioFixture);

    expect(portfolioFixture.profile.private.phone).toBe(FIXTURE_PHONE);
  });
});
