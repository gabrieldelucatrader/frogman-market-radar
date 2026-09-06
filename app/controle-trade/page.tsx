"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Market = "B3" | "PEPPERSTONE";
type Desk = Market | "CONSOLIDADO";
type EntryKind = "TRADE" | "APORTE" | "SAQUE";
type TradeStatus = "FECHADO" | "ABERTO";

type UserSession = {
  name: string;
  email: string;
  role: "admin" | "user";
};

type TradeEntry = {
  id: string;
  date: string;
  market: Market;
  kind: EntryKind;
  asset: string;
  direction: "COMPRA" | "VENDA";
  quantity: number;
  gross: number;
  costs: number;
  swap: number;
  currency: "BRL" | "USD";
  status: TradeStatus;
  strategy: string;
  notes: string;
  createdAt: string;
};

type FormState = {
  date: string;
  market: Market;
  kind: EntryKind;
  asset: string;
  direction: "COMPRA" | "VENDA";
  quantity: string;
  gross: string;
  costs: string;
  swap: string;
  status: TradeStatus;
  strategy: string;
  notes: string;
};

const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
const storagePrefix = "frogman.tradeControl.v1";

function blankForm(date = "", market: Market = "B3"): FormState {
  return {
    date,
    market,
    kind: "TRADE",
    asset: market === "B3" ? "WIN" : "XAUUSD",
    direction: "COMPRA",
    quantity: "1",
    gross: "",
    costs: "0",
    swap: "0",
    status: "FECHADO",
    strategy: "",
    notes: "",
  };
}

