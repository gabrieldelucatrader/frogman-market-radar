"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  active: boolean;
  createdAt: string;
};

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadUsers() {
    setLoading(true);
    setError("");

    const response = await fetch("/api/admin/users", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));

    setLoading(false);

    if (!response.ok) {
      setError(data.error || "Não foi possível carregar usuários.");
      return;
    }

    setUsers(data.users || []);
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    const data = await response.json().catch(() => ({}));

    setSaving(false);

    if (!response.ok) {
      setError(data.error || "Não foi possível criar o usuário.");
      return;
    }

    setName("");
    setEmail("");
    setPassword("");
    setRole("user");
    setMessage("Usuário criado com sucesso.");
    await loadUsers();
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUsers();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="brand-shell min-h-screen px-4 py-6 text-zinc-100 md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 border-b border-[#223019] pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#7ddc12]">
              Frogman Admin
            </p>
            <h1 className="brand-wordmark mt-2 text-3xl font-black text-white">
              Controle de acesso
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              Gerencie quem entra na mesa privada do Market Radar.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/"
              className="rounded border border-[#2b3a1d] px-4 py-2 text-sm font-bold text-zinc-200 transition hover:border-[#7ddc12] hover:text-[#b9ff6a]"
            >
              Voltar ao radar
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded border border-red-400/40 px-4 py-2 text-sm font-bold text-red-200 transition hover:bg-red-400/10"
            >
              Sair
            </button>
          </div>
        </header>

        {(error || message) && (
          <div
            className={`mt-5 rounded border p-4 text-sm ${
              error
                ? "border-red-400/40 bg-red-950/30 text-red-100"
                : "border-[#7ddc12]/35 bg-[#7ddc12]/10 text-[#d8ff9a]"
            }`}
          >
            {error || message}
          </div>
        )}

        <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <form className="brand-panel rounded-lg border border-[#223019] p-5" onSubmit={handleCreateUser}>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#7ddc12]">
              Novo usuário
            </p>
            <h2 className="mt-2 text-xl font-black text-white">Adicionar acesso</h2>

            <label className="mt-5 block text-sm font-bold text-zinc-300">
              Nome
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 w-full rounded border border-[#2b3a1d] bg-black/45 px-4 py-3 text-white outline-none focus:border-[#7ddc12]"
              />
            </label>

            <label className="mt-4 block text-sm font-bold text-zinc-300">
              E-mail
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded border border-[#2b3a1d] bg-black/45 px-4 py-3 text-white outline-none focus:border-[#7ddc12]"
              />
            </label>

            <label className="mt-4 block text-sm font-bold text-zinc-300">
              Senha temporária
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded border border-[#2b3a1d] bg-black/45 px-4 py-3 text-white outline-none focus:border-[#7ddc12]"
              />
            </label>

            <label className="mt-4 block text-sm font-bold text-zinc-300">
              Perfil
              <select
                value={role}
                onChange={(event) => setRole(event.target.value === "admin" ? "admin" : "user")}
                className="mt-2 w-full rounded border border-[#2b3a1d] bg-black/45 px-4 py-3 text-white outline-none focus:border-[#7ddc12]"
              >
                <option value="user">Usuário</option>
                <option value="admin">Administrador</option>
              </select>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="mt-6 w-full rounded bg-[#7ddc12] px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-black transition hover:bg-[#9af536] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Criando..." : "Criar usuário"}
            </button>
          </form>

          <section className="brand-panel rounded-lg border border-[#223019] p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#7ddc12]">
              Usuários
            </p>
            <h2 className="mt-2 text-xl font-black text-white">Acessos ativos</h2>

            <div className="mt-5 space-y-3">
              {loading ? (
                <p className="text-sm text-zinc-500">Carregando usuários...</p>
              ) : (
                users.map((user) => (
                  <div
                    key={user.id}
                    className="flex flex-col gap-2 rounded border border-[#2b3a1d] bg-black/25 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-black text-white">{user.name}</p>
                      <p className="text-sm text-zinc-500">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded border border-[#2b3a1d] px-2 py-1 text-xs font-black uppercase text-[#c6a64f]">
                        {user.role}
                      </span>
                      <span className="rounded border border-[#7ddc12]/35 bg-[#7ddc12]/10 px-2 py-1 text-xs font-black uppercase text-[#b9ff6a]">
                        ativo
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
