"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json().catch(() => ({}));

    setLoading(false);

    if (!response.ok) {
      setError(data.error || "Não foi possível entrar.");
      return;
    }

    const from = new URLSearchParams(window.location.search).get("from");

    router.push(from || "/");
    router.refresh();
  }

  return (
    <main className="brand-shell flex min-h-screen items-center justify-center px-4 py-10 text-zinc-100">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-[#223019] bg-black/25 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="brand-panel-strong p-6 md:p-8">
          <Image
            src="/frogman-logo.png"
            alt="Frogman Trader"
            width={112}
            height={112}
            priority
            className="h-24 w-24 rounded border border-[#7ddc12]/35 object-cover shadow-[0_0_28px_rgba(125,220,18,0.18)]"
          />
          <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-[#7ddc12]">
            Acesso restrito
          </p>
          <h1 className="brand-wordmark mt-3 text-3xl font-black text-white md:text-5xl">
            Frogman Market Radar
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-zinc-400">
            Mesa privada para leitura de pré-abertura, acompanhamento do sinal e rotina
            diária da operação.
          </p>
          <div className="brand-rule mt-8 h-px" />
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-[#c6a64f]">
            Disciplina • Gestão • Consistência
          </p>
        </div>

        <form className="brand-panel p-6 md:p-8" onSubmit={handleSubmit}>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#7ddc12]">
              Login
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">Entrar na mesa</h2>
          </div>

          <label className="mt-8 block text-sm font-bold text-zinc-300">
            E-mail
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded border border-[#2b3a1d] bg-black/45 px-4 py-3 text-white outline-none transition focus:border-[#7ddc12]"
              autoComplete="email"
            />
          </label>

          <label className="mt-4 block text-sm font-bold text-zinc-300">
            Senha
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded border border-[#2b3a1d] bg-black/45 px-4 py-3 text-white outline-none transition focus:border-[#7ddc12]"
              autoComplete="current-password"
            />
          </label>

          {error && (
            <div className="mt-4 rounded border border-red-400/40 bg-red-950/30 p-3 text-sm text-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded bg-[#7ddc12] px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-black transition hover:bg-[#9af536] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <p className="mt-4 text-xs leading-5 text-zinc-500">
            Use as credenciais fornecidas pelo administrador da mesa.
          </p>
        </form>
      </section>
    </main>
  );
}
