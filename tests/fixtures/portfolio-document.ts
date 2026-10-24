import type { PortfolioDocument } from "@/content/schema";

/** Telefone inventado (DDD 00 não existe). Os testes conferem que ele nunca sai do painel. */
export const FIXTURE_PHONE = "+55 00 91234-5678";

/**
 * Documento fictício completo, para o desenvolvimento local e os testes. Todos
 * os dados são inventados; o conteúdo real mora só no banco do servidor.
 *
 * Tem todos os tipos de bloco, um item oculto no site e itens fora do
 * currículo, para as regras de visibilidade terem o que filtrar.
 */
export const portfolioFixture: PortfolioDocument = {
  schemaVersion: 1,
  profile: {
    fullName: "Ana Exemplo da Silva",
    displayName: "Ana Exemplo",
    headline: {
      "pt-BR": "Desenvolvedora Full Stack",
      en: "Full Stack Developer",
    },
    location: {
      "pt-BR": "Recife, PE, Brasil",
      en: "Recife, Brazil",
    },
    links: [
      {
        id: "3beb79ba-a97a-4c5c-81cd-7e03ccaf11e7",
        kind: "linkedin",
        url: "https://example.com/linkedin/ana-exemplo",
      },
      {
        id: "0c42bad7-d6e9-4997-aafb-9d97d3b17034",
        kind: "github",
        url: "https://example.com/github/ana-exemplo",
      },
      {
        id: "3e94d611-231a-46b9-8bd2-e1b15cecb9bb",
        kind: "website",
        url: "https://example.com",
      },
    ],
    publicEmail: "ana@example.com",
    private: { phone: FIXTURE_PHONE },
  },
  blocks: [
    {
      id: "1e9e796b-ecae-4521-a851-655eca372a12",
      type: "about",
      visible: true,
      body: {
        "pt-BR":
          "Sou desenvolvedora full stack e gosto de levar um projeto do levantamento de requisitos até a operação em produção.\n\nNo dia a dia, trabalho com **TypeScript**, Java e bancos relacionais, cuidando também da infraestrutura com Docker.",
        en: "I'm a full stack developer who enjoys taking a project from requirements to running in production.\n\nDay to day, I work with **TypeScript**, Java and relational databases, and I also take care of infrastructure with Docker.",
      },
    },
    {
      id: "cf54ae68-658b-4866-b86f-1cb8afa85134",
      type: "experience",
      visible: true,
      items: [
        {
          id: "3dabec5c-0bb1-4ce2-8196-a4fe99cfb1c2",
          visible: true,
          inResume: true,
          company: "Empresa Exemplo",
          companyUrl: "https://example.com/empresa",
          role: {
            "pt-BR": "Desenvolvedora Full Stack",
            en: "Full Stack Developer",
          },
          location: { "pt-BR": "Recife, PE", en: "Recife, Brazil" },
          workMode: "hybrid",
          start: "2023-03",
          end: null,
          summary: {
            "pt-BR": "Desenvolvimento sob demanda, do planejamento ao deploy.",
            en: "Custom software development, from planning to deployment.",
          },
          highlights: [
            {
              id: "4a2819c3-8698-40cb-aefe-5d11cce58873",
              inResume: true,
              text: {
                "pt-BR":
                  "Construiu APIs REST em Java e Spring Boot, testadas com JUnit.",
                en: "Built REST APIs in Java and Spring Boot, tested with JUnit.",
              },
            },
            {
              id: "bccfb1d4-8027-49ec-903b-0c042ec8707d",
              inResume: true,
              text: {
                "pt-BR":
                  "Levou um serviço de mensageria em tempo real do zero à produção.",
                en: "Took a real-time messaging service from scratch to production.",
              },
            },
            {
              id: "9a1c2858-af96-4e16-a1c0-2d333931ee5b",
              inResume: false,
              text: {
                "pt-BR": "Revisou código e orientou pessoas novas no time.",
                en: "Reviewed code and mentored new team members.",
              },
            },
          ],
          technologies: ["Java", "Spring Boot", "TypeScript", "PostgreSQL"],
        },
        {
          id: "3438629b-9525-49e7-ba8d-260578f977be",
          visible: true,
          inResume: true,
          company: "Estúdio Fictício",
          role: {
            "pt-BR": "Desenvolvedora Front-end",
            en: "Front-end Developer",
          },
          location: { "pt-BR": "Remoto", en: "Remote" },
          workMode: "remote",
          start: "2021-01",
          end: "2023-02",
          summary: {
            "pt-BR": "Interfaces web acessíveis para clientes de varejo.",
            en: "Accessible web interfaces for retail clients.",
          },
          highlights: [
            {
              id: "bcb6d39a-ff4f-4b84-a4e8-e478715c4805",
              inResume: true,
              text: {
                "pt-BR":
                  "Migrou o painel de pedidos para React, sem interromper as vendas.",
                en: "Migrated the order dashboard to React without disrupting sales.",
              },
            },
            {
              id: "752ffd25-306e-468e-ab57-facf5371ba5a",
              inResume: true,
              text: {
                "pt-BR":
                  "Levou as páginas principais ao nível AA de acessibilidade.",
                en: "Brought the main pages to AA accessibility level.",
              },
            },
          ],
          technologies: ["React", "TypeScript", "CSS"],
        },
        {
          id: "3a3a241b-7346-4bb6-8954-20ef34aa9ea2",
          visible: false,
          inResume: false,
          company: "Agência Imaginária",
          role: { "pt-BR": "Estagiária", en: "Intern" },
          location: { "pt-BR": "Recife, PE", en: "Recife, Brazil" },
          start: "2019-06",
          end: "2020-12",
          summary: { "pt-BR": "", en: "" },
          highlights: [
            {
              id: "4f195adf-56ff-45f3-8b0d-f40f7cd423ec",
              inResume: false,
              text: {
                "pt-BR": "Manteve sites institucionais em PHP.",
                en: "Maintained corporate websites in PHP.",
              },
            },
          ],
          technologies: ["PHP"],
        },
      ],
    },
    {
      id: "336523bd-5486-4f06-acb5-61702474f1c5",
      type: "projects",
      visible: true,
      items: [
        {
          id: "24bcbefc-820c-4a10-8895-e5d02c8758bc",
          visible: true,
          inResume: true,
          name: "Aquário Conectado",
          summary: {
            "pt-BR":
              "Controle de luz e temperatura de um aquário, com firmware e app web.",
            en: "Light and temperature control for an aquarium, with firmware and a web app.",
          },
          description: {
            "pt-BR":
              "Firmware para ESP32 e um app web que mostra as leituras em tempo real.",
            en: "ESP32 firmware and a web app that shows readings in real time.",
          },
          technologies: ["C++", "ESP32", "TypeScript"],
          repositoryUrl: "https://example.com/github/aquario-conectado",
        },
        {
          id: "b1529a9b-600b-46c6-99fc-cbf4e721a901",
          visible: true,
          inResume: false,
          name: "Agenda Simples",
          summary: {
            "pt-BR":
              "Agendador de lembretes com interface de linha de comando.",
            en: "Reminder scheduler with a command-line interface.",
          },
          description: { "pt-BR": "", en: "" },
          technologies: ["Rust"],
        },
        {
          id: "879cb800-0892-4621-b521-052931d8e24e",
          visible: false,
          inResume: false,
          name: "Projeto Arquivado",
          summary: {
            "pt-BR": "Um projeto antigo, oculto no site.",
            en: "An old project, hidden on the site.",
          },
          description: { "pt-BR": "", en: "" },
          technologies: [],
        },
      ],
    },
    {
      id: "ec920174-1136-4248-8a9c-dcd435294a80",
      type: "skills",
      visible: true,
      groups: [
        {
          id: "eb32872b-a976-4fd8-9105-3f94ad46b0cf",
          visible: true,
          inResume: true,
          name: { "pt-BR": "Backend", en: "Backend" },
          skills: ["Java", "Spring Boot", "Node.js", "APIs REST"],
        },
        {
          id: "18b88702-db25-49d7-994a-e07ed652b98d",
          visible: true,
          inResume: true,
          name: { "pt-BR": "Frontend", en: "Frontend" },
          skills: ["TypeScript", "React", "HTML", "CSS"],
        },
        {
          id: "81b6d41a-a95c-4efc-a4ac-56a2090619d1",
          visible: true,
          inResume: true,
          name: {
            "pt-BR": "Dados e infraestrutura",
            en: "Data and infrastructure",
          },
          skills: ["PostgreSQL", "Redis", "Docker", "Linux"],
        },
      ],
    },
    {
      id: "dbf5bf7d-e3b6-49a3-be8a-8c4f84cb0197",
      type: "education",
      visible: true,
      items: [
        {
          id: "cbd34a53-1b89-482c-aafb-27001109c8d5",
          visible: true,
          inResume: true,
          degree: {
            "pt-BR": "Tecnólogo em Análise e Desenvolvimento de Sistemas",
            en: "Associate Degree in Systems Analysis and Development",
          },
          institution: "Instituto Exemplo",
          location: { "pt-BR": "Recife, PE", en: "Recife, Brazil" },
          start: "2022-09",
          end: null,
          expectedEnd: "2026-12",
          notes: {
            "pt-BR": "Trabalho de conclusão em andamento.",
            en: "Final project in progress.",
          },
        },
      ],
    },
    {
      id: "83a64c4c-6abe-46df-96ea-a7b2ca406bfb",
      type: "awards",
      visible: true,
      items: [
        {
          id: "2b3ba0d2-d436-43e3-b9d6-9dad77a328c1",
          visible: true,
          inResume: true,
          title: {
            "pt-BR": "Vice-campeã de hackathon regional",
            en: "Runner-up at a regional hackathon",
          },
          issuer: "Hackathon Exemplo",
          date: "2024-07",
          description: {
            "pt-BR": "Aplicativo feito em equipe, em 24 horas.",
            en: "App built as a team in 24 hours.",
          },
        },
      ],
    },
    {
      id: "6e903339-0954-48d2-a215-c7936048bdb9",
      type: "languages",
      visible: true,
      items: [
        {
          id: "ba29c1cf-79a0-4541-acc9-d9ec138d94ca",
          visible: true,
          inResume: true,
          name: { "pt-BR": "Português", en: "Portuguese" },
          level: { "pt-BR": "Nativo", en: "Native" },
        },
        {
          id: "4e50e735-83a5-40a8-80fb-199be51d5144",
          visible: true,
          inResume: true,
          name: { "pt-BR": "Inglês", en: "English" },
          level: { "pt-BR": "Técnico", en: "Technical" },
        },
      ],
    },
    {
      id: "3d6b90eb-4b89-41bc-a02a-a65073167095",
      type: "text",
      visible: false,
      title: { "pt-BR": "Bastidores", en: "Behind the scenes" },
      body: {
        "pt-BR": "Um bloco livre, oculto no site.",
        en: "A free-form block, hidden on the site.",
      },
    },
  ],
  resume: {
    summary: {
      "pt-BR":
        "Desenvolvedora full stack com experiência em APIs REST, interfaces acessíveis e operação de serviços em Docker.",
      en: "Full stack developer experienced in REST APIs, accessible interfaces and running services on Docker.",
    },
  },
};
