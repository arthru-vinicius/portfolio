import { describe, expect, it } from "vitest";

import {
  formatDateTime,
  formatIsoDate,
  formatTime,
  formatYearMonth,
} from "./format";

// 12:00 em UTC são 09:00 em Recife (UTC-3, sem horário de verão).
const NOON_UTC = "2026-10-24T12:00:00.000Z";

describe("formatação de datas", () => {
  it("usa o fuso de Recife, e não o do servidor", () => {
    expect(formatDateTime(NOON_UTC, "pt-BR")).toBe("24/10/2026, 09:00");
    expect(formatDateTime(new Date(NOON_UTC), "pt-BR")).toBe(
      "24/10/2026, 09:00",
    );
    expect(formatTime(NOON_UTC, "pt-BR")).toBe("09:00");
  });

  it("segue o idioma pedido", () => {
    expect(formatDateTime(NOON_UTC, "en")).toBe("10/24/26, 9:00 AM");
    expect(formatTime(NOON_UTC, "en")).toBe("9:00 AM");
  });

  it("escreve o mês do conteúdo nos dois idiomas, sem pular para o mês vizinho", () => {
    expect(formatYearMonth("2025-10", "pt-BR")).toBe("out. de 2025");
    expect(formatYearMonth("2025-10", "en")).toBe("Oct 2025");
    expect(formatYearMonth("2024-01", "pt-BR")).toBe("jan. de 2024");
  });

  it("escreve a data ISO no dia de Recife, mesmo quando em UTC já é outro dia", () => {
    expect(formatIsoDate(new Date("2026-10-25T02:00:00.000Z"))).toBe(
      "2026-10-24",
    );
  });
});
