import path from "node:path";

/** Caminho do banco no desenvolvimento e nos testes, relativo à raiz do projeto. */
export const LOCAL_DATABASE_PATH = ".data/portfolio.db";

/**
 * Pasta das migrations SQL. Na imagem, fica em `/app/migrations`, ao lado do
 * `server.js`: o build do Next a rastreia a partir deste caminho e a copia para
 * o standalone.
 */
export const MIGRATIONS_DIRECTORY = path.join(process.cwd(), "migrations");
