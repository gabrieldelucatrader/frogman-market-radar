"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Region = "ASIA" | "EUROPA" | "ESTADOS UNIDOS" | "COMMODITIES" | "CRIPTO" | "DRIVERS";

type Asset = {
  id: string;
  name: string;
  symbol: string;
  region: Region;
  description: string;
  precision: number;
  price: number;
  previousClose: number;
  changePercent: number;
  momentum60m: number;
  dayHigh: number;
  dayLow: number;
  rangePosition: number;
  atrPercent: number;
  marketState: string;
  marketTime: string;
  timestamp: number;
  currency: string;
  source: string;
  quality: "online" | "delayed" | "offline";
};

type RadarData = {
  assets: Asset[];
  pulse: {
    score: number;
    regime: string;
    risk: number;
    dollar: number;
    volatility: number;
    rates: number;
    ratesChangeBps: number;
    summary: string;
  };
  sessions: Array<{
    id: string;
    name: string;
    note: string;
    localTime: string;
    open: boolean;
    status: string;
  }>;
  events: Array<{
    title: string;
    currency: string;
    impact: string;
    forecast: string;
    previous: string;
    timestamp: number;
    time: string;
  }>;
  insights: Array<{
    title: string;
    detail: string;
    tone: "positive" | "negative" | "neutral";
  }>;
  meta: {
    updatedAt: string;
    refreshSeconds: number;
    online: number;
    delayed: number;
    offline: number;
    source: string;
    disclaimer: string;
  };
};

type UserSession = {
  name: string;
  email: string;
  role: "admin" | "user";
};

const regionOrder: Region[] = ["ASIA", "EUROPA", "ESTADOS UNIDOS", "COMMODITIES", "CRIPTO", "DRIVERS"];

const regionMeta: Record<Region, { title: string; subtitle: string; accent: string }> = {
  ASIA: { title: "Ásia e Pacífico", subtitle: "Sydney · Tóquio · Hong Kong · China", accent: "text-cyan-300" },
  EUROPA: { title: "Europa", subtitle: "Londres · Frankfurt · Paris", accent: "text-blue-300" },
  "ESTADOS UNIDOS": { title: "Estados Unidos", subtitle: "Nova York · índices e dólar", accent: "text-emerald-300" },
  COMMODITIES: { title: "Metais e Energia", subtitle: "Ouro · prata · petróleo · gás", accent: "text-amber-300" },
  CRIPTO: { title: "Criptomoedas", subtitle: "Mercado 24 horas · 7 dias", accent: "text-orange-300" },
  DRIVERS: { title: "Drivers Globais", subtitle: "Dólar · juros · volatilidade", accent: "text-fuchsia-300" },
};

const emptyData: RadarData = {
  assets: [],
  pulse: { score: 0, regime: "CARREGANDO", risk: 0, dollar: 0, volatility: 0, rates: 0, ratesChangeBps: 0, summary: "" },
  sessions: [],
  events: [],
  insights: [],
  meta: {
    updatedAt: "--",
    refreshSeconds: 30,
    online: 0,
    delayed: 0,
    offline: 0,
    source: "",
    disclaimer: "",
  },
};

