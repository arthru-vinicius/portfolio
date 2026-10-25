import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { adminMessages } from "@/i18n/admin";
import { getAdminEnv } from "@/lib/env";
import { isAllowedHost } from "@/lib/hosts";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: adminMessages.login.title };

async function LoginFormLoader() {
  // A configuração vem do ambiente do container, que só existe na hora do
  // pedido: sem isto, o build gravaria a página com o ambiente dele.
  await connection();
  const adminEnv = getAdminEnv();
  // O proxy já recusa os outros hosts; esta é a segunda barreira.
  if (!isAllowedHost((await headers()).get("host"), adminEnv.hosts)) {
    notFound();
  }
  if (adminEnv.status !== "ready") {
    return <p role="alert">{adminMessages.unavailable}</p>;
  }
  return <LoginForm siteKey={adminEnv.config.turnstile.siteKey} />;
}

/** Login do painel, a única página dele aberta sem sessão. */
export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">
        {adminMessages.login.heading}
      </h1>
      <Suspense
        fallback={<p className="text-muted">{adminMessages.loading}</p>}
      >
        <LoginFormLoader />
      </Suspense>
    </main>
  );
}