export default function TradeControlPage() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [entries, setEntries] = useState<TradeEntry[]>([]);
  const [desk, setDesk] = useState<Desk>("CONSOLIDADO");
  const [fxRate, setFxRate] = useState("5.30");
  const [form, setForm] = useState<FormState>(() => blankForm(localIsoDate(new Date())));
  const [month, setMonth] = useState(() => localIsoDate(new Date()).slice(0, 7));
  const [selectedDay, setSelectedDay] = useState("");
  const [message, setMessage] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<"loading" | "online" | "offline">("loading");
  const [pendingSyncIds, setPendingSyncIds] = useState<string[]>([]);
  const [cloudInitialized, setCloudInitialized] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const entriesRef = useRef<TradeEntry[]>([]);
  const pendingSyncIdsRef = useRef<string[]>([]);
  const cloudInitializedRef = useRef(false);
  const fxRateRef = useRef("5.30");

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const payload = response.ok ? await response.json() : null;
      const session = (payload?.user ?? null) as UserSession | null;
      const key = `${storagePrefix}:${session?.email ?? "local"}`;
      setUser(session);

      try {
        const stored = JSON.parse(window.localStorage.getItem(key) || "{}");
        const localEntries = Array.isArray(stored.entries) ? stored.entries as TradeEntry[] : [];
        const localRate = typeof stored.fxRate === "number" ? stored.fxRate : 5.3;
        const localPendingIds = Array.isArray(stored.pendingSyncIds) ? stored.pendingSyncIds.filter((id: unknown): id is string => typeof id === "string") : [];
        const localCloudInitialized = stored.cloudInitialized === true;
        setPendingSyncIds(localPendingIds);
        setCloudInitialized(localCloudInitialized);
        const cloudResponse = session ? await fetch("/api/trades", { cache: "no-store" }) : null;

        if (cloudResponse?.ok) {
          const cloud = await cloudResponse.json() as { entries?: TradeEntry[]; fxRate?: number };
          const cloudEntries = Array.isArray(cloud.entries) ? cloud.entries : [];
          const shouldMigrateLocal = !localCloudInitialized && !cloudEntries.length && (localEntries.length > 0 || localRate !== 5.3);
          setEntries(shouldMigrateLocal ? localEntries : cloudEntries);
          setFxRate(String(shouldMigrateLocal ? localRate : cloud.fxRate ?? localRate));
          setCloudStatus("online");

          if (shouldMigrateLocal) {
            const migrationResponse = await fetch("/api/trades", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entries: localEntries, fxRate: localRate }) });
            if (migrationResponse.ok) {
              setPendingSyncIds([]);
              setCloudInitialized(true);
            } else {
              setPendingSyncIds(localEntries.map((entry) => entry.id));
              setCloudStatus("offline");
            }
          } else {
            setCloudInitialized(true);
          }
        } else {
          setEntries(localEntries);
          setFxRate(String(localRate));
          setCloudStatus("offline");
        }
      } catch {
        setMessage("O arquivo local anterior não pôde ser lido. Importe um backup, se disponível.");
        setCloudStatus("offline");
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const key = `${storagePrefix}:${user?.email ?? "local"}`;
    window.localStorage.setItem(key, JSON.stringify({ entries, fxRate: numberOf(fxRate), pendingSyncIds, cloudInitialized }));
  }, [cloudInitialized, entries, fxRate, hydrated, pendingSyncIds, user?.email]);

  useEffect(() => { entriesRef.current = entries; }, [entries]);
  useEffect(() => { pendingSyncIdsRef.current = pendingSyncIds; }, [pendingSyncIds]);
  useEffect(() => { cloudInitializedRef.current = cloudInitialized; }, [cloudInitialized]);
  useEffect(() => { fxRateRef.current = fxRate; }, [fxRate]);

  useEffect(() => {
    if (!hydrated || !user) return;
    const refresh = async () => {
      try {
        const pendingIds = pendingSyncIdsRef.current;
        if (pendingIds.length) {
          const pendingEntries = entriesRef.current.filter((entry) => pendingIds.includes(entry.id));
          const retryResponse = await fetch("/api/trades", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entries: pendingEntries }) });
          if (!retryResponse.ok) { setCloudStatus("offline"); return; }
          setPendingSyncIds((current) => current.filter((id) => !pendingIds.includes(id)));
        }
        const response = await fetch("/api/trades", { cache: "no-store" });
        if (!response.ok) { setCloudStatus("offline"); return; }
        const cloud = await response.json() as { entries?: TradeEntry[]; fxRate?: number };
        const cloudEntries = Array.isArray(cloud.entries) ? cloud.entries : [];
        if (!cloudInitializedRef.current && !cloudEntries.length && entriesRef.current.length) {
          const migrationResponse = await fetch("/api/trades", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entries: entriesRef.current, fxRate: numberOf(fxRateRef.current) }) });
          if (!migrationResponse.ok) { setCloudStatus("offline"); return; }
          setCloudInitialized(true);
          setPendingSyncIds([]);
          setCloudStatus("online");
          return;
        }
        setEntries(cloudEntries);
        if (typeof cloud.fxRate === "number") setFxRate(String(cloud.fxRate));
        setCloudInitialized(true);
        setCloudStatus("online");
      } catch {
        setCloudStatus("offline");
      }
    };
    const timer = window.setInterval(() => void refresh(), 8000);
    return () => window.clearInterval(timer);
  }, [hydrated, user]);

  useEffect(() => {
    if (!hydrated || !user || cloudStatus === "loading") return;
    const timer = window.setTimeout(() => {
      void fetch("/api/trades", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fxRate: Math.max(0.01, numberOf(fxRate)) }) })
        .then((response) => setCloudStatus(response.ok ? "online" : "offline"))
        .catch(() => setCloudStatus("offline"));
    }, 700);
    return () => window.clearTimeout(timer);
  }, [cloudStatus, fxRate, hydrated, user]);

  const rate = Math.max(0.01, numberOf(fxRate));
  const visibleEntries = useMemo(
    () => entries.filter((entry) => desk === "CONSOLIDADO" || entry.market === desk),
    [desk, entries]
  );
  const monthEntries = useMemo(
    () => visibleEntries.filter((entry) => entry.date.startsWith(month)),
    [month, visibleEntries]
  );
  const metrics = useMemo(() => calculateMetrics(visibleEntries, rate), [rate, visibleEntries]);
  const monthMetrics = useMemo(() => calculateMetrics(monthEntries, rate), [monthEntries, rate]);
  const calendarDays = useMemo(() => buildCalendar(month, monthEntries, rate), [month, monthEntries, rate]);
  const selectedEntries = useMemo(
    () => (selectedDay ? visibleEntries.filter((entry) => entry.date === selectedDay) : []),
    [selectedDay, visibleEntries]
  );
  const monthlySeries = useMemo(() => buildMonthlySeries(visibleEntries, rate, month), [month, rate, visibleEntries]);

  function selectDesk(nextDesk: Desk) {
    setDesk(nextDesk);
    setSelectedDay("");
    if (nextDesk !== "CONSOLIDADO") {
      setForm((current) => ({
        ...current,
        market: nextDesk,
        asset: nextDesk === "B3" ? "WIN" : "XAUUSD",
      }));
    }
  }

  function updateMarket(market: Market) {
    setForm((current) => ({ ...current, market, asset: market === "B3" ? "WIN" : "XAUUSD" }));
  }

  async function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const gross = numberOf(form.gross);

    if (!form.date || !Number.isFinite(gross) || (form.kind === "TRADE" && !form.asset.trim())) {
      setMessage("Preencha a data, o ativo e o resultado ou valor da movimentação.");
      return;
    }

    const entry: TradeEntry = {
      id: crypto.randomUUID(),
      date: form.date,
      market: form.market,
      kind: form.kind,
      asset: form.kind === "TRADE" ? form.asset.trim().toUpperCase() : form.kind,
      direction: form.direction,
      quantity: Math.max(0, numberOf(form.quantity)),
      gross,
      costs: form.kind === "TRADE" ? Math.abs(numberOf(form.costs)) : 0,
      swap: form.kind === "TRADE" ? numberOf(form.swap) : 0,
      currency: form.market === "B3" ? "BRL" : "USD",
      status: form.kind === "TRADE" ? form.status : "FECHADO",
      strategy: form.strategy.trim(),
      notes: form.notes.trim(),
      createdAt: new Date().toISOString(),
    };

    setEntries((current) => [entry, ...current]);
    setForm(blankForm(form.date, form.market));
    try {
      const response = await fetch("/api/trades", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entry }) });
      setCloudStatus(response.ok ? "online" : "offline");
      if (response.ok) setPendingSyncIds((current) => current.filter((id) => id !== entry.id));
      else setPendingSyncIds((current) => [...new Set([...current, entry.id])]);
      setMessage(response.ok ? `${form.kind === "TRADE" ? "Operação" : "Movimentação"} registrada e sincronizada.` : "Lançamento salvo neste aparelho; a nuvem será tentada novamente.");
    } catch {
      setPendingSyncIds((current) => [...new Set([...current, entry.id])]);
      setCloudStatus("offline");
      setMessage("Lançamento salvo neste aparelho; a nuvem será tentada novamente.");
    }
  }

  async function removeEntry(id: string) {
    if (!window.confirm("Excluir este lançamento? Essa ação não pode ser desfeita sem um backup.")) return;
    const removed = entries.find((entry) => entry.id === id);
    setEntries((current) => current.filter((entry) => entry.id !== id));
    let deleted = false;
    try {
      const response = await fetch("/api/trades", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      deleted = response.ok;
    } catch {}
    if (!deleted && removed) {
      setEntries((current) => [removed, ...current]);
      setCloudStatus("offline");
      setMessage("A exclusão não foi sincronizada e foi desfeita.");
      return;
    }
    setPendingSyncIds((current) => current.filter((entryId) => entryId !== id));
    setCloudStatus("online");
    setMessage("Lançamento excluído em todos os aparelhos.");
  }

  function downloadBackup() {
    downloadFile(
      `frogman-controle-trade-${localIsoDate(new Date())}.json`,
      JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), fxRate: rate, entries }, null, 2),
      "application/json"
    );
    setMessage("Backup completo baixado.");
  }

  function downloadCsv() {
    const header = ["data", "mercado", "tipo", "ativo", "direcao", "quantidade", "bruto", "custos", "swap", "moeda", "status", "estrategia", "observacoes"];
    const rows = entries.map((entry) => [entry.date, entry.market, entry.kind, entry.asset, entry.direction, entry.quantity, entry.gross, entry.costs, entry.swap, entry.currency, entry.status, entry.strategy, entry.notes]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(";")).join("\n");
    downloadFile(`frogman-trades-${localIsoDate(new Date())}.csv`, `\ufeff${csv}`, "text/csv;charset=utf-8");
    setMessage("Planilha CSV baixada.");
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const payload = JSON.parse(await file.text());
      if (!Array.isArray(payload.entries)) throw new Error("Formato inválido");
      setEntries(payload.entries);
      if (typeof payload.fxRate === "number") setFxRate(String(payload.fxRate));
      try {
        const response = await fetch("/api/trades", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entries: payload.entries, fxRate: payload.fxRate ?? rate }) });
        setCloudStatus(response.ok ? "online" : "offline");
        setPendingSyncIds(response.ok ? [] : payload.entries.map((entry: TradeEntry) => entry.id));
        setMessage(response.ok ? `${payload.entries.length} lançamentos importados e sincronizados.` : "Backup importado somente neste aparelho; a nuvem será tentada novamente.");
      } catch {
        setCloudStatus("offline");
        setPendingSyncIds(payload.entries.map((entry: TradeEntry) => entry.id));
        setMessage("Backup importado somente neste aparelho; a nuvem será tentada novamente.");
      }
    } catch {
      setMessage("Backup inválido. Use um JSON exportado pelo próprio Frogman.");
    } finally {
      event.target.value = "";
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <main className="brand-shell min-h-screen text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-[#223019] bg-[#070a08]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-3 px-4 py-3 md:px-8 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <Image src="/frogman-logo.png" alt="Frogman Trader" width={56} height={56} priority className="h-11 w-11 rounded border border-[#7ddc12]/35 object-cover" />
            <div>
              <p className="brand-wordmark text-sm font-black uppercase tracking-[0.18em]">Frogman Trader</p>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#7ddc12]">Trade Control</p>
            </div>
          </div>

          <nav className="brand-nav flex max-w-full overflow-x-auto rounded border border-[#2b3a1d] bg-black/30 p-1 text-xs font-black uppercase tracking-[0.1em]">
            <Link href="/" className="whitespace-nowrap rounded px-4 py-2 text-zinc-400 hover:text-white">B3 / WIN</Link>
            <Link href="/internacional" className="whitespace-nowrap rounded px-4 py-2 text-zinc-400 hover:text-white">Internacional</Link>
            <Link href="/controle-trade" className="whitespace-nowrap rounded bg-[#7ddc12] px-4 py-2 text-black">Controle</Link>
          </nav>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {user && <HeaderPill label={user.role === "admin" ? "Admin" : "Usuário"} value={user.name} />}
            <HeaderPill label="Nuvem" value={cloudStatus === "online" ? "Sincronizada" : cloudStatus === "offline" ? "Modo local" : "Conectando"} />
            <button type="button" onClick={downloadCsv} className="rounded border border-zinc-700 px-3 py-2 font-bold uppercase text-zinc-200 hover:border-[#7ddc12]">CSV</button>
            <button type="button" onClick={downloadBackup} className="rounded border border-zinc-700 px-3 py-2 font-bold uppercase text-zinc-200 hover:border-[#7ddc12]">Backup</button>
            <button type="button" onClick={() => importRef.current?.click()} className="rounded border border-zinc-700 px-3 py-2 font-bold uppercase text-zinc-200 hover:border-[#7ddc12]">Importar</button>
            <input ref={importRef} type="file" accept="application/json,.json" onChange={importBackup} className="hidden" />
            <button type="button" onClick={handleLogout} className="rounded border border-red-400/35 px-3 py-2 font-bold uppercase text-red-200 hover:bg-red-400/10">Sair</button>
          </div>
        </div>
        <div className="brand-rule h-px opacity-80" />
      </header>

      <div className="mx-auto max-w-[1500px] px-4 py-5 md:px-8">
        <section className="brand-panel-strong rounded-lg border border-[#2b3a1d] p-4 sm:p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7ddc12] sm:text-xs">Frogman Performance Desk · Gestão financeira operacional</p>
              <h1 className="mt-2 text-3xl font-black text-white md:text-4xl">Controle de Trade</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">B3 e Pepperstone separados, com resultado realizado, custos, movimentações e calendário de consistência.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["CONSOLIDADO", "B3", "PEPPERSTONE"] as Desk[]).map((item) => (
                <button key={item} type="button" onClick={() => selectDesk(item)} className={`rounded px-4 py-2 text-xs font-black uppercase tracking-[0.12em] ${desk === item ? "bg-[#7ddc12] text-black" : "border border-zinc-700 bg-black/20 text-zinc-300"}`}>
                  {item === "CONSOLIDADO" ? "Visão geral" : item}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 border-t border-[#2b3a1d]/70 pt-4 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-400 sm:text-[10px]">
            <span className="rounded border border-blue-400/20 bg-blue-400/5 px-2.5 py-1.5 text-blue-200">B3 segregada</span>
            <span className="rounded border border-amber-300/20 bg-amber-300/5 px-2.5 py-1.5 text-amber-100">Pepperstone em USD</span>
            <span className="rounded border border-[#7ddc12]/20 bg-[#7ddc12]/5 px-2.5 py-1.5 text-[#caff91]">Nuvem + contingência local</span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <Metric label="Resultado realizado" value={money(metrics.realized)} tone={metrics.realized} />
            <Metric label="Saldo operacional" value={money(metrics.balance)} tone={metrics.balance} />
            <Metric label="Custos + swap" value={money(metrics.costs)} tone={-metrics.costs} />
            <Metric label="Taxa de acerto" value={`${metrics.winRate.toFixed(1)}%`} tone={metrics.winRate - 50} />
            <Metric label="Fator de lucro" value={metrics.profitFactor === Infinity ? "∞" : metrics.profitFactor.toFixed(2)} tone={metrics.profitFactor - 1} />
            <Metric label="Drawdown máximo" value={money(metrics.drawdown)} tone={-metrics.drawdown} />
          </div>
        </section>

        {message && <div className="mt-4 rounded border border-[#7ddc12]/30 bg-[#7ddc12]/10 px-4 py-3 text-sm text-[#caff91]">{message}</div>}

        <section className="mt-4 grid gap-4 xl:grid-cols-[430px_1fr]">
          <form onSubmit={submitEntry} className="brand-panel rounded-lg border border-[#223019] p-4 sm:p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#c6a64f]">Novo lançamento</p>
            <h2 className="mt-1 text-2xl font-black text-white">Registrar movimento</h2>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Field label="Data"><input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="trade-input" /></Field>
              <Field label="Mercado"><select value={form.market} onChange={(event) => updateMarket(event.target.value as Market)} className="trade-input"><option value="B3">B3</option><option value="PEPPERSTONE">Pepperstone</option></select></Field>
              <Field label="Tipo"><select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as EntryKind })} className="trade-input"><option value="TRADE">Trade</option><option value="APORTE">Aporte</option><option value="SAQUE">Saque</option></select></Field>
              {form.kind === "TRADE" && <Field label="Status"><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as TradeStatus })} className="trade-input"><option value="FECHADO">Fechado</option><option value="ABERTO">Em aberto</option></select></Field>}
            </div>

            {form.kind === "TRADE" ? (
              <>
                <div className="mt-3 grid grid-cols-1 gap-3 min-[430px]:grid-cols-2">
                  <Field label="Ativo"><input required value={form.asset} onChange={(event) => setForm({ ...form, asset: event.target.value })} placeholder={form.market === "B3" ? "WIN, WDO, PETR4" : "XAUUSD, EURUSD, BTCUSD"} className="trade-input" /></Field>
                  <Field label="Direção"><select value={form.direction} onChange={(event) => setForm({ ...form, direction: event.target.value as "COMPRA" | "VENDA" })} className="trade-input"><option value="COMPRA">Compra</option><option value="VENDA">Venda</option></select></Field>
                  <Field label={form.market === "B3" ? "Contratos / quantidade" : "Lote / quantidade"}><input inputMode="decimal" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} className="trade-input" /></Field>
                  <Field label={`Resultado bruto (${form.market === "B3" ? "R$" : "US$"})`}><input required inputMode="decimal" value={form.gross} onChange={(event) => setForm({ ...form, gross: event.target.value })} placeholder="Use negativo no prejuízo" className="trade-input" /></Field>
                  <Field label={`Custos (${form.market === "B3" ? "R$" : "US$"})`}><input inputMode="decimal" value={form.costs} onChange={(event) => setForm({ ...form, costs: event.target.value })} className="trade-input" /></Field>
                  <Field label={`Swap/ajuste (${form.market === "B3" ? "R$" : "US$"})`}><input inputMode="decimal" value={form.swap} onChange={(event) => setForm({ ...form, swap: event.target.value })} className="trade-input" /></Field>
                </div>
                <div className="mt-3 grid gap-3">
                  <Field label="Estratégia"><input value={form.strategy} onChange={(event) => setForm({ ...form, strategy: event.target.value })} placeholder="Rompimento, pullback, reversão..." className="trade-input" /></Field>
                  <Field label="Diário operacional"><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Contexto, execução, emoção e aprendizado" rows={3} className="trade-input resize-none" /></Field>
                </div>
              </>
            ) : (
              <div className="mt-3">
                <Field label={`${form.kind === "APORTE" ? "Valor aportado" : "Valor sacado"} (${form.market === "B3" ? "R$" : "US$"})`}><input required inputMode="decimal" value={form.gross} onChange={(event) => setForm({ ...form, gross: event.target.value })} className="trade-input" /></Field>
              </div>
            )}

            <button type="submit" className="mt-5 w-full rounded bg-[#7ddc12] px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-black hover:bg-[#9af02d]">Salvar lançamento</button>
            <p className="mt-3 text-[11px] leading-5 text-zinc-500">Aporte não conta como lucro. Operação aberta fica fora do resultado realizado até ser encerrada.</p>
          </form>

          <div className="space-y-4">
            <section className="brand-panel rounded-lg border border-[#223019] p-3 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#7ddc12]">Calendário</p><h2 className="mt-1 text-2xl font-black capitalize text-white">{month ? monthFormatter.format(new Date(`${month}-15T12:00:00`)) : "Mês"}</h2></div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} className="calendar-button" aria-label="Mês anterior">←</button>
                  <input type="month" value={month} onChange={(event) => { setMonth(event.target.value); setSelectedDay(""); }} className="trade-input max-w-44" />
                  <button type="button" onClick={() => setMonth(shiftMonth(month, 1))} className="calendar-button" aria-label="Próximo mês">→</button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase text-zinc-500">{["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day) => <div key={day} className="py-1">{day}</div>)}</div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => day ? (
                  <button key={day.date} type="button" onClick={() => setSelectedDay(day.date)} className={`min-h-16 rounded border p-1.5 text-left transition sm:min-h-20 sm:p-2 ${selectedDay === day.date ? "border-[#7ddc12]" : "border-zinc-800"} ${day.result > 0 ? "bg-[#7ddc12]/10" : day.result < 0 ? "bg-red-500/10" : "bg-black/20"}`}>
                    <span className="text-xs font-black text-zinc-400">{day.day}</span>
                    {day.trades > 0 && <><p className={`mt-1 overflow-hidden text-[9px] font-black sm:mt-2 sm:text-xs ${day.result >= 0 ? "text-[#b9ff6a]" : "text-red-300"}`}>{compactMoney(day.result)}</p><p className="mt-1 hidden text-[9px] text-zinc-500 min-[430px]:block">{day.trades} trade{day.trades === 1 ? "" : "s"}</p></>}
                  </button>
                ) : <div key={`empty-${index}`} className="min-h-16 rounded border border-transparent sm:min-h-20" />)}
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-4">
                <MiniMetric label="Resultado do mês" value={money(monthMetrics.realized)} tone={monthMetrics.realized} />
                <MiniMetric label="Dias positivos" value={String(monthMetrics.positiveDays)} tone={monthMetrics.positiveDays} />
                <MiniMetric label="Dias negativos" value={String(monthMetrics.negativeDays)} tone={-monthMetrics.negativeDays} />
                <MiniMetric label="Operações" value={String(monthMetrics.closedTrades)} tone={0} />
              </div>
            </section>

            <section className="brand-panel rounded-lg border border-[#223019] p-4 sm:p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#c6a64f]">Consolidação</p><h2 className="mt-1 text-2xl font-black text-white">Curva dos últimos 6 meses</h2></div>
                <Field label="USD/BRL para consolidação"><input inputMode="decimal" value={fxRate} onChange={(event) => setFxRate(event.target.value)} className="trade-input max-w-40" /></Field>
              </div>
              <div className="mt-5 grid h-44 grid-cols-6 items-end gap-2">
                {monthlySeries.map((item) => {
                  const max = Math.max(1, ...monthlySeries.map((point) => Math.abs(point.value)));
                  const height = Math.max(8, Math.round((Math.abs(item.value) / max) * 115));
                  return <div key={item.month} className="flex h-full flex-col items-center justify-end gap-2"><span className={`text-[10px] font-black ${item.value >= 0 ? "text-[#b9ff6a]" : "text-red-300"}`}>{compactMoney(item.value)}</span><div className={`w-full max-w-16 rounded-t ${item.value >= 0 ? "bg-[#7ddc12]" : "bg-red-500"}`} style={{ height }} /><span className="text-[10px] font-bold uppercase text-zinc-500">{item.label}</span></div>;
                })}
              </div>
            </section>
          </div>
        </section>

        <section className="mt-4 brand-panel rounded-lg border border-[#223019] p-4 sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#7ddc12]">Livro operacional</p><h2 className="mt-1 text-2xl font-black text-white">{selectedDay ? `Lançamentos de ${formatDate(selectedDay)}` : "Últimos lançamentos"}</h2></div>
            {selectedDay && <button type="button" onClick={() => setSelectedDay("")} className="rounded border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-300">Mostrar todos</button>}
          </div>
          <EntryTable entries={selectedDay ? selectedEntries : visibleEntries.slice(0, 30)} rate={rate} onRemove={removeEntry} />
        </section>

        <footer className="mt-4 rounded-lg border border-[#223019] bg-black/25 p-4 text-xs leading-5 text-zinc-500">
          Sincronização protegida pelo login entre navegador e PWA. O armazenamento local continua como contingência; use <strong className="text-zinc-300">Backup</strong> regularmente. Valores em aberto não entram no lucro realizado.
        </footer>
      </div>
    </main>
  );
}

