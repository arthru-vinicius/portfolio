import { describe, expect, it } from "vitest";

import { contentSecurityPolicy, securityHeaders } from "./security-headers";

/** A CSP como diretiva → fontes, para conferir uma de cada vez. */
function directives(policy: string): Record<string, string[]> {
  return Object.fromEntries(
    policy.split("; ").map((directive) => {
      const [name = "", ...sources] = directive.split(" ");
      return [name, sources];
    }),
  );
}

describe("contentSecurityPolicy", () => {
  it("no site, libera o Turnstile e o Web Analytics, e mais nada de fora", () => {
    const policy = directives(
      contentSecurityPolicy({ area: "site", development: false }),
    );

    expect(policy).toEqual({
      "default-src": ["'self'"],
      "script-src": [
        "'self'",
        "'unsafe-inline'",
        "https://challenges.cloudflare.com",
        "https://static.cloudflareinsights.com",
      ],
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:", "blob:"],
      "font-src": ["'self'"],
      "connect-src": ["'self'", "https://cloudflareinsights.com"],
      "frame-src": ["https://challenges.cloudflare.com"],
      "object-src": ["'none'"],
      "base-uri": ["'self'"],
      "form-action": ["'self'"],
      "frame-ancestors": ["'none'"],
    });
  });

  it("no painel, deixa o Web Analytics de fora", () => {
    const policy = contentSecurityPolicy({ area: "admin", development: false });

    expect(policy).not.toContain("cloudflareinsights");
    expect(directives(policy)["script-src"]).toContain(
      "https://challenges.cloudflare.com",
    );
  });

  it("só no desenvolvimento libera eval e WebSocket", () => {
    const policy = directives(
      contentSecurityPolicy({ area: "site", development: true }),
    );

    expect(policy["script-src"]).toContain("'unsafe-eval'");
    expect(policy["connect-src"]).toContain("ws:");
  });
});

describe("securityHeaders", () => {
  it("traz a CSP e os cabeçalhos que fecham o resto", () => {
    expect(securityHeaders({ area: "site", development: false })).toEqual({
      "Content-Security-Policy": expect.stringContaining(
        "frame-ancestors 'none'",
      ),
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": expect.stringContaining("camera=()"),
      "X-Frame-Options": "DENY",
      "Cross-Origin-Opener-Policy": "same-origin",
    });
  });
});
