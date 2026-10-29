import { describe, expect, it } from "vitest";

import { toPublicDocument } from "@/content/public-projection";

import {
  FIXTURE_PHONE,
  portfolioFixture,
} from "../../../tests/fixtures/portfolio-document";

import {
  JSON_RESUME_SCHEMA,
  locationOf,
  renderJsonResume,
} from "./json-resume";
import { buildResumeModel } from "./model";

const modelOf = (locale: "pt-BR" | "en", phone?: string) =>
  buildResumeModel(
    toPublicDocument(structuredClone(portfolioFixture)),
    locale,
    phone === undefined ? {} : { phone },
  );

/** Procura `null` e texto vazio em qualquer nível do JSON. */
function emptyValues(value: unknown, at = "$"): string[] {
  if (value === null || value === "") {
    return [at];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => emptyValues(item, `${at}[${index}]`));
  }
  if (typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) =>
      emptyValues(item, `${at}.${key}`),
    );
  }
  return [];
}

describe("locationOf", () => {
  it("separa cidade e região, sem confundir o país com a região", () => {
    expect(locationOf("Recife, PE, Brasil")).toEqual({
      city: "Recife",
      region: "PE",
    });
    expect(locationOf("Recife, Brazil")).toEqual({ city: "Recife" });
    expect(locationOf("Remoto")).toEqual({ city: "Remoto" });
    expect(locationOf("")).toEqual({});
  });
});

describe("renderJsonResume", () => {
  it("segue o JSON Resume, com o portfólio e o endereço do arquivo", () => {
    const model = modelOf("pt-BR");
    const resume = JSON.parse(
      renderJsonResume(model, {
        portfolio: "https://portfolio.example.com/pt/",
        canonical: "https://portfolio.example.com/cv/curriculo.json",
      }),
    );

    expect(resume).toMatchObject({
      $schema: JSON_RESUME_SCHEMA,
      basics: {
        name: "Ana Exemplo da Silva",
        label: "Desenvolvedora Full Stack",
        email: "ana@example.com",
        url: "https://portfolio.example.com/pt/",
        location: { city: "Recife", region: "PE" },
        profiles: [
          {
            network: "LinkedIn",
            url: "https://example.com/linkedin/ana-exemplo",
          },
          { network: "GitHub", url: "https://example.com/github/ana-exemplo" },
          { network: "Site", url: "https://example.com" },
        ],
      },
      meta: {
        canonical: "https://portfolio.example.com/cv/curriculo.json",
        language: "pt-BR",
      },
    });
    expect(resume.basics.summary).toBe(model.summary.join("\n"));
    expect(resume.work).toHaveLength(model.experience.length);
    expect(resume.work[0]).toMatchObject({
      name: model.experience[0]?.company,
      position: model.experience[0]?.role,
      startDate: model.experience[0]?.start,
      highlights: model.experience[0]?.highlights,
    });
    expect(resume.skills).toEqual(
      model.skills.map((group) => ({
        name: group.name,
        keywords: group.skills,
      })),
    );
  });

  it("dá a conclusão prevista do curso em andamento como fim", () => {
    const model = modelOf("en");
    const ongoing = model.education.find((item) => item.end === null);
    const resume = JSON.parse(renderJsonResume(model));
    const entry = resume.education.find(
      (item: { institution: string }) =>
        item.institution === ongoing?.institution,
    );

    expect(entry).toMatchObject({
      endDate: ongoing?.expectedEnd,
      summary: expect.stringContaining(ongoing?.status ?? "?"),
    });
  });

  it("não tem campo vazio nem, na versão pública, telefone", () => {
    const publicJson = renderJsonResume(modelOf("pt-BR"));

    expect(emptyValues(JSON.parse(publicJson))).toEqual([]);
    expect(publicJson).not.toContain(FIXTURE_PHONE);
    expect(JSON.parse(publicJson).basics).not.toHaveProperty("url");
    expect(
      JSON.parse(renderJsonResume(modelOf("pt-BR", FIXTURE_PHONE))).basics
        .phone,
    ).toBe(FIXTURE_PHONE);
  });
});