function EntryTable({ entries, rate, onRemove }: { entries: TradeEntry[]; rate: number; onRemove: (id: string) => void }) {
  if (!entries.length) return <p className="mt-5 rounded border border-dashed border-zinc-700 p-8 text-center text-sm text-zinc-500">Nenhum lançamento neste período.</p>;
  return <div className="mt-5 overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="border-b border-zinc-700 text-[10px] uppercase tracking-[0.12em] text-zinc-500"><tr><th className="px-3 py-3">Data</th><th className="px-3 py-3">Mesa</th><th className="px-3 py-3">Ativo/tipo</th><th className="px-3 py-3">Execução</th><th className="px-3 py-3">Bruto</th><th className="px-3 py-3">Líquido</th><th className="px-3 py-3">Estratégia</th><th className="px-3 py-3" /></tr></thead><tbody>{entries.map((entry) => { const net = entryNet(entry); const brl = toBrl(net, entry.currency, rate); return <tr key={entry.id} className="border-b border-zinc-800/80"><td className="whitespace-nowrap px-3 py-3 font-bold text-zinc-300">{formatDate(entry.date)}</td><td className="px-3 py-3"><span className={`rounded px-2 py-1 text-[9px] font-black ${entry.market === "B3" ? "bg-blue-500/15 text-blue-300" : "bg-amber-300/15 text-amber-200"}`}>{entry.market}</span></td><td className="px-3 py-3"><p className="font-black text-white">{entry.asset}</p><p className="mt-1 text-[10px] text-zinc-500">{entry.kind}{entry.kind === "TRADE" ? ` · ${entry.status}` : ""}</p></td><td className="whitespace-nowrap px-3 py-3 text-zinc-400">{entry.kind === "TRADE" ? `${entry.direction} · ${entry.quantity}` : "—"}</td><td className="whitespace-nowrap px-3 py-3 text-zinc-300">{nativeMoney(entry.gross, entry.currency)}</td><td className={`whitespace-nowrap px-3 py-3 font-black ${brl >= 0 ? "text-[#b9ff6a]" : "text-red-300"}`}>{entry.kind === "TRADE" && entry.status === "ABERTO" ? "Em aberto" : money(brl)}</td><td className="max-w-56 px-3 py-3 text-zinc-400"><p>{entry.strategy || "—"}</p>{entry.notes && <p className="mt-1 truncate text-[10px] text-zinc-600">{entry.notes}</p>}</td><td className="px-3 py-3"><button type="button" onClick={() => onRemove(entry.id)} className="text-[10px] font-black uppercase text-red-300 hover:text-red-200">Excluir</button></td></tr>; })}</tbody></table></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500"><span className="mb-1.5 block">{label}</span>{children}</label>; }
function HeaderPill({ label, value }: { label: string; value: string }) { return <div className="rounded border border-[#2b3a1d] bg-black/25 px-3 py-2"><span className="font-bold uppercase text-zinc-500">{label}: </span><span className="font-black text-zinc-200">{value}</span></div>; }
function Metric({ label, value, tone }: { label: string; value: string; tone: number }) { return <div className="rounded border border-zinc-800 bg-black/25 p-4"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500">{label}</p><p className={`mt-2 text-xl font-black ${tone > 0 ? "text-[#b9ff6a]" : tone < 0 ? "text-red-300" : "text-zinc-200"}`}>{value}</p></div>; }
function MiniMetric({ label, value, tone }: { label: string; value: string; tone: number }) { return <div className="rounded border border-zinc-800 bg-black/25 p-3"><p className="text-[9px] font-black uppercase text-zinc-500">{label}</p><p className={`mt-1 text-sm font-black ${tone > 0 ? "text-[#b9ff6a]" : tone < 0 ? "text-red-300" : "text-zinc-200"}`}>{value}</p></div>; }

function calculateMetrics(entries: TradeEntry[], rate: number) {
  const closed = entries.filter((entry) => entry.kind === "TRADE" && entry.status === "FECHADO");
  const tradeNets = closed.map((entry) => toBrl(entryNet(entry), entry.currency, rate));
  const wins = tradeNets.filter((value) => value > 0);
  const losses = tradeNets.filter((value) => value < 0);
  const grossProfit = wins.reduce((sum, value) => sum + value, 0);
  const grossLoss = Math.abs(losses.reduce((sum, value) => sum + value, 0));
  const realized = tradeNets.reduce((sum, value) => sum + value, 0);
  const deposits = entries.filter((entry) => entry.kind === "APORTE").reduce((sum, entry) => sum + toBrl(entry.gross, entry.currency, rate), 0);
  const withdrawals = entries.filter((entry) => entry.kind === "SAQUE").reduce((sum, entry) => sum + Math.abs(toBrl(entry.gross, entry.currency, rate)), 0);
  const costs = closed.reduce((sum, entry) => sum + toBrl(Math.max(0, entry.costs - entry.swap), entry.currency, rate), 0);
  let equity = 0;
  let peak = 0;
  let drawdown = 0;
  [...closed].sort((a, b) => a.date.localeCompare(b.date)).forEach((entry) => { equity += toBrl(entryNet(entry), entry.currency, rate); peak = Math.max(peak, equity); drawdown = Math.max(drawdown, peak - equity); });
  const dayTotals = new Map<string, number>();
  closed.forEach((entry) => dayTotals.set(entry.date, (dayTotals.get(entry.date) ?? 0) + toBrl(entryNet(entry), entry.currency, rate)));
  return {
    realized, deposits, withdrawals, costs, balance: deposits - withdrawals + realized,
    winRate: closed.length ? (wins.length / closed.length) * 100 : 0,
    profitFactor: grossLoss ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    drawdown, closedTrades: closed.length,
    positiveDays: [...dayTotals.values()].filter((value) => value > 0).length,
    negativeDays: [...dayTotals.values()].filter((value) => value < 0).length,
  };
}

function buildCalendar(month: string, entries: TradeEntry[], rate: number) {
  if (!month) return [];
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(year, monthNumber - 1, 1);
  const days = new Date(year, monthNumber, 0).getDate();
  const leading = (first.getDay() + 6) % 7;
  const result: Array<{ date: string; day: number; result: number; trades: number } | null> = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= days; day += 1) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    const daily = entries.filter((entry) => entry.date === date && entry.kind === "TRADE" && entry.status === "FECHADO");
    result.push({ date, day, result: daily.reduce((sum, entry) => sum + toBrl(entryNet(entry), entry.currency, rate), 0), trades: daily.length });
  }
  return result;
}

function buildMonthlySeries(entries: TradeEntry[], rate: number, anchor: string) {
  const base = anchor ? new Date(`${anchor}-15T12:00:00`) : new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(base.getFullYear(), base.getMonth() - (5 - index), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const value = entries.filter((entry) => entry.date.startsWith(key) && entry.kind === "TRADE" && entry.status === "FECHADO").reduce((sum, entry) => sum + toBrl(entryNet(entry), entry.currency, rate), 0);
    return { month: key, label: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date).replace(".", ""), value };
  });
}

