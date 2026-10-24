-- Rascunho de trabalho do painel: uma linha só. O documento é JSON validado
-- pelo schema antes de gravar. lock_version é o controle de concorrência
-- otimista: quem salva informa a versão que leu, e o salvamento é recusado se
-- ela tiver mudado no meio do caminho.
CREATE TABLE draft (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  schema_version INTEGER NOT NULL,
  document TEXT NOT NULL CHECK (json_valid(document)),
  lock_version INTEGER NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

-- Revisões publicadas: o site lê a mais recente, e o histórico permite
-- restaurar qualquer uma como rascunho. São imutáveis.
CREATE TABLE published_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schema_version INTEGER NOT NULL,
  document TEXT NOT NULL CHECK (json_valid(document)),
  published_at TEXT NOT NULL,
  note TEXT
) STRICT;

CREATE TRIGGER published_revisions_no_update
BEFORE UPDATE ON published_revisions
BEGIN
  SELECT RAISE(ABORT, 'revisões publicadas são imutáveis');
END;

CREATE TRIGGER published_revisions_no_delete
BEFORE DELETE ON published_revisions
BEGIN
  SELECT RAISE(ABORT, 'revisões publicadas são imutáveis');
END;
