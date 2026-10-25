-- Contadores do limite de tentativas (login do painel e, depois, o formulário
-- de contato). Ficam no banco para que um deploy, que recria o container, não
-- zere a contagem.
CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  hits INTEGER NOT NULL CHECK (hits > 0),
  -- Fim da janela, em milissegundos desde 1970 (UTC).
  expires_at INTEGER NOT NULL
) STRICT;