export default function InternationalRadarPage() {
  const [data, setData] = useState<RadarData>(emptyData);
  const [selectedId, setSelectedId] = useState("us500");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<UserSession | null>(null);
  const [secondsToRefresh, setSecondsToRefresh] = useState(30);

  async function loadRadar() {
    try {
      setError("");
      const response = await fetch("/api/international", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Falha ao carregar o mercado internacional.");
      setData(payload);
      setSecondsToRefresh(payload.meta?.refreshSeconds ?? 30);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha ao carregar o mercado internacional.");
    } finally {
      setLoading(false);
    }
  }

  async function loadSession() {
    const response = await fetch("/api/auth/me", { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json();
    setUser(payload.user ?? null);
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadRadar();
      void loadSession();
    }, 0);
    const refresh = window.setInterval(() => void loadRadar(), 30000);
    const countdown = window.setInterval(() => {
      setSecondsToRefresh((current) => (current <= 1 ? 30 : current - 1));
    }, 1000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(refresh);
      window.clearInterval(countdown);
    };
  }, []);

  const selected = data.assets.find((asset) => asset.id === selectedId) ?? data.assets[0];
  const grouped = useMemo(
    () =>
      regionOrder.map((region) => ({
        region,
        assets: data.assets.filter((asset) => asset.region === region),
      })),
    [data.assets]
  );
  const currencyStrength = useMemo(() => buildCurrencyStrength(data.assets), [data.assets]);
  const scenario = selected ? buildScenario(selected, data) : null;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <main className="brand-shell min-h-screen text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-[#223019] bg-[#070a08]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-3 px-4 py-3 md:px-8 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/frogman-logo.png"
              alt="Frogman Trader"
              width={56}
              height={56}
              priority
              className="h-11 w-11 rounded border border-[#7ddc12]/35 object-cover shadow-[0_0_24px_rgba(125,220,18,0.16)]"
            />
            <div>
              <p className="brand-wordmark text-sm font-black uppercase tracking-[0.18em]">Frogman Trader</p>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#7ddc12]">Global Market Radar</p>
            </div>
          </div>

          <nav className="flex rounded border border-[#2b3a1d] bg-black/30 p-1 text-xs font-black uppercase tracking-[0.12em]">
            <Link href="/" className="rounded px-4 py-2 text-zinc-400 transition hover:text-white">B3 / WIN</Link>
            <Link href="/internacional" className="rounded bg-[#7ddc12] px-4 py-2 text-black">Internacional</Link>
            <Link href="/controle-trade" className="rounded px-4 py-2 text-zinc-400 transition hover:text-white">Controle</Link>
          </nav>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {user && <HeaderPill label={user.role === "admin" ? "Admin" : "Usuário"} value={user.name} />}
            <HeaderPill label="Feed" value={`${data.meta.online} online · ${data.meta.delayed} fechados/atrasados`} />
            <HeaderPill label="Atualização" value={loading ? "Carregando" : `${secondsToRefresh}s`} />
            <button
              type="button"
              onClick={() => void loadRadar()}
              className="rounded border border-[#7ddc12]/40 px-3 py-2 font-black uppercase tracking-[0.12em] text-[#b9ff6a] hover:bg-[#7ddc12]/10"
            >
              Atualizar
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded border border-red-400/35 px-3 py-2 font-black uppercase tracking-[0.12em] text-red-200 hover:bg-red-400/10"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 py-5 md:px-8">
        {error && (
          <div className="mb-4 rounded border border-red-500/40 bg-red-950/30 p-4 text-sm text-red-200">
            {error} A última leitura válida permanece na tela.
          </div>
        )}

        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="brand-panel-strong rounded-lg border border-[#2b3a1d] p-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#7ddc12]">Frogman Global Pulse</p>
                <h1 className="mt-2 text-3xl font-black text-white md:text-4xl">Termômetro internacional</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">{data.pulse.summary || "Consolidando bolsas, dólar, juros, volatilidade e sessões globais."}</p>
              </div>
              <div className="min-w-52 rounded border border-[#2b3a1d] bg-black/35 p-4 text-right">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c6a64f]">Regime</p>
                <p className={`mt-2 text-2xl font-black ${scoreTone(data.pulse.score)}`}>{data.pulse.regime}</p>
                <p className={`mt-1 text-4xl font-black ${scoreTone(data.pulse.score)}`}>{signed(data.pulse.score)}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <PulseGauge label="Apetite ao risco" value={data.pulse.risk} format="signed" />
              <PulseGauge label="Força do dólar" value={data.pulse.dollar} format="signed" invert />
              <PulseGauge label="Volatilidade" value={data.pulse.volatility} format="percent" invert />
              <RateGauge rate={data.pulse.rates} changeBps={data.pulse.ratesChangeBps ?? 0} />
            </div>
          </div>

          <div className="brand-panel rounded-lg border border-[#223019] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#7ddc12]">Sessões</p>
                <h2 className="mt-1 text-2xl font-black text-white">Relógio de liquidez</h2>
              </div>
              <span className="rounded border border-zinc-700 px-2 py-1 text-[10px] font-bold uppercase text-zinc-400">horário local</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {data.sessions.map((session) => (
                <div key={session.id} className={`rounded border p-3 ${session.open ? "border-[#7ddc12]/45 bg-[#7ddc12]/10" : "border-zinc-800 bg-black/25"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-black text-white">{session.name}</p>
                    <span className={`h-2 w-2 rounded-full ${session.open ? "bg-[#7ddc12] shadow-[0_0_10px_#7ddc12]" : "bg-zinc-600"}`} />
                  </div>
                  <p className="mt-1 text-xl font-black text-zinc-200">{session.localTime}</p>
                  <p className={`text-[10px] font-black uppercase ${session.open ? "text-[#b9ff6a]" : "text-zinc-500"}`}>{session.status}</p>
                  <p className="mt-1 text-[10px] text-zinc-500">{session.note}</p>
                </div>
              ))}
              <div className="rounded border border-orange-400/30 bg-orange-400/10 p-3">
                <div className="flex items-center justify-between"><p className="font-black text-white">Cripto</p><span className="h-2 w-2 rounded-full bg-orange-300 shadow-[0_0_10px_#fdba74]" /></div>
                <p className="mt-1 text-xl font-black text-zinc-200">24/7</p>
                <p className="text-[10px] font-black uppercase text-orange-200">ABERTA</p>
                <p className="mt-1 text-[10px] text-zinc-500">BTC · ETH · SOL · XRP</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            {grouped.map(({ region, assets }) => (
              <section key={region} className="brand-panel rounded-lg border border-[#223019] p-4">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className={`text-xs font-black uppercase tracking-[0.18em] ${regionMeta[region].accent}`}>{regionMeta[region].title}</p>
                    <p className="mt-1 text-xs text-zinc-500">{regionMeta[region].subtitle}</p>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600">clique para abrir a leitura</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {assets.map((asset) => (
                    <AssetCard key={asset.id} asset={asset} selected={asset.id === selected?.id} onSelect={() => setSelectedId(asset.id)} />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <section className="brand-panel-strong rounded-lg border border-[#2b3a1d] p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#7ddc12]">Ativo selecionado</p>
              {selected && scenario ? (
                <>
                  <div className="mt-2 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-3xl font-black text-white">{selected.name}</h2>
                      <p className="mt-1 text-xs text-zinc-500">{selected.description}</p>
                    </div>
                    <QualityDot quality={selected.quality} />
                  </div>
                  <p className="mt-5 text-4xl font-black text-white">{formatPrice(selected)}</p>
                  <p className={`mt-1 text-lg font-black ${changeTone(selected.changePercent)}`}>{signed(selected.changePercent, 2)}%</p>

                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <MiniMetric label="Momentum 60m" value={`${signed(selected.momentum60m, 2)}%`} tone={selected.momentum60m} />
                    <MiniMetric label="ATR intraday" value={`${selected.atrPercent.toFixed(2)}%`} tone={0} />
                    <MiniMetric label="Máxima" value={formatNumber(selected.dayHigh, selected.precision)} tone={1} />
                    <MiniMetric label="Mínima" value={formatNumber(selected.dayLow, selected.precision)} tone={-1} />
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between text-[10px] font-bold uppercase text-zinc-500"><span>Mínima</span><span>Posição no range {Math.round(selected.rangePosition)}%</span><span>Máxima</span></div>
                    <div className="mt-2 h-2 overflow-hidden rounded bg-zinc-800"><div className="h-full rounded bg-gradient-to-r from-red-500 via-amber-300 to-[#7ddc12]" style={{ width: `${Math.max(3, Math.min(100, selected.rangePosition))}%` }} /></div>
                  </div>

                  <div className={`mt-5 rounded border p-4 ${scenario.tone === "positive" ? "border-[#7ddc12]/35 bg-[#7ddc12]/10" : scenario.tone === "negative" ? "border-red-400/35 bg-red-500/10" : "border-amber-300/30 bg-amber-300/10"}`}>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c6a64f]">Cenário Frogman</p>
                    <p className={`mt-2 text-xl font-black ${scenario.tone === "positive" ? "text-[#b9ff6a]" : scenario.tone === "negative" ? "text-red-300" : "text-amber-200"}`}>{scenario.label}</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-300">{scenario.detail}</p>
                    <p className="mt-3 border-t border-white/10 pt-3 text-xs leading-5 text-zinc-400">{scenario.invalidation}</p>
                  </div>

                  <div className="mt-4 space-y-1 text-[10px] text-zinc-500">
                    <p>Mercado: {selected.marketState}</p>
                    <p>Dado: {selected.marketTime}</p>
                    <p>Fonte: {selected.source}</p>
                  </div>
                </>
              ) : (
                <p className="mt-4 text-sm text-zinc-500">Carregando ativo...</p>
              )}
            </section>

            <section className="brand-panel rounded-lg border border-[#223019] p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#7ddc12]">Força das moedas</p>
              <h2 className="mt-1 text-xl font-black text-white">Currency Matrix</h2>
              <div className="mt-4 space-y-3">
                {currencyStrength.map((currency) => (
                  <div key={currency.code}>
                    <div className="flex items-center justify-between text-xs"><span className="font-black text-zinc-200">{currency.code}</span><span className={`font-black ${changeTone(currency.value)}`}>{signed(currency.value, 2)}</span></div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded bg-zinc-800"><div className={`h-full rounded ${currency.value >= 0 ? "bg-[#7ddc12]" : "bg-red-500"}`} style={{ width: `${Math.min(100, Math.max(4, Math.abs(currency.value) * 45))}%` }} /></div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <section className="brand-panel rounded-lg border border-[#223019] p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#7ddc12]">Confluências</p>
            <h2 className="mt-1 text-2xl font-black text-white">Confirmações e divergências</h2>
            <div className="mt-4 space-y-3">
              {data.insights.map((insight) => (
                <div key={insight.title} className="rounded border border-zinc-800 bg-black/25 p-4">
                  <div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${insight.tone === "positive" ? "bg-[#7ddc12]" : insight.tone === "negative" ? "bg-red-400" : "bg-amber-300"}`} /><p className="font-black text-white">{insight.title}</p></div>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{insight.detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="brand-panel rounded-lg border border-[#223019] p-5">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#7ddc12]">Risco de evento</p><h2 className="mt-1 text-2xl font-black text-white">Agenda macro</h2></div>
              <span className="rounded border border-zinc-700 px-2 py-1 text-[10px] font-bold uppercase text-zinc-400">próximas 36h</span>
            </div>
            <div className="mt-4 max-h-[420px] space-y-2 overflow-auto pr-1">
              {data.events.length ? data.events.map((event) => (
                <div key={`${event.timestamp}-${event.title}`} className="grid grid-cols-[72px_1fr] gap-3 rounded border border-zinc-800 bg-black/25 p-3">
                  <div><p className="text-xs font-black text-[#c6a64f]">{event.time}</p><p className="mt-1 text-[10px] font-black text-zinc-500">{event.currency}</p></div>
                  <div><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-zinc-100">{event.title}</p><span className={`rounded px-1.5 py-0.5 text-[9px] font-black ${event.impact === "HIGH" ? "bg-red-500/20 text-red-300" : "bg-amber-300/15 text-amber-200"}`}>{event.impact}</span></div><p className="mt-1 text-xs text-zinc-500">Previsto {event.forecast} · Anterior {event.previous}</p></div>
                </div>
              )) : <p className="rounded border border-zinc-800 p-4 text-sm text-zinc-500">Nenhum evento de impacto médio ou alto localizado para a janela atual.</p>}
            </div>
          </section>
        </section>

        <footer className="mt-4 rounded-lg border border-[#223019] bg-black/25 p-4 text-xs leading-5 text-zinc-500">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <p><strong className="text-zinc-300">Dados:</strong> {data.meta.source || "carregando"} · consulta {data.meta.updatedAt}</p>
            <p>{data.meta.disclaimer || "Cotações indicativas. Confirme a execução na corretora."}</p>
          </div>
        </footer>
      </div>
    </main>
  );
}

function HeaderPill({ label, value }: { label: string; value: string }) {
  return <div className="rounded border border-[#2b3a1d] bg-black/25 px-3 py-2"><span className="font-bold uppercase text-zinc-500">{label}: </span><span className="font-black text-zinc-200">{value}</span></div>;
}

function PulseGauge({ label, value, format, invert = false }: { label: string; value: number; format: "signed" | "percent" | "change"; invert?: boolean }) {
  const normalized = format === "percent" ? value - 50 : value;
  const tone = invert ? -normalized : normalized;
  const display = format === "percent" ? `${Math.round(value)}%` : format === "change" ? `${signed(value, 2)}%` : signed(Math.round(value));
  return (
    <div className="rounded border border-zinc-800 bg-black/25 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500">{label}</p>
      <p className={`mt-2 text-2xl font-black ${changeTone(tone)}`}>{display}</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded bg-zinc-800"><div className={`h-full rounded ${tone >= 0 ? "bg-[#7ddc12]" : "bg-red-500"}`} style={{ width: `${Math.min(100, Math.max(5, Math.abs(normalized)))}%` }} /></div>
    </div>
  );
}

function RateGauge({ rate, changeBps }: { rate: number; changeBps: number }) {
  return (
    <div className="rounded border border-zinc-800 bg-black/25 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500">Treasury 10Y</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="text-2xl font-black text-zinc-100">{rate ? `${rate.toFixed(3)}%` : "--"}</p>
        <p className={`text-xs font-black ${changeTone(-changeBps)}`}>{signed(changeBps, 1)} bps</p>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded bg-zinc-800"><div className={`h-full rounded ${changeBps <= 0 ? "bg-[#7ddc12]" : "bg-red-500"}`} style={{ width: `${Math.min(100, Math.max(5, Math.abs(changeBps) * 4))}%` }} /></div>
    </div>
  );
}

function AssetCard({ asset, selected, onSelect }: { asset: Asset; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} className={`rounded border p-3 text-left transition ${selected ? "border-[#7ddc12] bg-[#7ddc12]/10 shadow-[0_0_18px_rgba(125,220,18,0.08)]" : "border-zinc-800 bg-black/25 hover:border-zinc-600"}`}>
      <div className="flex items-center justify-between gap-2"><p className="font-black text-white">{asset.name}</p><QualityDot quality={asset.quality} compact /></div>
      <p className="mt-1 truncate text-[10px] text-zinc-500">{asset.description}</p>
      <div className="mt-3 flex items-end justify-between gap-2"><p className="text-lg font-black text-zinc-100">{formatPrice(asset)}</p><p className={`text-sm font-black ${changeTone(asset.changePercent)}`}>{signed(asset.changePercent, 2)}%</p></div>
      <div className="mt-2 h-1 overflow-hidden rounded bg-zinc-800"><div className={`h-full rounded ${asset.changePercent >= 0 ? "bg-[#7ddc12]" : "bg-red-500"}`} style={{ width: `${Math.min(100, Math.max(4, asset.rangePosition))}%` }} /></div>
    </button>
  );
}

function QualityDot({ quality, compact = false }: { quality: Asset["quality"]; compact?: boolean }) {
  const label = quality === "online" ? "online" : quality === "delayed" ? "fechado/atrasado" : "offline";
  return <span className={`inline-flex items-center gap-1.5 ${compact ? "text-[9px]" : "text-[10px]"} font-black uppercase text-zinc-500`}><span className={`h-2 w-2 rounded-full ${quality === "online" ? "bg-[#7ddc12]" : quality === "delayed" ? "bg-amber-300" : "bg-red-500"}`} />{compact ? "" : label}</span>;
}

function MiniMetric({ label, value, tone }: { label: string; value: string; tone: number }) {
  return <div className="rounded border border-zinc-800 bg-black/25 p-3"><p className="text-[9px] font-black uppercase tracking-[0.12em] text-zinc-500">{label}</p><p className={`mt-1 text-sm font-black ${tone === 0 ? "text-zinc-200" : changeTone(tone)}`}>{value}</p></div>;
}

function buildCurrencyStrength(assets: Asset[]) {
  const value = (id: string) => assets.find((asset) => asset.id === id)?.changePercent ?? 0;
  return [
    { code: "USD", value: (value("dxy") - value("eurusd") - value("gbpusd") - value("audusd") + value("usdjpy") + value("usdcad") + value("usdcnh")) / 7 },
    { code: "EUR", value: (value("eurusd") + value("eurgbp")) / 2 },
    { code: "GBP", value: (value("gbpusd") + value("gbpjpy") - value("eurgbp")) / 3 },
    { code: "JPY", value: (-value("usdjpy") - value("gbpjpy")) / 2 },
    { code: "AUD", value: value("audusd") },
    { code: "CAD", value: -value("usdcad") },
    { code: "CNH", value: -value("usdcnh") },
  ].sort((a, b) => b.value - a.value);
}

function buildScenario(asset: Asset, data: RadarData) {
  const directional = asset.changePercent * 0.55 + asset.momentum60m * 0.45;
  const globalSupport = data.pulse.risk / 100;
  const riskSensitive = ["nas100", "us500", "us30", "btcusd", "ethusd", "solusd", "xrpusd"].includes(asset.id);
  const adjusted = directional + (riskSensitive ? globalSupport * 0.35 : 0);
  const label = adjusted > 0.18 ? "VIÉS COMPRADOR" : adjusted < -0.18 ? "VIÉS VENDEDOR" : "AGUARDAR CONFIRMAÇÃO";
  const tone = adjusted > 0.18 ? "positive" : adjusted < -0.18 ? "negative" : "neutral";
  const detail =
    tone === "positive"
      ? `Preço e momentum favorecem continuação compradora. Confirme sustentação acima da região atual e evite perseguir preço próximo da máxima diária.`
      : tone === "negative"
        ? `Pressão diária e momentum favorecem venda. Confirme rejeição ou perda de suporte antes de executar.`
        : `Leitura diária e fluxo de curto prazo não estão alinhados. Melhor cenário é esperar rompimento com reteste ou reação em nível importante.`;
  const midpoint = (asset.dayHigh + asset.dayLow) / 2;
  const invalidation =
    tone === "positive"
      ? `Invalidação contextual: retorno sustentado abaixo do meio do range (${formatNumber(midpoint, asset.precision)}).`
      : tone === "negative"
        ? `Invalidação contextual: recuperação sustentada acima do meio do range (${formatNumber(midpoint, asset.precision)}).`
        : `Zona de decisão: meio do range em ${formatNumber(midpoint, asset.precision)}. Observe também o próximo evento macro.`;
  return { label, tone, detail, invalidation } as const;
}

function formatPrice(asset: Asset) {
  if (!asset.price) return "--";
  return formatNumber(asset.price, asset.precision);
}

function formatNumber(value: number, precision: number) {
  if (!value) return "--";
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: precision, maximumFractionDigits: precision }).format(value);
}

function signed(value: number, precision = 0) {
  return `${value > 0 ? "+" : ""}${value.toFixed(precision)}`;
}

function changeTone(value: number) {
  return value > 0.03 ? "text-[#b9ff6a]" : value < -0.03 ? "text-red-300" : "text-amber-200";
}

function scoreTone(value: number) {
  return value >= 18 ? "text-[#b9ff6a]" : value <= -18 ? "text-red-300" : "text-amber-200";
}
