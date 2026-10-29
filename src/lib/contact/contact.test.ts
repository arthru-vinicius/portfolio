import type { DatabaseSync } from "node:sqlite";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createTestDatabase } from "../../../tests/support/database";

import {
  attemptContact,
  composeMessage,
  CONTACT_RATE_LIMIT,
  sendToRelay,
  type ContactAttempt,
} from "./contact";

let db: DatabaseSync;

beforeEach(() => {
  db = createTestDatabase();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  db.close();
});

const validForm = {
  name: "Visitante Exemplo",
  email: "visitante@example.com",
  message: "Olá! Gostei do portfólio.",
  turnstileToken: "token-de-teste",
  website: "",
};

function attempt(overrides: Partial<ContactAttempt> = {}): ContactAttempt {
  return {
    db,
    clientIp: "2001:db8::1",
    turnstile: { secretKey: "secret", hostnames: ["portfolio.example.com"] },
    delivery: {
      mode: "relay",
      url: "https://relay.example.com/send",
      token: "t",
    },
    locale: "pt",
    form: validForm,
    ...overrides,
  };
}

const turnstileOk = vi.fn(async () => ({ ok: true }) as const);

describe("attemptContact", () => {
  it("confere o Turnstile com a ação do contato e entrega ao relay", async () => {
    const relay = vi.fn(async () => ({ ok: true }) as const);

    await expect(
      attemptContact(attempt(), { verifyTurnstile: turnstileOk, relay }),
    ).resolves.toEqual({ ok: true });
    expect(turnstileOk).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedAction: "contact",
        expectedHostnames: ["portfolio.example.com"],
        remoteIp: "2001:db8::1",
      }),
    );
    expect(relay).toHaveBeenCalledWith({
      url: "https://relay.example.com/send",
      token: "t",
      message: composeMessage({ ...validForm, locale: "pt" }),
    });
  });

  it("aponta os campos com problema, sem chamar o Turnstile", async () => {
    const verifyTurnstile = vi.fn(turnstileOk);
    const outcome = await attemptContact(
      attempt({
        form: {
          ...validForm,
          name: "Linha\nquebrada",
          email: "sem-arroba",
          message: "  ",
        },
      }),
      { verifyTurnstile },
    );

    expect(outcome).toEqual({
      ok: false,
      reason: "invalid-input",
      fields: ["name", "email", "message"],
    });
    expect(verifyTurnstile).not.toHaveBeenCalled();
  });

  it("finge sucesso quando o campo-armadilha vem preenchido, sem entregar", async () => {
    const relay = vi.fn();

    await expect(
      attemptContact(
        attempt({ form: { ...validForm, website: "https://spam.example" } }),
        { verifyTurnstile: turnstileOk, relay },
      ),
    ).resolves.toEqual({ ok: true });
    expect(relay).not.toHaveBeenCalled();
  });

  it("recusa o token inválido e o Turnstile fora do ar", async () => {
    const rejected = vi.fn(
      async () => ({ ok: false, reason: "rejected", errorCodes: [] }) as const,
    );
    const down = vi.fn(
      async () =>
        ({ ok: false, reason: "unavailable", errorCodes: [] }) as const,
    );

    await expect(
      attemptContact(attempt(), { verifyTurnstile: rejected }),
    ).resolves.toEqual({ ok: false, reason: "turnstile-rejected" });
    await expect(
      attemptContact(attempt(), { verifyTurnstile: down }),
    ).resolves.toEqual({ ok: false, reason: "turnstile-unavailable" });
  });

  it("avisa quando o relay recusa", async () => {
    const relay = vi.fn(async () => ({ ok: false, status: 502 }) as const);

    await expect(
      attemptContact(attempt(), { verifyTurnstile: turnstileOk, relay }),
    ).resolves.toEqual({ ok: false, reason: "unavailable" });
  });

  it("no modo de log, não chama o relay", async () => {
    const relay = vi.fn();

    await expect(
      attemptContact(attempt({ delivery: { mode: "log" } }), {
        verifyTurnstile: turnstileOk,
        relay,
      }),
    ).resolves.toEqual({ ok: true });
    expect(relay).not.toHaveBeenCalled();
  });

  it("limita os envios por IP, sem misturar IPs", async () => {
    const relay = vi.fn(async () => ({ ok: true }) as const);
    const now = new Date("2026-10-28T12:00:00Z");
    for (let i = 0; i < CONTACT_RATE_LIMIT.limit; i++) {
      await attemptContact(attempt({ now }), {
        verifyTurnstile: turnstileOk,
        relay,
      });
    }

    await expect(
      attemptContact(attempt({ now }), { verifyTurnstile: turnstileOk, relay }),
    ).resolves.toMatchObject({ ok: false, reason: "rate-limited" });
    await expect(
      attemptContact(attempt({ now, clientIp: "2001:db8::2" }), {
        verifyTurnstile: turnstileOk,
        relay,
      }),
    ).resolves.toEqual({ ok: true });
  });
});

describe("sendToRelay", () => {
  it("manda o token exatamente como veio e a mensagem em JSON", async () => {
    const fetchImpl = vi.fn(
      async () => new Response('{"ok":true}', { status: 202 }),
    );
    // Símbolos que uma codificação estragaria; o relay compara byte a byte.
    const token = "%a!b<c}d]&=+/";
    const message = composeMessage({ ...validForm, locale: "en" });

    await expect(
      sendToRelay(
        { url: "https://relay.example.com/send", token, message },
        fetchImpl,
      ),
    ).resolves.toEqual({ ok: true });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://relay.example.com/send");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      `Bearer ${token}`,
    );
    expect(JSON.parse(String(init.body))).toEqual(message);
  });

  it("devolve o status da recusa, ou nenhum quando a rede falha", async () => {
    const refused = vi.fn(async () => new Response("", { status: 400 }));
    const offline = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    const input = {
      url: "https://relay.example.com/send",
      token: "t",
      message: composeMessage({ ...validForm, locale: "pt" }),
    };

    await expect(sendToRelay(input, refused)).resolves.toEqual({
      ok: false,
      status: 400,
    });
    await expect(sendToRelay(input, offline)).resolves.toEqual({
      ok: false,
      status: null,
    });
  });
});

describe("composeMessage", () => {
  it("monta texto puro com nome, e-mail, idioma e a mensagem, e responde ao visitante", () => {
    const message = composeMessage({ ...validForm, locale: "en" });

    expect(message.subject).toBe("Portfólio: mensagem de Visitante Exemplo");
    expect(message.replyTo).toBe("visitante@example.com");
    expect(message.fromName).toBe("Visitante Exemplo");
    expect(message.text).toContain("Idioma da página: en");
    expect(message.text.endsWith("Olá! Gostei do portfólio.")).toBe(true);
  });
});