function entryNet(entry: TradeEntry) { if (entry.kind === "APORTE") return Math.abs(entry.gross); if (entry.kind === "SAQUE") return -Math.abs(entry.gross); return entry.gross - Math.abs(entry.costs) + entry.swap; }
function toBrl(value: number, currency: "BRL" | "USD", rate: number) { return currency === "USD" ? value * rate : value; }
function numberOf(value: string | number) { if (typeof value === "number") return Number.isFinite(value) ? value : 0; const normalized = value.trim().replace(/\s/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", "."); const number = Number(normalized); return Number.isFinite(number) ? number : 0; }
function money(value: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value); }
function nativeMoney(value: number, currency: "BRL" | "USD") { return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value); }
function compactMoney(value: number) { return new Intl.NumberFormat("pt-BR", { notation: "compact", style: "currency", currency: "BRL", maximumFractionDigits: 1 }).format(value); }
function formatDate(value: string) { return shortDateFormatter.format(new Date(`${value}T12:00:00`)); }
function localIsoDate(date: Date) { const offset = date.getTimezoneOffset() * 60000; return new Date(date.getTime() - offset).toISOString().slice(0, 10); }
function shiftMonth(value: string, amount: number) { if (!value) return localIsoDate(new Date()).slice(0, 7); const [year, month] = value.split("-").map(Number); const date = new Date(year, month - 1 + amount, 1); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; }
function csvCell(value: string | number) { return `"${String(value).replaceAll('"', '""')}"`; }
function downloadFile(name: string, content: string, type: string) { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url); }
