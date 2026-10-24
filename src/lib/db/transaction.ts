import type { DatabaseSync } from "node:sqlite";

/**
 * Executa `work` numa transação de escrita e faz o commit no fim, ou o
 * rollback se algo falhar.
 *
 * Usa `BEGIN IMMEDIATE` para reservar a escrita logo no início: assim, uma
 * disputa com outra conexão aparece aqui, na abertura, e não no meio do
 * trabalho.
 *
 * @param db - Conexão aberta. Não pode haver outra transação em andamento.
 * @param work - Função síncrona com as operações da transação.
 * @returns O valor devolvido por `work`.
 * @throws O erro original de `work` ou do commit, depois do rollback.
 */
export function withTransaction<T>(db: DatabaseSync, work: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = work();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // Alguns erros (disco cheio, por exemplo) já desfazem a transação no
      // próprio SQLite. Nesse caso o ROLLBACK falha, e o erro que importa é o
      // original.
    }
    throw error;
  }
}
