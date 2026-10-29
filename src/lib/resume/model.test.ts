import { describe, expect, it } from "vitest";

import { toPublicDocument } from "@/content/public-projection";
import type { Block, PortfolioDocument } from "@/content/schema";

import {
  FIXTURE_PHONE,
  portfolioFixture,
} from "../../../tests/fixtures/portfolio-document";

import { buildResumeModel, formatResumeMonth, joinParts } from "./model";

const publicFixture = () => toPublicDocument(structuredClone(portfolioFixture));

function withBlock<T extends Block["type"]>(
  document: PortfolioDocument,
  type: T,
  change: (block: Extract<Block, { type: T }>) => void,
): PortfolioDocument {
  const block = document.blocks.find(
    (candidate): candidate is Extract<Block, { type: T }> =>
      candidate.type === type,
  );
  if (block === undefined) {
    throw new Error(`sem bloco ${type}`);
  }
  change(block);
  return document;
}

describe("buildResumeModel", () => {
  it("monta a identificação, sem telefone na versão pública", () => {
    const model = buildResumeModel(publicFixture(), "pt-BR");

    expect(model).toMatchObject({
      locale: "pt-BR",
      fullName: "Ana Exemplo da Silva",
      displayName: "Ana Exemplo",
      headline: "Desenvolvedora Full Stack",
      location: "Recife, PE, Brasil",
      email: "ana@example.com",
      phone: null,
    });
    expect(model.links).toEqual([
      {
        label: "LinkedIn",
        url: "https://example.com/linkedin/ana-exemplo",
        display: "example.com/linkedin/ana-exemplo",
      },
      {
        label: "GitHub",
        url: "https://example.com/github/ana-exemplo",
        display: "example.com/github/ana-exemplo",
      },
      { label: "Site", url: "https://example.com", display: "example.com" },
    ]);
    expect(JSON.stringify(model)).not.toContain(FIXTURE_PHONE);
  });

  it("põe o telefone só quando ele vem nas opções", () => {
    const model = buildResumeModel(publicFixture(), "en", {
      phone: FIXTURE_PHONE,
    });

    expect(model.phone).toBe(FIXTURE_PHONE);
  });

  it("leva só o que está marcado para o currículo", () => {
    const model = buildResumeModel(publicFixture(), "pt-BR");

    expect(model.experience.map((item) => item.company)).toEqual([
      "Empresa Exemplo",
      "Estúdio Fictício",
    ]);
    expect(model.experience[0]?.highlights).toEqual([
      "Construiu APIs REST em Java e Spring Boot, testadas com JUnit.",
      "Levou um serviço de mensageria em tempo real do zero à produção.",
    ]);
    expect(model.projects.map((project) => project.name)).toEqual([
      "Aquário Conectado",
    ]);
    expect(model.skills.map((group) => group.name)).toEqual([
      "Backend",
      "Frontend",
      "Dados e infraestrutura",
    ]);
    expect(model.languages).toEqual([
      { name: "Português", level: "Nativo" },
      { name: "Inglês", level: "Técnico" },
    ]);
  });

  it("leva o item marcado mesmo oculto no site, e o bloco oculto também", () => {
    const document = withBlock(
      structuredClone(portfolioFixture),
      "experience",
      (block) => {
        block.visible = false;
        const hidden = block.items[2];
        if (hidden !== undefined) {
          hidden.inResume = true;
          hidden.highlights.forEach((highlight) => {
            highlight.inResume = true;
          });
        }
      },
    );

    const model = buildResumeModel(toPublicDocument(document), "pt-BR");

    expect(model.experience.map((item) => item.company)).toContain(
      "Agência Imaginária",
    );
  });

  it("ordena experiências e cursos do mais recente para o mais antigo", () => {
    const document = withBlock(
      structuredClone(portfolioFixture),
      "experience",
      (block) => {
        // Na ordem do painel, a mais antiga vem primeiro.
        block.items.reverse();
        block.items.forEach((item) => {
          item.inResume = true;
        });
      },
    );

    const model = buildResumeModel(toPublicDocument(document), "pt-BR");

    expect(model.experience.map((item) => item.start)).toEqual([
      "2023-03",
      "2021-01",
      "2019-06",
    ]);
  });

  it("escreve os períodos como MM/AAAA, com o atual no idioma", () => {
    const pt = buildResumeModel(publicFixture(), "pt-BR");
    const en = buildResumeModel(publicFixture(), "en");

    expect(pt.experience.map((item) => item.period)).toEqual([
      "03/2023 – atual",
      "01/2021 – 02/2023",
    ]);
    expect(en.experience[0]?.period).toBe("03/2023 – Present");
    expect(pt.education[0]).toMatchObject({
      period: "09/2022 – atual",
      status: "conclusão prevista em 12/2026",
      expectedEnd: "2026-12",
    });
    expect(en.education[0]?.status).toBe("expected completion 12/2026");
    expect(pt.awards[0]?.dateLabel).toBe("07/2024");
  });

  it("usa a modalidade no idioma e o texto puro do Markdown", () => {
    const model = buildResumeModel(publicFixture(), "en");

    expect(model.experience[0]?.workMode).toBe("Hybrid");
    expect(model.summary).toEqual([
      "Full stack developer experienced in REST APIs, accessible interfaces and running services on Docker.",
    ]);
  });

  it("usa o resumo da experiência quando nenhum destaque está marcado", () => {
    const document = withBlock(
      structuredClone(portfolioFixture),
      "experience",
      (block) => {
        block.items[0]?.highlights.forEach((highlight) => {
          highlight.inResume = false;
        });
      },
    );

    const model = buildResumeModel(toPublicDocument(document), "pt-BR");

    expect(model.experience[0]?.highlights).toEqual([
      "Desenvolvimento sob demanda, do planejamento ao deploy.",
    ]);
  });
});

describe("formatResumeMonth", () => {
  it("escreve o mês como MM/AAAA", () => {
    expect(formatResumeMonth("2025-03")).toBe("03/2025");
  });
});

describe("joinParts", () => {
  it("pula as partes vazias", () => {
    expect(joinParts(["Recife", null, " ", "2025"])).toBe("Recife · 2025");
  });
});
