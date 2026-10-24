import { describe, expect, it, vi } from "vitest";

import { TURNSTILE_VERIFY_URL, verifyTurnstileToken } from "./turnstile";

const INPUT = {
  secretKey: "secret-ficticia",
  token: "token-do-widget",
  remoteIp: "203.0.113.7",
  expectedAction: "admin-login",
  expectedHostnames: ["portfolio.example.com"],
};

function respondWith(body: unknown, status = 200) {
  return vi.fn<typeof fetch>(async () => Response.json(body, { status }));
}

describe("verifyTurnstileToken", () => {
  it("manda secret, token e IP para o siteverify, como formulário", async () => {
    const fetchImpl = respondWith({
      success: true,
      hostname: "portfolio.example.com",
      action: "admin-login",
    });

    await verifyTurnstileToken(INPUT, fetchImpl);

    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe(TURNSTILE_VERIFY_URL);
    expect(init?.method).toBe("POST");
    expect(Object.fromEntries(init?.body as URLSearchParams)).toEqual({
      secret: "secret-ficticia",
      response: "token-do-widget",
      remoteip: "203.0.113.7",
    });
  });

  it("não manda o IP quando ele é desconhecido", async () => {
    const fetchImpl = respondWith({ success: false });

    await verifyTurnstileToken({ ...INPUT, remoteIp: null }, fetchImpl);

    const body = fetchImpl.mock.calls[0]?.[1]?.body as URLSearchParams;
    expect(body.has("remoteip")).toBe(false);
  });

  it("aceita o token do host e da ação esperados", async () => {
    const result = await verifyTurnstileToken(
      INPUT,
      respondWith({
        success: true,
        hostname: "portfolio.example.com",
        action: "admin-login",
      }),
    );

    expect(result).toEqual({ ok: true });
  });

  it("recusa o token que a Cloudflare recusou", async () => {
    const result = await verifyTurnstileToken(
      INPUT,
      respondWith({
        success: false,
        "error-codes": ["timeout-or-duplicate"],
      }),
    );

    expect(result).toEqual({
      ok: false,
      reason: "rejected",
      errorCodes: ["timeout-or-duplicate"],
    });
  });

  it("recusa o token de outro formulário ou de outro host", async () => {
    for (const response of [
      { success: true, hostname: "portfolio.example.com", action: "contact" },
      { success: true, hostname: "evil.example", action: "admin-login" },
      { success: true, action: "admin-login" },
    ]) {
      expect(
        await verifyTurnstileToken(INPUT, respondWith(response)),
      ).toMatchObject({ ok: false, reason: "mismatch" });
    }
  });

  it("aceita a resposta das chaves de teste, que traz host e ação fixos", async () => {
    // Formato real, observado com a secret de teste da Cloudflare.
    const result = await verifyTurnstileToken(
      INPUT,
      respondWith({
        success: true,
        "error-codes": [],
        hostname: "example.com",
        metadata: { result_with_testing_key: true },
      }),
    );

    expect(result).toEqual({ ok: true });
  });

  it("trata falha de rede, erro HTTP e resposta fora do formato como indisponível", async () => {
    const failures = [
      vi.fn<typeof fetch>(async () => {
        throw new TypeError("fetch failed");
      }),
      respondWith({ success: true }, 500),
      respondWith({ ok: "sim" }),
    ];
    for (const fetchImpl of failures) {
      expect(await verifyTurnstileToken(INPUT, fetchImpl)).toEqual({
        ok: false,
        reason: "unavailable",
        errorCodes: [],
      });
    }
  });
});
