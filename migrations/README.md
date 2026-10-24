# Migrations do SQLite

Cada arquivo `NNNN-descricao.sql` desta pasta é aplicado uma vez, em ordem, na subida do
servidor (`src/lib/db/migrations.ts`). O registro fica na tabela `schema_migrations`, junto
com o checksum do arquivo.

## Regras

- **Só acrescentar.** Um rollback do deploy roda a imagem anterior contra o banco já migrado
  pela versão nova. Por isso uma migration nunca remove nem renomeia tabela ou coluna que a
  versão anterior ainda usa, e coluna nova precisa de valor padrão ou aceitar `NULL`.
- **Migration aplicada não se edita.** O checksum muda, e o servidor se recusa a subir. Para
  corrigir, crie uma migration nova.
- **Sem `BEGIN` nem `COMMIT` no arquivo.** Cada migration já roda numa transação própria.
- **Numeração sem repetição.** Duas branches com o mesmo número fazem a leitura falhar; quem
  mesclar por último renumera.
- **Tabelas `STRICT`**, para o SQLite recusar valores de tipo errado.
