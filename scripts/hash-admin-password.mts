/**
 * Gera o hash da senha do painel para o segredo `ADMIN_PASSWORD_HASH`.
 *
 * Só o mantenedor roda este script com a senha de verdade, no próprio
 * terminal: a senha é lida sem eco e só o hash sai na tela. Ninguém mais (nem
 * agente de IA) roda com uma senha real.
 *
 * Uso: `npm run --silent admin:hash-password`. Sem terminal (entrada
 * redirecionada), lê a primeira linha da entrada, sem confirmação; serve para
 * testar com senha fictícia, nunca para a real (ela ficaria no histórico do
 * shell).
 */
import { hashPassword } from "@/lib/auth/password";

const MIN_LENGTH = 12;
const MAX_LENGTH = 1024;

/** Falha esperada, com mensagem para quem roda. */
class InputError extends Error {}

function readHidden(prompt: string): Promise<string> {
  const { stdin, stderr } = process;
  stderr.write(prompt);
  stdin.setRawMode(true);
  stdin.setEncoding("utf8");
  stdin.resume();

  return new Promise((resolve, reject) => {
    let value = "";
    const finish = (error?: Error) => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stderr.write("\n");
      if (error) {
        reject(error);
      } else {
        resolve(value);
      }
    };
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") {
          finish();
          return;
        }
        if (char === "\u0003" || char === "\u0004") {
          finish(new InputError("cancelado."));
          return;
        }
        if (char === "\u007f" || char === "\b") {
          value = Array.from(value).slice(0, -1).join("");
        } else if (char >= " ") {
          value += char;
        }
      }
    };
    stdin.on("data", onData);
  });
}

async function readFirstLine(): Promise<string> {
  let input = "";
  for await (const chunk of process.stdin) {
    input += String(chunk);
  }
  return input.split(/\r?\n/)[0] ?? "";
}

async function readPassword(): Promise<string> {
  if (!process.stdin.isTTY) {
    return readFirstLine();
  }
  const password = await readHidden("Senha do painel: ");
  const repeated = await readHidden("Repita a senha: ");
  if (password !== repeated) {
    throw new InputError("as duas senhas são diferentes.");
  }
  return password;
}

async function main(): Promise<void> {
  const password = await readPassword();
  const length = Array.from(password).length;
  if (length < MIN_LENGTH || length > MAX_LENGTH) {
    throw new InputError(
      `a senha precisa ter de ${MIN_LENGTH} a ${MAX_LENGTH} caracteres.`,
    );
  }
  process.stdout.write(`${await hashPassword(password)}\n`);
  process.stderr.write("Grave a linha acima no segredo ADMIN_PASSWORD_HASH.\n");
}

try {
  await main();
} catch (error) {
  if (!(error instanceof InputError)) {
    throw error;
  }
  process.stderr.write(`[admin:hash-password] ${error.message}\n`);
  process.exitCode = 1;
}
