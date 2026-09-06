"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type MarketAssetKey =
  | "ewz"
  | "sp500"
  | "nasdaq"
  | "dxy"
  | "vix"
  | "brent"
  | "usdbrl"
  | "petr4"
  | "vale3"
  | "itub4"
  | "bbdc4"
  | "bbas3"
  | "di"
  | "win";

type MarketData = {
  ewz: number;
  sp500: number;
  nasdaq: number;
  dxy: number;
  vix: number;
  brent: number;
  usdbrl: number;
  usdbrlPrice?: number;
  petr4: number;
  vale3: number;
  itub4: number;
  bbdc4: number;
  bbas3: number;
  di: number;
  diRate?: number;
  diFonte?: string;
  win: number;
  winFechamento: number;
  winAtual?: number;
  winFonte?: string;
  dadosEm?: string;
  atualizadoEm: string;
  assetTimes?: Partial<Record<MarketAssetKey, string>>;
};

type CalendarEvent = {
  hora: string;
  pais?: string;
  titulo: string;
  impacto: "ALTO" | "MEDIO" | "BAIXO" | string;
  previsto?: string;
  anterior?: string;
  categoria?: string;
  motivo?: string;
  relevancia?: number;
};

type NewsItem = {
  id: string;
  hora: string;
  titulo: string;
  impacto: "alto" | "medio" | "baixo" | string;
  categoria?: string;
  ticker?: string;
  fonte?: string;
  url?: string;
  publicadoEm?: string;
  resumo?: string;
  score?: number;
};

type NewsMeta = {
  atualizadoEm: string;
  live: boolean;
  total: number;
  fontes: string[];
  erros?: string[];
};

type AlertItem = {
  tipo: string;
  mensagem: string;
};

type UserSession = {
  name: string;
  email: string;
  role: "admin" | "user";
};

type DailyEntry = {
  id: string;
  createdAt: string;
  score: number;
  sentimento: string;
  confianca: string;
  gapPontos: number;
  aberturaProjetada: number;
  fechamentoBase: number;
  forcaAbertura: number;
  realOpen?: number;
};

type MarketReading = {
  forcaAbertura: number;
  score: number;
  fechamentoBase: number;
  gapPontos: number;
  aberturaProjetada: number;
  sentimento: string;
  confianca: string;
  vies: string;
};

type DriverItem = {
  label: string;
  value: number;
  text: string;
};

type TacticalBrief = {
  regime: string;
  detail: string;
  stance: string;
  riskLine: string;
  catalyst: string;
  watchlist: Array<{
    label: string;
    value: number;
    desc: string;
  }>;
};

type WinOperationalMap = {
  bias: string;
  headline: string;
  command: string;
  zones: Array<{
    label: string;
    value: string;
    detail: string;
    tone: number;
  }>;
  pressure: Array<{
    label: string;
    value: string;
    detail: string;
    tone: number;
  }>;
  triggers: string[];
  riskEvents: CalendarEvent[];
};

type PressureTape = {
  score: number;
  label: string;
  posture: string;
  summary: string;
  items: Array<{
    label: string;
    value: string;
    detail: string;
    tone: number;
  }>;
};

type FrogScoreBlock = {
  label: string;
  value: number;
  max: number;
  detail: string;
};

type ExecutionGuard = {
  headline: string;
  decisionZone: string;
  invalidation: string;
  command: string;
  support: number;
  resistance: number;
};

type PostOpenMode = {
  title: string;
  status: "Confirmado" | "Aguardando pullback" | "Perdeu leitura" | "Modo defesa" | "Pre-abertura";
  priceLine: string;
  zoneLine: string;
  pullbackLine: string;
  riskLine: string;
  tone: number;
};

type DefenseItem = {
  label: string;
  active: boolean;
  detail: string;
};

type AccuracyStats = {
  total: number;
  graded: number;
  accuracy: number;
  averageError: number;
  bestScenario: string;
  dayProfile: string;
};

type BlueChipSignal = {
  label: string;
  value: string;
  detail: string;
  aligned: boolean;
  tone: number;
};

type ScenarioPlan = {
  label: string;
  title: string;
  detail: string;
  tone: number;
};

const emptyMarketData: MarketData = {
  ewz: 0,
  sp500: 0,
  nasdaq: 0,
  dxy: 0,
  vix: 0,
  brent: 0,
  usdbrl: 0,
  usdbrlPrice: 0,
  petr4: 0,
  vale3: 0,
  itub4: 0,
  bbdc4: 0,
  bbas3: 0,
  di: 0,
  diRate: 0,
  diFonte: "",
  win: 0,
  winFechamento: 0,
  winAtual: 0,
  winFonte: "",
  dadosEm: "--",
  atualizadoEm: "--:--",
  assetTimes: {},
};

const marketLabels: Array<{
  key: MarketAssetKey;
  name: string;
  desc: string;
  weight: string;
  unit?: "percent" | "bps";
}> = [
  { key: "ewz", name: "EWZ", desc: "Brasil lá fora", weight: "30%" },
  { key: "sp500", name: "S&P Futuro", desc: "Risco global", weight: "20%" },
  { key: "nasdaq", name: "Nasdaq", desc: "Apetite por tech", weight: "10%" },
  { key: "dxy", name: "DXY", desc: "Dólar global", weight: "-10%" },
  { key: "vix", name: "VIX", desc: "Volatilidade", weight: "-10%" },
  { key: "brent", name: "Petróleo Brent", desc: "BZ=F / energia", weight: "10%" },
  { key: "usdbrl", name: "USD/BRL", desc: "Câmbio local", weight: "pressão" },
  { key: "di", name: "DI", desc: "Juros futuros", weight: "pressão", unit: "bps" },
  { key: "petr4", name: "PETR4", desc: "Petrobras", weight: "5%" },
  { key: "vale3", name: "VALE3", desc: "Minério / China", weight: "5%" },
  { key: "itub4", name: "ITUB4", desc: "Bancos", weight: "apoio" },
  { key: "bbdc4", name: "BBDC4", desc: "Bancos", weight: "apoio" },
  { key: "bbas3", name: "BBAS3", desc: "Banco do Brasil", weight: "apoio" },
  { key: "win", name: "IBOV/WIN", desc: "Referência local", weight: "base" },
];

const currencyFormatter = new Intl.NumberFormat("pt-BR");

const brand = {
  name: "Frogman Trader",
  product: "Market Radar",
  unit: "Frogman Intelligence Desk",
  tagline: "Disciplina • Gestão • Consistência",
  session: "B3 • Pré-abertura • WIN",
};

const brandPillars = ["Disciplina", "Gestão", "Consistência"];

type DataQuality = {
  label: string;
  detail: string;
  tone: "success" | "warning" | "danger";
};

export default function Home() {
  const [marketData, setMarketData] = useState<MarketData>(emptyMarketData);
  const [calendar, setCalendar] = useState<CalendarEvent[]>([]);
  const [calendarMeta, setCalendarMeta] = useState({ fonte: "", atualizadoEm: "" });
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsMeta, setNewsMeta] = useState<NewsMeta>({
    atualizadoEm: "--",
    live: false,
    total: 0,
    fontes: [],
  });
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [winManual, setWinManual] = useState("");
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [dailyHistory, setDailyHistory] = useState<DailyEntry[]>([]);
  const [realOpenInput, setRealOpenInput] = useState("");
  const [dailyMessage, setDailyMessage] = useState("");
  const [socialMessage, setSocialMessage] = useState("");
  const [tradePlanMessage, setTradePlanMessage] = useState("");
  const [now, setNow] = useState(() => new Date());

  async function carregarDados() {
    try {
      setError("");
      const [marketRes, calendarRes, newsRes, alertsRes] = await Promise.all([
        fetch("/api/market", { cache: "no-store" }),
        fetch("/api/calendar", { cache: "no-store" }),
        fetch("/api/news", { cache: "no-store" }),
        fetch("/api/alerts", { cache: "no-store" }),
      ]);

      const market = await marketRes.json();
      const calendarData = await calendarRes.json();
      const newsData = await newsRes.json();
      const alertsData = await alertsRes.json();

      if (!marketRes.ok) {
        throw new Error(market.error || "Não foi possível carregar o mercado.");
      }

      setMarketData(market);
      setCalendar(calendarData.eventos ?? []);
      setCalendarMeta({
        fonte: calendarData.fonte ?? "",
        atualizadoEm: calendarData.atualizadoEm ?? "",
      });
      setNews(newsData.noticias ?? []);
      setNewsMeta({
        atualizadoEm: newsData.meta?.atualizadoEm ?? "--",
        live: Boolean(newsData.meta?.live),
        total: newsData.meta?.total ?? newsData.noticias?.length ?? 0,
        fontes: Array.isArray(newsData.meta?.fontes) ? newsData.meta.fontes : [],
        erros: Array.isArray(newsData.meta?.erros) ? newsData.meta.erros : [],
      });
      setAlerts(Array.isArray(alertsData) ? alertsData : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }

  async function carregarSessao() {
    const response = await fetch("/api/auth/me", { cache: "no-store" });

    if (!response.ok) {
      return;
    }

    const data = await response.json();
    setCurrentUser(data.user ?? null);
  }

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      setWinManual(window.localStorage.getItem("frogman.winManual") ?? "");
      setDailyHistory(JSON.parse(window.localStorage.getItem("frogman.dailyHistory") || "[]"));
      void carregarDados();
      void carregarSessao();
    }, 0);
    const timer = window.setInterval(carregarDados, 60000);

    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const clock = window.setInterval(() => setNow(new Date()), 60000);

    return () => window.clearInterval(clock);
  }, []);

  function handleWinManual(value: string) {
    const onlyNumbers = value.replace(/\D/g, "");

    setWinManual(onlyNumbers);
    window.localStorage.setItem("frogman.winManual", onlyNumbers);
  }

  const leitura = useMemo(() => {
    const jurosPressure = normalizeDiPressure(marketData.di);
    const forcaAbertura =
      marketData.ewz * 0.3 +
      marketData.sp500 * 0.2 +
      marketData.nasdaq * 0.1 -
      marketData.dxy * 0.1 -
      marketData.vix * 0.1 +
      marketData.brent * 0.1 +
      marketData.usdbrl * -0.14 +
      jurosPressure * -0.18 +
      marketData.petr4 * 0.05 +
      marketData.vale3 * 0.05 +
      marketData.bbas3 * 0.03;

    const forcaNormalizada = Math.max(-2, Math.min(2, forcaAbertura));
    const score = Math.max(5, Math.min(95, Math.round(50 + forcaNormalizada * 22)));
    const fechamentoBase = Number(winManual) || marketData.winFechamento;
    const gapPontos = Math.round((fechamentoBase * forcaAbertura) / 100);
    const aberturaProjetada = fechamentoBase + gapPontos;
    const sentimento =
      score >= 70 ? "Comprador" : score <= 40 ? "Vendedor" : "Misto";
    const confianca =
      score >= 80 || score <= 20
        ? "Alta"
        : score >= 65 || score <= 35
          ? "Média"
        : "Baixa";
    const vies =
      gapPontos > 350
        ? "Abertura forte para cima"
        : gapPontos < -350
          ? "Abertura forte para baixo"
          : "Abertura perto do neutro";

    return {
      forcaAbertura,
      score,
      fechamentoBase,
      gapPontos,
      aberturaProjetada,
      sentimento,
      confianca,
      vies,
    };
  }, [marketData, winManual]);

  const drivers: DriverItem[] = useMemo(
    () => [
      {
        label: "Fluxo externo",
        value: marketData.ewz + marketData.sp500 + marketData.nasdaq,
        text:
          marketData.ewz > 0 && marketData.sp500 > 0
            ? "Brasil e EUA ajudam o índice."
            : marketData.ewz < 0 && marketData.sp500 < 0
              ? "Exterior pesa contra a abertura."
              : "Exterior misto, sinal exige confirmação.",
      },
      {
        label: "Câmbio, juros e medo",
        value:
          -(marketData.dxy + marketData.vix) -
          marketData.usdbrl * 0.75 -
          normalizeDiPressure(marketData.di),
        text:
          marketData.usdbrl < 0 && marketData.di <= 0 && marketData.vix <= 0
            ? "Câmbio, juros e volatilidade aliviam o WIN."
            : marketData.usdbrl > 0 || marketData.di > 0 || marketData.vix > 0
              ? "Dólar, DI ou VIX pedem cautela no índice."
              : "Sem pressão clara de câmbio, juros ou medo.",
      },
      {
        label: "Pesos do IBOV",
        value:
          marketData.petr4 +
          marketData.vale3 +
          marketData.itub4 +
          marketData.bbdc4 +
          marketData.bbas3,
        text:
          marketData.petr4 +
            marketData.vale3 +
            marketData.itub4 +
            marketData.bbdc4 +
            marketData.bbas3 >
          0
            ? "Blue chips reforçam a leitura."
            : "Blue chips ainda não confirmam o movimento.",
      },
    ],
    [marketData]
  );

  const tacticalBrief = useMemo(
    () => buildTacticalBrief(leitura, drivers, marketData, calendar),
    [calendar, drivers, leitura, marketData]
  );
  const winMap = useMemo(
    () => buildWinOperationalMap(leitura, drivers, marketData, calendar),
    [calendar, drivers, leitura, marketData]
  );
  const pressureTape = useMemo(
    () => buildPressureTape(marketData, leitura.score),
    [marketData, leitura.score]
  );

  const dataQuality = getDataQuality(marketData.winFonte, error);
  const frogScoreBlocks = useMemo(
    () => buildFrogScoreBlocks(marketData, calendar, dataQuality),
    [calendar, dataQuality, marketData]
  );
  const executionGuard = useMemo(() => buildExecutionGuard(leitura), [leitura]);
  const postOpenMode = useMemo(
    () => buildPostOpenMode(leitura, marketData, dataQuality, now),
    [dataQuality, leitura, marketData, now]
  );
  const defenseItems = useMemo(
    () => buildDefenseChecklist(leitura, marketData, calendar, dataQuality, postOpenMode),
    [calendar, dataQuality, leitura, marketData, postOpenMode]
  );
  const accuracyStats = useMemo(() => buildAccuracyStats(dailyHistory), [dailyHistory]);
  const blueChipSignals = useMemo(
    () => buildBlueChipSignals(leitura, marketData),
    [leitura, marketData]
  );
  const scenarioMap = useMemo(
    () => buildScenarioMap(leitura, executionGuard, marketData),
    [executionGuard, leitura, marketData]
  );
  const tradePlan = useMemo(
    () => buildTradePlan(leitura, executionGuard, postOpenMode, defenseItems, calendar),
    [calendar, defenseItems, executionGuard, leitura, postOpenMode]
  );
  const lastDailyEntry = dailyHistory[0];
  const realOpen = Number(realOpenInput);
  const projectionDelta =
    realOpen > 0 ? Math.round(realOpen - leitura.aberturaProjetada) : undefined;
  const dailyReport = useMemo(
    () =>
      [
        "FROGMAN MARKET RADAR",
        `Sinal: ${leitura.sentimento} (${leitura.score}%)`,
        `Confiança: ${leitura.confianca}`,
        `Viés: ${leitura.vies}`,
        `Gap projetado: ${leitura.gapPontos > 0 ? "+" : ""}${currencyFormatter.format(leitura.gapPontos)} pts`,
        `Abertura projetada: ${currencyFormatter.format(leitura.aberturaProjetada)}`,
        `Invalidacao: ${executionGuard.invalidation}`,
        `Status: ${postOpenMode.status}`,
        executionGuard.headline,
        `Zona de decisao: ${executionGuard.decisionZone}`,
        executionGuard.invalidation,
        `Base: ${currencyFormatter.format(leitura.fechamentoBase)}`,
        `Força: ${formatPercent(leitura.forcaAbertura)}`,
        `Dados: ${marketData.dadosEm || "--"} | Consulta: ${marketData.atualizadoEm}`,
        "Não constitui recomendação de investimento.",
      ].join("\n"),
    [executionGuard, leitura, marketData, postOpenMode.status]
  );
  const instagramCaption = useMemo(
    () =>
      [
        "FROGMAN MARKET RADAR",
        "",
        `Pré-abertura WIN: ${leitura.sentimento}`,
        `Score: ${leitura.score}% | Confiança: ${leitura.confianca}`,
        `Viés: ${leitura.vies}`,
        `Gap projetado: ${leitura.gapPontos > 0 ? "+" : ""}${currencyFormatter.format(leitura.gapPontos)} pts`,
        `Abertura projetada: ${currencyFormatter.format(leitura.aberturaProjetada)}`,
        `Invalidacao: ${executionGuard.invalidation}`,
        `Status: ${postOpenMode.status}`,
        "",
        "Principais drivers:",
        ...drivers.map(
          (driver) =>
            `${driver.value > 0 ? "+" : ""}${driver.value.toFixed(2)} | ${driver.label}: ${driver.text}`
        ),
        "",
        "Disciplina • Gestão • Consistência",
        "",
        "Não constitui recomendação de investimento.",
      ].join("\n"),
    [drivers, executionGuard, leitura, postOpenMode.status]
  );

  function persistDailyHistory(entries: DailyEntry[]) {
    setDailyHistory(entries);
    window.localStorage.setItem("frogman.dailyHistory", JSON.stringify(entries));
  }

  function handleSaveDaily() {
    const entry: DailyEntry = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      score: leitura.score,
      sentimento: leitura.sentimento,
      confianca: leitura.confianca,
      gapPontos: leitura.gapPontos,
      aberturaProjetada: leitura.aberturaProjetada,
      fechamentoBase: leitura.fechamentoBase,
      forcaAbertura: leitura.forcaAbertura,
      realOpen: realOpen > 0 ? realOpen : undefined,
    };

    persistDailyHistory([entry, ...dailyHistory].slice(0, 30));
    setDailyMessage("Leitura salva no histórico local da mesa.");
  }

  async function handleCopyReport() {
    await navigator.clipboard.writeText(dailyReport);
    setDailyMessage("Relatório copiado para a área de transferência.");
  }

  async function handleCopyInstagramCaption() {
    await navigator.clipboard.writeText(instagramCaption);
    setSocialMessage("Legenda do Instagram copiada.");
  }

  async function handleCopyTradePlan() {
    await navigator.clipboard.writeText(tradePlan);
    setTradePlanMessage("Plano de trade copiado para a area de transferencia.");
  }

  async function handleDownloadInstagramPost() {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      setSocialMessage("Não foi possível gerar a arte neste navegador.");
      return;
    }

    await drawInstagramPost(ctx, {
      leitura,
      drivers,
      marketData,
      dataQuality,
    });

    canvas.toBlob((blob) => {
      if (!blob) {
        setSocialMessage("Não foi possível gerar o arquivo PNG.");
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `frogman-market-radar-${new Date().toISOString().slice(0, 10)}.png`;
      link.click();
      URL.revokeObjectURL(url);
      setSocialMessage("Arte 1080x1350 baixada em PNG.");
    }, "image/png");
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <main className="brand-shell min-h-screen text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-[#223019] bg-[#070a08]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-8 lg:px-10">
          <BrandLockup compact />

          <nav className="flex rounded border border-[#2b3a1d] bg-black/30 p-1 text-xs font-black uppercase tracking-[0.12em]">
            <Link href="/" className="rounded bg-[#7ddc12] px-4 py-2 text-black">
              B3 / WIN
            </Link>
            <Link
              href="/internacional"
              className="rounded px-4 py-2 text-zinc-400 transition hover:text-white"
            >
              Internacional
            </Link>
            <Link
              href="/controle-trade"
              className="rounded px-4 py-2 text-zinc-400 transition hover:text-white"
            >
              Controle
            </Link>
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            {currentUser && (
              <StatusPill
                label={currentUser.role === "admin" ? "Admin" : "Usuário"}
                value={currentUser.name}
              />
            )}
            <StatusPill label="Mercado" value={marketData.dadosEm || "--"} />
            <StatusPill label="Consulta" value={loading ? "Carregando" : marketData.atualizadoEm} />
            <DataQualityBadge quality={dataQuality} />
            {currentUser?.role === "admin" && (
              <a
                href="/admin"
                className="rounded border border-[#2b3a1d] px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#c6a64f] transition hover:border-[#7ddc12] hover:text-[#b9ff6a]"
              >
                Admin
              </a>
            )}
            <button
              type="button"
              onClick={carregarDados}
              className="rounded border border-zinc-700 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-200 transition hover:border-emerald-400 hover:text-emerald-200"
            >
              Atualizar
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded border border-red-400/35 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-red-200 transition hover:bg-red-400/10"
            >
              Sair
            </button>
          </div>
        </div>
        <div className="brand-rule h-px opacity-80" />
      </header>

      <section className="border-b border-[#223019]">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 md:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:px-10">
          <section className="brand-panel-strong rounded-lg border border-[#2b3a1d] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <BrandEyebrow text="Frogman Signal" />
                <h1 className="brand-wordmark mt-2 text-2xl font-black text-white md:text-3xl">
                  Leitura institucional da abertura
                </h1>
                <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-[#c6a64f]">
                  {brand.session}
                </p>
              </div>
              <SignalBadge signal={leitura.sentimento} />
            </div>

            <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className={`text-6xl font-black leading-none md:text-7xl ${toneClass(leitura.score - 50)}`}>
                  {leitura.score}%
                </p>
                <p className="mt-2 text-sm font-semibold text-zinc-400">
                  Score de direção · Confiança {leitura.confianca.toLowerCase()}
                </p>
              </div>
              <div className="min-w-[180px] rounded border border-zinc-800 bg-black/30 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
                  Gap projetado
                </p>
                <p className={`mt-2 text-3xl font-black ${toneClass(leitura.gapPontos)}`}>
                  {leitura.gapPontos > 0 ? "+" : ""}
                  {currencyFormatter.format(leitura.gapPontos)} pts
                </p>
              </div>
            </div>

            <div className="mt-5 h-2 rounded bg-zinc-800">
              <div
                className={`h-2 rounded ${barClass(leitura.score - 50)}`}
                style={{ width: `${leitura.score}%` }}
              />
            </div>
            <p className="mt-4 text-lg font-bold text-white">{leitura.vies}</p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Força calculada de{" "}
              <strong className="text-zinc-100">{formatPercent(leitura.forcaAbertura)}</strong>
              , usando exterior, câmbio, juros, volatilidade, commodities e pesos do IBOV.
            </p>
            <ExecutionGuardPanel guard={executionGuard} />
            <FrogScorePanel score={leitura.score} blocks={frogScoreBlocks} />
            <TacticalPulse brief={tacticalBrief} />
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <PostOpenPanel mode={postOpenMode} />
            <TradePlanPanel
              message={tradePlanMessage}
              plan={tradePlan}
              onCopyTradePlan={handleCopyTradePlan}
            />
            <BigCard
              label="Abertura projetada"
              value={currencyFormatter.format(leitura.aberturaProjetada)}
              detail={`Base usada: ${currencyFormatter.format(leitura.fechamentoBase)}`}
              tone={0}
            />
            <div className="brand-panel rounded-lg border border-[#223019] p-5">
              <label className="text-sm font-semibold text-zinc-400" htmlFor="winManual">
                Fechamento WIN manual
              </label>
              <input
                id="winManual"
                inputMode="numeric"
                value={winManual}
                onChange={(event) => handleWinManual(event.target.value)}
                placeholder="Ex: 172610"
                className="mt-3 w-full rounded border border-zinc-700 bg-black/50 px-4 py-3 text-lg font-bold text-white outline-none transition focus:border-emerald-300"
              />
              <p className="mt-3 text-xs leading-5 text-zinc-500">
                Automático: atual {currencyFormatter.format(marketData.winAtual || 0)} · fechamento{" "}
                {currencyFormatter.format(marketData.winFechamento)}
              </p>
            </div>
            <TacticalBriefPanel brief={tacticalBrief} />
            <SourcePanel source={marketData.winFonte || "Yahoo Finance"} quality={dataQuality} />
            <PressureTapePanel tape={pressureTape} />
          </section>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-5 md:px-8 lg:px-10">
        <BrandIdentityStrip />

        <DailyDeskPanel
          dailyReport={dailyReport}
          dailyHistory={dailyHistory}
          dailyMessage={dailyMessage}
          drivers={drivers}
          instagramCaption={instagramCaption}
          lastDailyEntry={lastDailyEntry}
          projectionDelta={projectionDelta}
          realOpenInput={realOpenInput}
          socialMessage={socialMessage}
          setRealOpenInput={setRealOpenInput}
          onCopyInstagramCaption={handleCopyInstagramCaption}
          onCopyReport={handleCopyReport}
          onDownloadInstagramPost={handleDownloadInstagramPost}
          onSaveDaily={handleSaveDaily}
          leitura={leitura}
          marketData={marketData}
          accuracyStats={accuracyStats}
        />

        <div className="mt-4 grid gap-4 lg:grid-cols-[0.85fr_0.85fr_1.3fr]">
          <DefensePanel items={defenseItems} />
          <BlueChipRuler signals={blueChipSignals} />
          <ScenarioMapPanel scenarios={scenarioMap} />
        </div>

        {error && (
          <div className="mb-5 mt-4 rounded-lg border border-red-400/40 bg-red-950/30 p-4 text-sm text-red-100">
            {error}
          </div>
        )}

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <section className="brand-panel rounded-lg border border-[#223019] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <BrandEyebrow text="Radar de mercado" />
                <h2 className="mt-1 text-2xl font-black text-white">Drivers da abertura</h2>
              </div>
              <button
                type="button"
                onClick={carregarDados}
                className="rounded border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-200 transition hover:border-emerald-400 hover:text-emerald-200"
              >
                Atualizar
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {marketLabels.map((item) => (
                <MarketCard
                  key={item.key}
                  name={item.name}
                  desc={item.desc}
                  value={marketData[item.key]}
                  weight={item.weight}
                  unit={item.unit}
                  updatedAt={marketData.assetTimes?.[item.key]}
                />
              ))}
            </div>
          </section>

          <section className="brand-panel rounded-lg border border-[#223019] p-5">
            <BrandEyebrow text="Leitura institucional" />
            <h2 className="mt-1 text-2xl font-black text-white">Confluência</h2>

            <div className="mt-5 space-y-3">
              {drivers.map((driver) => (
                <div key={driver.label} className="border-b border-zinc-800 pb-3 last:border-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-zinc-100">{driver.label}</p>
                    <span className={`text-sm font-black ${toneClass(driver.value)}`}>
                      {driver.value > 0 ? "+" : ""}
                      {driver.value.toFixed(2)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-5 text-zinc-400">{driver.text}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <InfoPanel title="Alertas do dia">
            {alerts.length > 0 ? (
              alerts.map((alert) => (
                <TimelineItem
                  key={`${alert.tipo}-${alert.mensagem}`}
                  meta={alert.tipo}
                  text={alert.mensagem}
                  tone={alert.tipo === "ALTO" ? "danger" : "neutral"}
                />
              ))
            ) : (
              <EmptyState text="Nenhum alerta crítico carregado." />
            )}
          </InfoPanel>

          <WinMapPanel
            map={winMap}
            caption={
              calendarMeta.fonte
                ? `Risco: ${calendarMeta.fonte} · ${calendarMeta.atualizadoEm}`
                : undefined
            }
          />

          <NewsRadarPanel news={news} meta={newsMeta} />
        </div>

        <footer className="mt-5 rounded-lg border border-[#223019] bg-black/25 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <BrandLockup compact />
            <p className="max-w-2xl text-xs leading-5 text-zinc-500">
              Radar proprietário para leitura de contexto. Não constitui recomendação de investimento.
              Decisão, execução e gestão de risco permanecem sob responsabilidade do operador.
            </p>
          </div>
        </footer>
      </section>
    </main>
  );
}

function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/frogman-logo.png"
        alt={brand.name}
        width={compact ? 56 : 88}
        height={compact ? 56 : 88}
        priority
        className={`${compact ? "h-11 w-11" : "h-16 w-16"} rounded border border-[#7ddc12]/35 object-cover shadow-[0_0_24px_rgba(125,220,18,0.16)]`}
      />
      <div>
        <p className="brand-wordmark text-sm font-black uppercase tracking-[0.18em]">
          {brand.name}
        </p>
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#7ddc12]">
          {brand.product}
        </p>
        {!compact && (
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c6a64f]">
            {brand.tagline}
          </p>
        )}
      </div>
    </div>
  );
}

function BrandEyebrow({ text }: { text: string }) {
  return (
    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#7ddc12]">
      {text}
    </p>
  );
}

function BrandIdentityStrip() {
  return (
    <section className="brand-panel rounded-lg border border-[#223019] p-4">
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <BrandLockup />
        <div className="grid gap-3 sm:grid-cols-3">
          {brandPillars.map((pillar) => (
            <div key={pillar} className="rounded border border-[#2b3a1d] bg-black/25 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#c6a64f]">
                Pilar Frogman
              </p>
              <p className="mt-1 text-sm font-black text-zinc-100">{pillar}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DailyDeskPanel({
  accuracyStats,
  dailyReport,
  dailyHistory,
  dailyMessage,
  drivers,
  instagramCaption,
  lastDailyEntry,
  leitura,
  marketData,
  projectionDelta,
  realOpenInput,
  socialMessage,
  setRealOpenInput,
  onCopyInstagramCaption,
  onCopyReport,
  onDownloadInstagramPost,
  onSaveDaily,
}: {
  accuracyStats: AccuracyStats;
  dailyReport: string;
  dailyHistory: DailyEntry[];
  dailyMessage: string;
  drivers: DriverItem[];
  instagramCaption: string;
  lastDailyEntry?: DailyEntry;
  leitura: {
    forcaAbertura: number;
    score: number;
    fechamentoBase: number;
    gapPontos: number;
    aberturaProjetada: number;
    sentimento: string;
    confianca: string;
    vies: string;
  };
  marketData: MarketData;
  projectionDelta?: number;
  realOpenInput: string;
  socialMessage: string;
  setRealOpenInput: (value: string) => void;
  onCopyInstagramCaption: () => void;
  onCopyReport: () => void;
  onDownloadInstagramPost: () => void;
  onSaveDaily: () => void;
}) {
  return (
    <section className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_0.8fr_0.9fr]">
      <div className="brand-panel rounded-lg border border-[#223019] p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <BrandEyebrow text="Ferramenta diária" />
            <h2 className="mt-1 text-2xl font-black text-white">Relatório de pré-abertura</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Salve a leitura da mesa, copie o resumo para postar ou arquivar, e compare depois
              com a abertura real.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onCopyReport}
              className="rounded border border-[#2b3a1d] px-4 py-2 text-sm font-bold text-zinc-200 transition hover:border-[#7ddc12] hover:text-[#b9ff6a]"
            >
              Copiar relatório
            </button>
            <button
              type="button"
              onClick={onSaveDaily}
              className="rounded bg-[#7ddc12] px-4 py-2 text-sm font-black text-black transition hover:bg-[#9af536]"
            >
              Salvar leitura
            </button>
          </div>
        </div>

        <pre className="mt-4 max-h-64 overflow-auto rounded border border-[#2b3a1d] bg-black/35 p-4 text-xs leading-5 text-zinc-300">
          {dailyReport}
        </pre>

        {dailyMessage && (
          <p className="mt-3 rounded border border-[#7ddc12]/30 bg-[#7ddc12]/10 p-3 text-sm text-[#d8ff9a]">
            {dailyMessage}
          </p>
        )}
      </div>

      <div className="brand-panel rounded-lg border border-[#223019] p-5">
        <BrandEyebrow text="Acurácia operacional" />
        <h2 className="mt-1 text-2xl font-black text-white">Projeção vs abertura</h2>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <MiniMetric label="Acuracia 30 dias" value={accuracyStats.graded ? `${accuracyStats.accuracy}%` : "--"} tone={accuracyStats.accuracy - 50} />
          <MiniMetric label="Erro medio" value={accuracyStats.graded ? `${currencyFormatter.format(accuracyStats.averageError)} pts` : "--"} tone={-accuracyStats.averageError} />
          <MiniMetric label="Dias salvos" value={`${accuracyStats.total}/30`} tone={accuracyStats.total} />
          <MiniMetric label="Perfil" value={accuracyStats.dayProfile} tone={0} />
        </div>
        <p className="mt-3 rounded border border-[#223019] bg-black/20 p-3 text-xs leading-5 text-zinc-400">
          Melhor cenário: {accuracyStats.bestScenario}
        </p>

        <label className="mt-4 block text-sm font-bold text-zinc-300">
          Abertura real do WIN
          <input
            inputMode="numeric"
            value={realOpenInput}
            onChange={(event) => setRealOpenInput(event.target.value.replace(/\D/g, ""))}
            placeholder="Ex: 173120"
            className="mt-2 w-full rounded border border-[#2b3a1d] bg-black/45 px-4 py-3 text-white outline-none focus:border-[#7ddc12]"
          />
        </label>

        <div className="mt-4 rounded border border-[#2b3a1d] bg-black/25 p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c6a64f]">
            Diferença
          </p>
          <p className={`mt-2 text-3xl font-black ${projectionDelta === undefined ? "text-zinc-500" : toneClass(-Math.abs(projectionDelta))}`}>
            {projectionDelta === undefined
              ? "--"
              : `${projectionDelta > 0 ? "+" : ""}${currencyFormatter.format(projectionDelta)} pts`}
          </p>
          <p className="mt-2 text-xs leading-5 text-zinc-500">
            Valor positivo significa que a abertura real ficou acima da projeção.
          </p>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#7ddc12]">
            Histórico local
          </p>
          {dailyHistory.length === 0 ? (
            <EmptyState text="Nenhuma leitura salva ainda." />
          ) : (
            dailyHistory.slice(0, 4).map((entry) => (
              <div key={entry.id} className="rounded border border-[#2b3a1d] bg-black/25 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black text-white">
                    {entry.sentimento} · {entry.score}%
                  </p>
                  <span className="text-xs font-bold text-zinc-500">
                    {new Intl.DateTimeFormat("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(entry.createdAt))}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Gap {entry.gapPontos > 0 ? "+" : ""}
                  {currencyFormatter.format(entry.gapPontos)} pts · Projeção{" "}
                  {currencyFormatter.format(entry.aberturaProjetada)}
                </p>
              </div>
            ))
          )}
        </div>

        {lastDailyEntry?.realOpen && (
          <p className="mt-3 text-xs text-zinc-500">
            Última leitura salva já possui abertura real informada.
          </p>
        )}
      </div>

      <InstagramSharePanel
        drivers={drivers}
        instagramCaption={instagramCaption}
        leitura={leitura}
        marketData={marketData}
        socialMessage={socialMessage}
        onCopyInstagramCaption={onCopyInstagramCaption}
        onDownloadInstagramPost={onDownloadInstagramPost}
      />
    </section>
  );
}

function InstagramSharePanel({
  drivers,
  instagramCaption,
  leitura,
  marketData,
  socialMessage,
  onCopyInstagramCaption,
  onDownloadInstagramPost,
}: {
  drivers: DriverItem[];
  instagramCaption: string;
  leitura: {
    forcaAbertura: number;
    score: number;
    fechamentoBase: number;
    gapPontos: number;
    aberturaProjetada: number;
    sentimento: string;
    confianca: string;
    vies: string;
  };
  marketData: MarketData;
  socialMessage: string;
  onCopyInstagramCaption: () => void;
  onDownloadInstagramPost: () => void;
}) {
  return (
    <div className="brand-panel rounded-lg border border-[#223019] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <BrandEyebrow text="Modo Instagram" />
          <h2 className="mt-1 text-2xl font-black text-white">Boletim visual</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Arte vertical 1080x1350 com sinal, gap, projeção e drivers principais.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onDownloadInstagramPost}
            className="rounded bg-[#7ddc12] px-4 py-2 text-sm font-black text-black transition hover:bg-[#9af536]"
          >
            Baixar PNG
          </button>
          <button
            type="button"
            onClick={onCopyInstagramCaption}
            className="rounded border border-[#2b3a1d] px-4 py-2 text-sm font-bold text-zinc-200 transition hover:border-[#7ddc12] hover:text-[#b9ff6a]"
          >
            Copiar legenda
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[0.62fr_0.38fr] xl:grid-cols-1">
        <div className="mx-auto w-full max-w-[360px] overflow-hidden rounded-lg border border-[#2b3a1d] bg-[#071008] shadow-2xl shadow-black/30">
          <div className="relative aspect-[4/5] p-5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(125,220,18,0.22),transparent_28%),radial-gradient(circle_at_90%_22%,rgba(198,166,79,0.18),transparent_24%),linear-gradient(160deg,#050805,#11170d_48%,#070a08)]" />
            <div className="relative flex h-full flex-col">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7ddc12]">
                    Frogman Market Radar
                  </p>
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[#c6a64f]">
                    Pré-abertura WIN
                  </p>
                </div>
                <Image
                  src="/frogman-logo.png"
                  alt={brand.name}
                  width={44}
                  height={44}
                  className="h-11 w-11 rounded border border-[#7ddc12]/35 object-cover"
                />
              </div>

              <div className="mt-8">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                  Sinal do dia
                </p>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <p className={`text-6xl font-black leading-none ${toneClass(leitura.score - 50)}`}>
                    {leitura.score}%
                  </p>
                  <span className="rounded border border-[#2b3a1d] bg-black/30 px-2 py-1 text-xs font-black text-zinc-100">
                    {leitura.sentimento}
                  </span>
                </div>
                <p className="mt-3 text-xl font-black leading-tight text-white">{leitura.vies}</p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded border border-[#2b3a1d] bg-black/35 p-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#c6a64f]">
                    Gap
                  </p>
                  <p className={`mt-1 text-2xl font-black ${toneClass(leitura.gapPontos)}`}>
                    {leitura.gapPontos > 0 ? "+" : ""}
                    {currencyFormatter.format(leitura.gapPontos)}
                  </p>
                  <p className="text-[9px] text-zinc-500">pontos</p>
                </div>
                <div className="rounded border border-[#2b3a1d] bg-black/35 p-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#c6a64f]">
                    Projeção
                  </p>
                  <p className="mt-1 text-2xl font-black text-white">
                    {currencyFormatter.format(leitura.aberturaProjetada)}
                  </p>
                  <p className="text-[9px] text-zinc-500">abertura</p>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {drivers.map((driver) => (
                  <div key={driver.label} className="flex items-center justify-between gap-3 border-b border-[#223019] pb-2 last:border-0">
                    <p className="text-xs font-bold text-zinc-200">{driver.label}</p>
                    <span className={`text-xs font-black ${toneClass(driver.value)}`}>
                      {driver.value > 0 ? "+" : ""}
                      {driver.value.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-auto">
                <div className="brand-rule h-px" />
                <p className="mt-3 text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-400">
                  Dados {marketData.dadosEm || "--"} · Não é recomendação.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c6a64f]">
            Legenda pronta
          </p>
          <pre className="mt-2 max-h-[360px] overflow-auto rounded border border-[#2b3a1d] bg-black/35 p-4 text-xs leading-5 text-zinc-300">
            {instagramCaption}
          </pre>
          {socialMessage && (
            <p className="mt-3 rounded border border-[#7ddc12]/30 bg-[#7ddc12]/10 p-3 text-sm text-[#d8ff9a]">
              {socialMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ExecutionGuardPanel({ guard }: { guard: ExecutionGuard }) {
  return (
    <div className="mt-5 rounded-lg border border-[#7ddc12]/35 bg-black/35 p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c6a64f]">
        Zona de caça
      </p>
      <p className="mt-2 text-xl font-black leading-7 text-white">{guard.headline}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <MiniMetric label="Zona de decisão" value={guard.decisionZone} tone={0} />
        <MiniMetric label="Cancelamento" value={guard.invalidation} tone={-1} />
        <MiniMetric label="Comando" value={guard.command} tone={1} />
      </div>
    </div>
  );
}

function FrogScorePanel({
  score,
  blocks,
}: {
  score: number;
  blocks: FrogScoreBlock[];
}) {
  const positive = blocks.filter((block) => block.value >= 0);
  const penalties = blocks.filter((block) => block.value < 0);

  return (
    <div className="mt-5 rounded-lg border border-[#223019] bg-black/25 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <BrandEyebrow text="FrogScore" />
          <h2 className="mt-1 text-xl font-black text-white">Composição aberta</h2>
        </div>
        <p className={`text-3xl font-black ${toneClass(score - 50)}`}>{score}%</p>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {[...positive, ...penalties].map((block) => (
          <div key={block.label} className="rounded border border-[#223019] bg-black/20 p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-bold text-zinc-100">{block.label}</p>
              <p className={`text-sm font-black ${toneClass(block.value)}`}>
                {block.value > 0 ? "+" : ""}
                {block.value}%
              </p>
            </div>
            <p className="mt-1 text-xs leading-5 text-zinc-500">{block.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PostOpenPanel({ mode }: { mode: PostOpenMode }) {
  return (
    <div className="brand-panel rounded-lg border border-[#223019] p-5 sm:col-span-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <BrandEyebrow text="Leitura pós-abertura" />
          <h2 className="mt-1 text-2xl font-black text-white">{mode.title}</h2>
        </div>
        <span className={`w-fit rounded border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] ${pressureBadgeClass(mode.tone * 30)}`}>
          {mode.status}
        </span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <MiniMetric label="Preço atual" value={mode.priceLine} tone={mode.tone} />
        <MiniMetric label="Zona" value={mode.zoneLine} tone={mode.tone} />
        <MiniMetric label="Pullback" value={mode.pullbackLine} tone={mode.tone} />
        <MiniMetric label="Risco" value={mode.riskLine} tone={-mode.tone} />
      </div>
    </div>
  );
}

function TradePlanPanel({
  message,
  plan,
  onCopyTradePlan,
}: {
  message: string;
  plan: string;
  onCopyTradePlan: () => void;
}) {
  return (
    <div className="brand-panel-strong rounded-lg border border-[#2b3a1d] p-5 sm:col-span-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <BrandEyebrow text="O que fazer agora?" />
          <h2 className="mt-1 text-2xl font-black text-white">Plano de trade</h2>
        </div>
        <button
          type="button"
          onClick={onCopyTradePlan}
          className="w-fit rounded bg-[#78c91c] px-4 py-2 text-sm font-black text-black transition hover:bg-[#9af536]"
        >
          Gerar plano de trade
        </button>
      </div>
      <p className="mt-4 rounded border border-[#223019] bg-black/30 p-4 text-sm font-semibold leading-6 text-zinc-100">
        {plan}
      </p>
      {message && (
        <p className="mt-3 rounded border border-[#7ddc12]/30 bg-[#7ddc12]/10 p-3 text-sm text-[#d8ff9a]">
          {message}
        </p>
      )}
    </div>
  );
}

function DefensePanel({ items }: { items: DefenseItem[] }) {
  const activeItems = items.filter((item) => item.active);
  const trapRisk = activeItems.length >= 2;

  return (
    <section className="brand-panel rounded-lg border border-[#223019] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <BrandEyebrow text="FrogMan Defesa" />
          <h2 className="mt-1 text-xl font-black text-white">
            {trapRisk ? "Risco de armadilha" : "Sem trava principal"}
          </h2>
        </div>
        <span className={`rounded border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] ${trapRisk ? "border-red-400/45 bg-red-400/10 text-red-200" : "border-emerald-400/35 bg-emerald-400/10 text-emerald-200"}`}>
          {activeItems.length}/{items.length}
        </span>
      </div>
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <div key={item.label} className={`rounded border p-3 ${item.active ? "border-red-400/30 bg-red-950/20" : "border-[#223019] bg-black/20"}`}>
            <p className={`text-sm font-black ${item.active ? "text-red-100" : "text-zinc-100"}`}>
              {item.active ? "Atenção: " : "OK: "}
              {item.label}
            </p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function BlueChipRuler({ signals }: { signals: BlueChipSignal[] }) {
  return (
    <section className="brand-panel rounded-lg border border-[#223019] p-5">
      <BrandEyebrow text="Confluência institucional" />
      <h2 className="mt-1 text-xl font-black text-white">Peso real das blue chips</h2>
      <div className="mt-4 space-y-3">
        {signals.map((signal) => (
          <div key={signal.label}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-zinc-100">{signal.label}</p>
                <p className="text-xs leading-5 text-zinc-500">{signal.detail}</p>
              </div>
              <p className={`text-sm font-black ${toneClass(signal.tone)}`}>{signal.value}</p>
            </div>
            <div className="mt-2 h-2 rounded bg-zinc-800">
              <div
                className={`h-2 rounded ${barClass(signal.tone)}`}
                style={{ width: `${Math.max(8, Math.min(100, Math.abs(signal.tone) * 24))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ScenarioMapPanel({ scenarios }: { scenarios: ScenarioPlan[] }) {
  return (
    <section className="brand-panel rounded-lg border border-[#223019] p-5">
      <BrandEyebrow text="Mapa de cenário" />
      <h2 className="mt-1 text-xl font-black text-white">Planos prontos</h2>
      <div className="mt-4 space-y-3">
        {scenarios.map((scenario) => (
          <div key={scenario.label} className="rounded border border-[#223019] bg-black/25 p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#c6a64f]">
                {scenario.label}
              </p>
              <span className={`text-xs font-black ${toneClass(scenario.tone)}`}>
                {scenario.tone > 0 ? "Compra" : scenario.tone < 0 ? "Defesa" : "Aguardar"}
              </span>
            </div>
            <p className="mt-2 text-sm font-black text-white">{scenario.title}</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">{scenario.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function MiniMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: number;
}) {
  return (
    <div className="rounded border border-[#223019] bg-black/25 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </p>
      <p className={`mt-1 text-sm font-black leading-5 ${toneClass(tone)}`}>{value}</p>
    </div>
  );
}

function BigCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: number;
}) {
  return (
    <div className="brand-panel rounded-lg border border-[#223019] p-5">
      <p className="text-sm font-semibold text-zinc-400">{label}</p>
      <p className={`mt-3 text-4xl font-black md:text-5xl ${toneClass(tone)}`}>{value}</p>
      <p className="mt-3 text-sm text-zinc-400">{detail}</p>
    </div>
  );
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-[#223019] bg-black/30 px-3 py-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#c6a64f]">
        {label}
      </span>
      <span className="ml-2 text-xs font-bold text-zinc-200">{value}</span>
    </div>
  );
}

function DataQualityBadge({ quality }: { quality: DataQuality }) {
  const className =
    quality.tone === "success"
      ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
      : quality.tone === "warning"
        ? "border-yellow-500/35 bg-yellow-500/10 text-yellow-100"
        : "border-red-500/35 bg-red-500/10 text-red-200";

  return (
    <span className={`rounded border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] ${className}`}>
      {quality.label}
    </span>
  );
}

function SourcePanel({ source, quality }: { source: string; quality: DataQuality }) {
  return (
    <div className="brand-panel rounded-lg border border-[#223019] p-5">
      <BrandEyebrow text="Fonte e status" />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <DataQualityBadge quality={quality} />
        <span className="rounded border border-[#2b3a1d] px-2 py-1 text-xs font-bold text-zinc-300">
          {source}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-zinc-400">{quality.detail}</p>
    </div>
  );
}

function PressureTapePanel({ tape }: { tape: PressureTape }) {
  return (
    <div className="brand-panel rounded-lg border border-[#223019] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <BrandEyebrow text="Frogman Pressure Tape" />
          <h2 className="mt-1 text-2xl font-black text-white">{tape.label}</h2>
        </div>
        <span className={`rounded border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] ${pressureBadgeClass(tape.score)}`}>
          {tape.score > 0 ? "+" : ""}
          {tape.score}
        </span>
      </div>
      <p className="mt-3 text-sm font-bold leading-5 text-zinc-100">{tape.posture}</p>
      <p className="mt-2 text-xs leading-5 text-zinc-500">{tape.summary}</p>

      <div className="mt-4 space-y-3 border-t border-[#223019] pt-4">
        {tape.items.map((item) => (
          <div key={item.label} className="grid gap-2 sm:grid-cols-[0.68fr_0.32fr] sm:items-start">
            <div>
              <p className="text-sm font-bold text-zinc-100">{item.label}</p>
              <p className="text-xs leading-5 text-zinc-500">{item.detail}</p>
            </div>
            <p className={`text-sm font-black sm:text-right ${toneClass(item.tone)}`}>
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TacticalPulse({ brief }: { brief: TacticalBrief }) {
  return (
    <div className="mt-5 grid gap-3 border-t border-[#2b3a1d] pt-4 md:grid-cols-3">
      {[
        ["Regime", brief.regime],
        ["Plano", brief.stance],
        ["Risco", brief.riskLine],
      ].map(([label, text]) => (
        <div key={label}>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#c6a64f]">
            {label}
          </p>
          <p className="mt-1 text-sm font-bold leading-5 text-zinc-100">{text}</p>
        </div>
      ))}
    </div>
  );
}

function TacticalBriefPanel({ brief }: { brief: TacticalBrief }) {
  return (
    <div className="brand-panel rounded-lg border border-[#223019] p-5 sm:col-span-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <BrandEyebrow text="Briefing da mesa" />
          <h2 className="mt-1 text-2xl font-black text-white">{brief.regime}</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{brief.detail}</p>
        </div>
        <span className="w-fit rounded border border-[#2b3a1d] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#c6a64f]">
          {brief.catalyst}
        </span>
      </div>

      <div className="mt-4 space-y-3 border-t border-[#223019] pt-4">
        {brief.watchlist.map((item) => (
          <div key={item.label} className="grid gap-2 sm:grid-cols-[0.75fr_0.25fr] sm:items-center">
            <div>
              <p className="text-sm font-bold text-zinc-100">{item.label}</p>
              <p className="text-xs leading-5 text-zinc-500">{item.desc}</p>
            </div>
            <p className={`text-left text-sm font-black sm:text-right ${toneClass(item.value)}`}>
              {formatPercent(item.value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function WinMapPanel({
  map,
  caption,
}: {
  map: WinOperationalMap;
  caption?: string;
}) {
  return (
    <section className="brand-panel rounded-lg border border-[#223019] p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <BrandEyebrow text="Mapa operacional WIN" />
          <h2 className="mt-1 text-xl font-black text-white">{map.bias}</h2>
        </div>
        {caption && <p className="max-w-[190px] text-left text-xs font-semibold text-zinc-500 sm:text-right">{caption}</p>}
      </div>

      <p className="mt-4 text-sm font-bold leading-5 text-zinc-100">{map.headline}</p>
      <p className="mt-2 text-xs leading-5 text-zinc-500">{map.command}</p>

      <div className="mt-4 grid gap-2">
        {map.zones.map((zone) => (
          <div key={zone.label} className="rounded border border-[#223019] bg-black/25 p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-zinc-500">
                {zone.label}
              </p>
              <p className={`text-sm font-black ${toneClass(zone.tone)}`}>{zone.value}</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-zinc-400">{zone.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-[#223019] pt-4">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#c6a64f]">
          Pressão agora
        </p>
        <div className="mt-3 space-y-2">
          {map.pressure.map((item) => (
            <div key={item.label} className="grid gap-1 sm:grid-cols-[0.62fr_0.38fr] sm:items-start">
              <div>
                <p className="text-sm font-bold text-zinc-100">{item.label}</p>
                <p className="text-xs leading-5 text-zinc-500">{item.detail}</p>
              </div>
              <p className={`text-sm font-black sm:text-right ${toneClass(item.tone)}`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 border-t border-[#223019] pt-4">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#c6a64f]">
          Checklist de execução
        </p>
        <div className="mt-3 space-y-2">
          {map.triggers.map((trigger) => (
            <p key={trigger} className="rounded border border-[#223019] bg-black/20 px-3 py-2 text-xs font-semibold leading-5 text-zinc-300">
              {trigger}
            </p>
          ))}
        </div>
      </div>

      <div className="mt-4 border-t border-[#223019] pt-4">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#c6a64f]">
          Risco de horário
        </p>
        <div className="mt-3 space-y-3">
          {map.riskEvents.length > 0 ? (
            map.riskEvents.map((event) => (
              <TimelineItem
                key={`${event.hora}-${event.pais}-${event.titulo}`}
                meta={`${event.hora} · ${event.pais ?? "GLOBAL"} · ${event.impacto}`}
                text={event.titulo}
                detail={event.motivo}
                tone={normalizeImpact(event.impacto) === "ALTO" ? "danger" : "warning"}
              />
            ))
          ) : (
            <EmptyState text="Sem evento relevante para travar a leitura do WIN agora." />
          )}
        </div>
      </div>
    </section>
  );
}

function MarketCard({
  name,
  desc,
  value,
  weight,
  unit = "percent",
  updatedAt,
}: {
  name: string;
  desc: string;
  value: number;
  weight: string;
  unit?: "percent" | "bps";
  updatedAt?: string;
}) {
  return (
    <div className="rounded-lg border border-[#223019] bg-black/35 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-zinc-500">{desc}</p>
          <h3 className="mt-1 font-black text-white">{name}</h3>
        </div>
        <span className="rounded border border-[#2b3a1d] px-2 py-1 text-[10px] font-bold uppercase text-[#c6a64f]">
          {weight}
        </span>
      </div>
      <p className={`mt-4 text-2xl font-black ${toneClass(unit === "bps" ? -value : value)}`}>
        {unit === "bps" ? formatBps(value) : formatPercent(value)}
      </p>
      <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
        Atualizado {updatedAt || "--"}
      </p>
    </div>
  );
}

function SignalBadge({ signal }: { signal: string }) {
  const className =
    signal === "Comprador"
      ? "border-[#7ddc12]/50 bg-[#7ddc12]/10 text-[#b9ff6a]"
      : signal === "Vendedor"
        ? "border-red-400/50 bg-red-400/10 text-red-200"
        : "border-[#c6a64f]/50 bg-[#c6a64f]/10 text-[#f4db8a]";

  return (
    <span className={`rounded-lg border px-3 py-2 text-sm font-black ${className}`}>
      {signal}
    </span>
  );
}

function NewsRadarPanel({ news, meta }: { news: NewsItem[]; meta: NewsMeta }) {
  const [activeCategory, setActiveCategory] = useState("TODAS");
  const [query, setQuery] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    return JSON.parse(window.localStorage.getItem("frogman.newsFavorites") || "[]");
  });

  useEffect(() => {
    window.localStorage.setItem("frogman.newsFavorites", JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  const categories = useMemo(() => {
    const available = Array.from(new Set(news.map((item) => item.categoria || "GERAL")));

    return ["TODAS", ...available.slice(0, 7)];
  }, [news]);

  const filteredNews = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return news.filter((item) => {
      const categoryMatch = activeCategory === "TODAS" || item.categoria === activeCategory;
      const text = `${item.titulo} ${item.ticker ?? ""} ${item.fonte ?? ""}`.toLowerCase();
      const queryMatch = !normalizedQuery || text.includes(normalizedQuery);

      return categoryMatch && queryMatch;
    });
  }, [activeCategory, news, query]);

  function toggleFavorite(id: string) {
    setFavoriteIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [id, ...current].slice(0, 24)
    );
  }

  const highImpactCount = news.filter((item) => item.impacto === "alto").length;
  const featuredNews = filteredNews.slice(0, 9);

  return (
    <section className="brand-panel rounded-lg border border-[#223019] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${meta.live ? "bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.85)]" : "bg-yellow-300"}`}
            />
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#7ddc12]">
              FrogNews Live
            </p>
          </div>
          <h2 className="mt-1 text-2xl font-black text-white">Noticias em tempo real</h2>
        </div>

        <div className="grid grid-cols-3 gap-2 text-right">
          <MiniNewsStat label="posts" value={String(meta.total || news.length)} />
          <MiniNewsStat label="alto" value={String(highImpactCount)} tone="danger" />
          <MiniNewsStat label="update" value={meta.atualizadoEm || "--"} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[0.9fr_1.1fr]">
        <label className="flex items-center gap-2 rounded border border-[#2b3a1d] bg-black/35 px-3 py-2">
          <span className="text-[#c6a64f]">Q</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar ticker, fonte ou manchete"
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-zinc-100 outline-none placeholder:text-zinc-600"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`rounded border px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] transition ${
                activeCategory === category
                  ? "border-[#7ddc12] bg-[#7ddc12]/10 text-[#b9ff6a]"
                  : "border-zinc-700 text-zinc-400 hover:border-[#c6a64f] hover:text-[#f4db8a]"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 max-h-[520px] space-y-3 overflow-y-auto pr-1">
        {featuredNews.length > 0 ? (
          featuredNews.map((item) => {
            const isFavorite = favoriteIds.includes(item.id);

            return (
              <article
                key={item.id}
                className="border-b border-[#223019] pb-3 last:border-0 last:pb-0"
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleFavorite(item.id)}
                    className={`mt-0.5 h-7 w-7 shrink-0 rounded border text-sm font-black transition ${
                      isFavorite
                        ? "border-[#c6a64f] bg-[#c6a64f]/15 text-[#f4db8a]"
                        : "border-zinc-800 text-zinc-600 hover:border-[#c6a64f] hover:text-[#f4db8a]"
                    }`}
                    aria-label={isFavorite ? "Remover favorito" : "Marcar favorito"}
                    title={isFavorite ? "Remover favorito" : "Marcar favorito"}
                  >
                    {isFavorite ? "★" : "☆"}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded border px-2 py-1 text-[10px] font-black uppercase ${getNewsImpactClass(item.impacto)}`}>
                        {item.impacto}
                      </span>
                      <span className="text-xs font-black uppercase tracking-[0.12em] text-cyan-200">
                        {item.hora}
                      </span>
                      {item.ticker && (
                        <span className="rounded border border-[#2b3a1d] px-2 py-1 text-[10px] font-black text-[#c6a64f]">
                          {item.ticker}
                        </span>
                      )}
                      <span className="text-[11px] font-semibold text-zinc-600">
                        {item.categoria || "GERAL"}
                      </span>
                    </div>

                    <a
                      href={item.url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 block text-sm font-black leading-5 text-zinc-100 transition hover:text-[#b9ff6a]"
                    >
                      {item.titulo}
                    </a>

                    {item.resumo && (
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">{item.resumo}</p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-zinc-600">
                      <span>{item.fonte || "Fonte externa"}</span>
                      <span>{formatNewsAge(item.publicadoEm)}</span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <EmptyState text="Sem noticias para esse filtro." />
        )}
      </div>

      {meta.fontes.length > 0 && (
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
          Fontes: {meta.fontes.join(" / ")}
        </p>
      )}
    </section>
  );
}

function MiniNewsStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "danger" | "neutral";
}) {
  return (
    <div className="rounded border border-[#2b3a1d] bg-black/30 px-2 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-zinc-600">{label}</p>
      <p className={`mt-1 text-sm font-black ${tone === "danger" ? "text-red-300" : "text-zinc-100"}`}>
        {value}
      </p>
    </div>
  );
}

function getNewsImpactClass(impact: string) {
  if (impact === "alto") {
    return "border-red-400/50 bg-red-400/10 text-red-200";
  }

  if (impact === "medio") {
    return "border-[#c6a64f]/50 bg-[#c6a64f]/10 text-[#f4db8a]";
  }

  return "border-cyan-400/40 bg-cyan-400/10 text-cyan-200";
}

function formatNewsAge(publishedAt?: string) {
  if (!publishedAt) {
    return "agora";
  }

  const deltaMinutes = Math.max(0, Math.round((Date.now() - new Date(publishedAt).getTime()) / 60000));

  if (deltaMinutes < 2) {
    return "agora";
  }

  if (deltaMinutes < 60) {
    return `${deltaMinutes} min`;
  }

  return `${Math.round(deltaMinutes / 60)} h`;
}

function InfoPanel({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="brand-panel rounded-lg border border-[#223019] p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl font-black text-white">{title}</h2>
        {caption && <p className="text-right text-xs font-semibold text-zinc-500">{caption}</p>}
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded border border-dashed border-[#2b3a1d] bg-black/20 p-4 text-sm text-zinc-500">
      {text}
    </div>
  );
}

function TimelineItem({
  meta,
  text,
  detail,
  tone,
}: {
  meta: string;
  text: string;
  detail?: string;
  tone: "danger" | "warning" | "neutral";
}) {
  const color =
    tone === "danger"
      ? "text-red-300"
      : tone === "warning"
        ? "text-yellow-300"
        : "text-cyan-200";

  return (
    <div className="border-b border-[#223019] pb-3 last:border-0 last:pb-0">
      <p className={`text-xs font-black uppercase tracking-[0.14em] ${color}`}>{meta}</p>
      <p className="mt-1 text-sm leading-5 text-zinc-300">{text}</p>
      {detail && <p className="mt-1 text-xs leading-5 text-zinc-500">{detail}</p>}
    </div>
  );
}

function buildFrogScoreBlocks(
  marketData: MarketData,
  calendar: CalendarEvent[],
  dataQuality: DataQuality
): FrogScoreBlock[] {
  const external =
    marketData.ewz * 0.48 +
    marketData.sp500 * 0.28 +
    marketData.nasdaq * 0.18 -
    marketData.vix * 0.08;
  const dollar = -(marketData.dxy * 0.55 + marketData.usdbrl * 0.85);
  const rates = -normalizeDiPressure(marketData.di);
  const commodities = marketData.brent * 0.42 + marketData.vale3 * 0.28 + marketData.petr4 * 0.22;
  const banks = (marketData.itub4 + marketData.bbdc4 + marketData.bbas3) / 3;
  const valePetro = (marketData.vale3 + marketData.petr4) / 2;
  const volatility = -marketData.vix;
  const riskPenalty =
    (calendar.some((event) => normalizeImpact(event.impacto) === "ALTO") ? -4 : 0) +
    (dataQuality.tone !== "success" ? -5 : 0) +
    (dollar < -0.35 && external > 0 ? -3 : 0);

  return [
    {
      label: "Exterior",
      value: weightedContribution(external, 30),
      max: 30,
      detail: "EWZ, S&P, Nasdaq e VIX medem apetite global.",
    },
    {
      label: "Dólar/DXY",
      value: weightedContribution(dollar, 15),
      max: 15,
      detail: "Dólar local e dólar global contra ou a favor do índice.",
    },
    {
      label: "Juros/DI",
      value: weightedContribution(rates, 10),
      max: 10,
      detail: "DI subindo reduz apetite; DI cedendo libera valuation.",
    },
    {
      label: "Commodities",
      value: weightedContribution(commodities, 12),
      max: 12,
      detail: "Brent, Vale e Petrobras como motor de índice.",
    },
    {
      label: "Bancos",
      value: weightedContribution(banks, 8),
      max: 8,
      detail: "ITUB4, BBDC4 e BBAS3 mostram sustentação local.",
    },
    {
      label: "Vale/Petro",
      value: weightedContribution(valePetro, 5),
      max: 5,
      detail: "Peso direto das duas blue chips mais sensíveis.",
    },
    {
      label: "Volatilidade/VIX",
      value: weightedContribution(volatility, 10),
      max: 10,
      detail: "VIX contra reduz confiança da compra.",
    },
    {
      label: "Penalidades",
      value: riskPenalty,
      max: 12,
      detail: "Agenda, dados parciais e divergências tiram qualidade do sinal.",
    },
  ];
}

function buildExecutionGuard(leitura: MarketReading): ExecutionGuard {
  const levels = getOperationalLevels(leitura);

  if (leitura.score >= 65) {
    return {
      headline: `Compra válida somente acima de ${formatIndexLevel(levels.support)}`,
      decisionZone: `${formatIndexLevel(levels.support)}-${formatIndexLevel(levels.resistance)}`,
      invalidation: `Abaixo de ${formatIndexLevel(levels.support)}: leitura cancelada`,
      command: "Comprar só com preço sustentado",
      support: levels.support,
      resistance: levels.resistance,
    };
  }

  if (leitura.score <= 42) {
    return {
      headline: `Venda válida somente abaixo de ${formatIndexLevel(levels.resistance)}`,
      decisionZone: `${formatIndexLevel(levels.support)}-${formatIndexLevel(levels.resistance)}`,
      invalidation: `Acima de ${formatIndexLevel(levels.resistance)}: venda cancelada`,
      command: "Vender só com repique falhando",
      support: levels.support,
      resistance: levels.resistance,
    };
  }

  return {
    headline: "Sem lado limpo: operar apenas rompimento confirmado",
    decisionZone: `${formatIndexLevel(levels.support)}-${formatIndexLevel(levels.resistance)}`,
    invalidation: "Miolo da zona: leitura neutra",
    command: "Aguardar 10h ou fluxo claro",
    support: levels.support,
    resistance: levels.resistance,
  };
}

function buildPostOpenMode(
  leitura: MarketReading,
  marketData: MarketData,
  dataQuality: DataQuality,
  now: Date
): PostOpenMode {
  const minutes = getSaoPauloMinutes(now);
  const guard = buildExecutionGuard(leitura);
  const currentPrice = marketData.winAtual || 0;
  const hasPrice = currentPrice > 0;
  const insideZone = hasPrice && currentPrice >= guard.support && currentPrice <= guard.resistance;
  const aboveZone = hasPrice && currentPrice > guard.resistance;
  const belowZone = hasPrice && currentPrice < guard.support;
  const dollarAgainstBuy = marketData.usdbrl > 0 || marketData.dxy > 0 || marketData.vix > 0;
  const dollarAgainstSell = marketData.usdbrl < 0 || marketData.dxy < 0 || marketData.vix < 0;

  if (minutes < 9 * 60) {
    return {
      title: "Modo pré-abertura",
      status: "Pre-abertura",
      priceLine: hasPrice ? formatIndexLevel(currentPrice) : "--",
      zoneLine: guard.decisionZone,
      pullbackLine: "Aguardar abertura",
      riskLine: dataQuality.label,
      tone: 0,
    };
  }

  if (!hasPrice || dataQuality.tone === "danger") {
    return {
      title: "Execução em tempo real",
      status: "Modo defesa",
      priceLine: hasPrice ? formatIndexLevel(currentPrice) : "--",
      zoneLine: "Sem preço confiável",
      pullbackLine: "Não validar",
      riskLine: dataQuality.label,
      tone: -1,
    };
  }

  if (leitura.score >= 65) {
    if (belowZone) {
      return {
        title: "Execução em tempo real",
        status: "Perdeu leitura",
        priceLine: `${formatIndexLevel(currentPrice)} vs ${formatIndexLevel(leitura.aberturaProjetada)}`,
        zoneLine: "Abriu/perdeu abaixo da zona",
        pullbackLine: "Pullback não respeitado",
        riskLine: dollarAgainstBuy ? "Dólar/VIX contra" : "Preço invalidou",
        tone: -1,
      };
    }

    return {
      title: "Execução em tempo real",
      status: aboveZone ? "Confirmado" : "Aguardando pullback",
      priceLine: `${formatIndexLevel(currentPrice)} vs ${formatIndexLevel(leitura.aberturaProjetada)}`,
      zoneLine: insideZone ? "Dentro da zona" : "Acima da zona",
      pullbackLine: insideZone ? "Esperar sustentação" : "Pullback respeitado",
      riskLine: dollarAgainstBuy ? "Dólar/VIX contra" : "Fluxo sem trava",
      tone: dollarAgainstBuy ? 0.35 : 1,
    };
  }

  if (leitura.score <= 42) {
    if (aboveZone) {
      return {
        title: "Execução em tempo real",
        status: "Perdeu leitura",
        priceLine: `${formatIndexLevel(currentPrice)} vs ${formatIndexLevel(leitura.aberturaProjetada)}`,
        zoneLine: "Acima da zona",
        pullbackLine: "Venda cancelada",
        riskLine: dollarAgainstSell ? "Fluxo virou contra venda" : "Preço invalidou",
        tone: -1,
      };
    }

    return {
      title: "Execução em tempo real",
      status: belowZone ? "Confirmado" : "Aguardando pullback",
      priceLine: `${formatIndexLevel(currentPrice)} vs ${formatIndexLevel(leitura.aberturaProjetada)}`,
      zoneLine: insideZone ? "Dentro da zona" : "Abaixo da zona",
      pullbackLine: insideZone ? "Esperar falha do repique" : "Repique falhou",
      riskLine: dollarAgainstSell ? "Dólar/VIX aliviaram" : "Fluxo sem trava",
      tone: dollarAgainstSell ? -0.35 : -1,
    };
  }

  return {
    title: "Execução em tempo real",
    status: "Modo defesa",
    priceLine: `${formatIndexLevel(currentPrice)} vs ${formatIndexLevel(leitura.aberturaProjetada)}`,
    zoneLine: insideZone ? "Lateral na zona" : aboveZone ? "Acima da zona" : "Abaixo da zona",
    pullbackLine: "Aguardar confirmação",
    riskLine: "Score misto",
    tone: 0,
  };
}

function buildDefenseChecklist(
  leitura: MarketReading,
  marketData: MarketData,
  calendar: CalendarEvent[],
  dataQuality: DataQuality,
  postOpenMode: PostOpenMode
): DefenseItem[] {
  const guard = buildExecutionGuard(leitura);
  const gapExagerado = Math.abs(leitura.gapPontos) >= 900;
  const dollarAgainst =
    leitura.score >= 65
      ? marketData.usdbrl > 0 || marketData.dxy > 0
      : leitura.score <= 42
        ? marketData.usdbrl < 0 || marketData.dxy < 0
        : false;
  const vixAgainst =
    leitura.score >= 65 ? marketData.vix > 0 : leitura.score <= 42 ? marketData.vix < 0 : false;
  const agendaSoon = hasHighImpactWithin(calendar, 30);
  const divergentBlueChips =
    leitura.score >= 65
      ? marketData.petr4 + marketData.vale3 + marketData.itub4 + marketData.bbdc4 < 0
      : leitura.score <= 42
        ? marketData.petr4 + marketData.vale3 + marketData.itub4 + marketData.bbdc4 > 0
        : false;
  const inconsistentAuction =
    marketData.winAtual && (marketData.winAtual < guard.support || marketData.winAtual > guard.resistance)
      ? postOpenMode.status === "Perdeu leitura"
      : false;

  return [
    {
      label: "Gap exagerado",
      active: gapExagerado,
      detail: `${leitura.gapPontos > 0 ? "+" : ""}${currencyFormatter.format(leitura.gapPontos)} pts projetados.`,
    },
    {
      label: "Dólar contra",
      active: dollarAgainst,
      detail: `USD/BRL ${formatPercent(marketData.usdbrl)}; DXY ${formatPercent(marketData.dxy)}.`,
    },
    {
      label: "VIX contra",
      active: vixAgainst,
      detail: `VIX em ${formatPercent(marketData.vix)} contra o viés principal.`,
    },
    {
      label: "Agenda pesada em menos de 30 min",
      active: agendaSoon,
      detail: agendaSoon ? "Evento relevante próximo pode distorcer a leitura." : "Sem trava imediata de agenda.",
    },
    {
      label: "Dados desatualizados ou parciais",
      active: dataQuality.tone !== "success",
      detail: dataQuality.detail,
    },
    {
      label: "Score divergente",
      active: divergentBlueChips,
      detail: "Score e blue chips pesadas não apontam para o mesmo lado.",
    },
    {
      label: "Leilão inconsistente",
      active: inconsistentAuction,
      detail: postOpenMode.zoneLine,
    },
  ];
}

function buildAccuracyStats(history: DailyEntry[]): AccuracyStats {
  const entries = history.slice(0, 30);
  const graded = entries.filter((entry) => typeof entry.realOpen === "number" && entry.realOpen > 0);
  const hits = graded.filter((entry) => {
    if (!entry.realOpen) {
      return false;
    }

    const projectedDirection = Math.sign(entry.aberturaProjetada - entry.fechamentoBase);
    const realDirection = Math.sign(entry.realOpen - entry.fechamentoBase);

    return projectedDirection === realDirection || Math.abs(entry.realOpen - entry.fechamentoBase) < 120;
  });
  const averageError = graded.length
    ? Math.round(
        graded.reduce((sum, entry) => sum + Math.abs((entry.realOpen ?? 0) - entry.aberturaProjetada), 0) /
          graded.length
      )
    : 0;
  const buyers = entries.filter((entry) => entry.sentimento === "Comprador").length;
  const sellers = entries.filter((entry) => entry.sentimento === "Vendedor").length;
  const dayProfile =
    buyers > sellers + 1 ? "Comprador" : sellers > buyers + 1 ? "Vendedor" : entries.length ? "Misto" : "--";

  return {
    total: entries.length,
    graded: graded.length,
    accuracy: graded.length ? Math.round((hits.length / graded.length) * 100) : 0,
    averageError,
    bestScenario: graded.length
      ? "Gap alinhado com exterior + bancos e sem defesa ativa."
      : "Salve leituras com abertura real para medir os últimos 30 dias.",
    dayProfile,
  };
}

function buildBlueChipSignals(leitura: MarketReading, marketData: MarketData): BlueChipSignal[] {
  const bankPressure = marketData.itub4 + marketData.bbdc4 + marketData.bbas3;
  const valePetro = marketData.vale3 + marketData.petr4;
  const winDisplacement = marketData.winAtual
    ? ((marketData.winAtual - leitura.aberturaProjetada) / leitura.aberturaProjetada) * 100
    : 0;
  const biasTone = leitura.score >= 65 ? 1 : leitura.score <= 42 ? -1 : 0;

  return [
    {
      label: "Bancos alinhados?",
      value: bankPressure >= 0 ? "A favor" : "Contra",
      detail: `ITUB4, BBDC4 e BBAS3 somam ${formatPercent(bankPressure)}.`,
      aligned: biasTone === 0 || bankPressure * biasTone >= 0,
      tone: bankPressure,
    },
    {
      label: "PETR4",
      value: marketData.petr4 >= 0 ? "A favor" : "Contra",
      detail: `Petrobras em ${formatPercent(marketData.petr4)}.`,
      aligned: biasTone === 0 || marketData.petr4 * biasTone >= 0,
      tone: marketData.petr4,
    },
    {
      label: "VALE3",
      value: marketData.vale3 >= 0 ? "A favor" : "Contra",
      detail: `Vale em ${formatPercent(marketData.vale3)}.`,
      aligned: biasTone === 0 || marketData.vale3 * biasTone >= 0,
      tone: marketData.vale3,
    },
    {
      label: "IBOV/WIN deslocado?",
      value: formatPercent(winDisplacement),
      detail: `Atual vs abertura projetada; Vale/Petro juntas: ${formatPercent(valePetro)}.`,
      aligned: Math.abs(winDisplacement) < 0.35,
      tone: winDisplacement,
    },
  ];
}

function buildScenarioMap(
  leitura: MarketReading,
  guard: ExecutionGuard,
  marketData: MarketData
): ScenarioPlan[] {
  return [
    {
      label: "Cenário A",
      title: `Rompe ${formatIndexLevel(leitura.aberturaProjetada)} e segura`,
      detail: `Compra ganha prioridade acima da zona, com DXY ${formatPercent(marketData.dxy)} e VIX ${formatPercent(marketData.vix)} sem virarem contra.`,
      tone: 1,
    },
    {
      label: "Cenário B",
      title: "Abre forte e perde base",
      detail: `Falso rompimento se perder ${formatIndexLevel(guard.support)}; abaixo disso a leitura compradora é cancelada.`,
      tone: -1,
    },
    {
      label: "Cenário C",
      title: "Lateraliza na zona",
      detail: `Dentro de ${guard.decisionZone}, aguardar 10h ou confirmação das blue chips antes de aumentar mão.`,
      tone: 0,
    },
  ];
}

function buildTradePlan(
  leitura: MarketReading,
  guard: ExecutionGuard,
  postOpenMode: PostOpenMode,
  defenseItems: DefenseItem[],
  calendar: CalendarEvent[]
) {
  const activeDefense = defenseItems.filter((item) => item.active).map((item) => item.label);
  const nextEvent = calendar.find((event) => ["ALTO", "MEDIO"].includes(normalizeImpact(event.impacto)));
  const side =
    leitura.score >= 65
      ? "Viés comprador"
      : leitura.score <= 42
        ? "Viés vendedor"
        : "Viés misto";

  return [
    `${side}.`,
    guard.headline + ".",
    `Zona de decisão ${guard.decisionZone}.`,
    leitura.score >= 65
      ? "Evitar entrada no topo do gap; priorizar pullback respeitado ou rompimento com sustentação."
      : leitura.score <= 42
        ? "Evitar venda atrasada; priorizar repique fraco ou perda limpa da base."
        : "Reduzir mão enquanto preço e drivers não confirmarem lado.",
    `Status agora: ${postOpenMode.status}.`,
    activeDefense.length ? `FrogMan Defesa ativo: ${activeDefense.join(", ")}.` : "Sem trava principal de defesa.",
    nextEvent ? `Atenção ${nextEvent.hora} ${nextEvent.pais ?? "GLOBAL"}: ${nextEvent.titulo}.` : "Sem agenda crítica imediata.",
  ].join(" ");
}

function buildPressureTape(marketData: MarketData, coreScore: number): PressureTape {
  const diPressure = normalizeDiPressure(marketData.di);
  const exchangePressure = -(marketData.usdbrl * 0.9 + marketData.dxy * 0.35);
  const ratePressure = -diPressure;
  const bankPressure = marketData.itub4 + marketData.bbdc4 + marketData.bbas3;
  const commodityPressure = marketData.petr4 + marketData.vale3 + marketData.brent * 0.25;
  const externalPressure =
    marketData.ewz * 0.45 +
    marketData.sp500 * 0.25 +
    marketData.nasdaq * 0.15 -
    marketData.vix * 0.15;
  const score = Math.round(
    Math.max(
      -100,
      Math.min(
        100,
        exchangePressure * 16 +
          ratePressure * 16 +
          bankPressure * 8 +
          commodityPressure * 6 +
          externalPressure * 10 +
          (coreScore - 50) * 0.55
      )
    )
  );
  const label =
    score >= 25
      ? "Pressão compradora"
      : score <= -25
        ? "Pressão vendedora"
        : "Pressão neutra";
  const posture =
    score >= 25
      ? "Ambiente favorece compra apenas com preço confirmando."
      : score <= -25
        ? "Ambiente favorece defesa e venda em repique fraco."
        : "Ambiente misto: reduzir mão e exigir confirmação.";
  const summary =
    score >= 25
      ? "Dólar, juros, bancos e exterior estão mais alinhados para sustentar o índice."
      : score <= -25
        ? "Câmbio, juros ou pesos do IBOV estão pressionando a leitura do WIN."
        : "Os vetores principais ainda não entregam vantagem clara para um lado.";

  return {
    score,
    label,
    posture,
    summary,
    items: [
      {
        label: "USD/BRL",
        value: `${formatPercent(marketData.usdbrl)}${marketData.usdbrlPrice ? ` · ${marketData.usdbrlPrice.toFixed(4)}` : ""}`,
        detail: "Dólar local subindo costuma pesar no índice.",
        tone: -marketData.usdbrl,
      },
      {
        label: "DI / Juros",
        value: `${formatBps(marketData.di)}${marketData.diRate ? ` · ${marketData.diRate.toFixed(2)}%` : ""}`,
        detail: marketData.diFonte ? `Fonte: ${marketData.diFonte}` : "Juros futuros como pressão de valuation.",
        tone: -marketData.di,
      },
      {
        label: "Bancos",
        value: formatPercent(bankPressure),
        detail: "ITUB4, BBDC4 e BBAS3 medem sustentação financeira do IBOV.",
        tone: bankPressure,
      },
      {
        label: "Vale / Petro",
        value: formatPercent(commodityPressure),
        detail: "Commodities e pesos de índice seguram ou puxam o WIN.",
        tone: commodityPressure,
      },
      {
        label: "Exterior",
        value: formatPercent(externalPressure),
        detail: "EWZ, S&P, Nasdaq e VIX filtram o apetite global.",
        tone: externalPressure,
      },
    ],
  };
}

function buildWinOperationalMap(
  leitura: {
    score: number;
    gapPontos: number;
    sentimento: string;
    confianca: string;
    vies: string;
    aberturaProjetada: number;
    fechamentoBase: number;
  },
  drivers: DriverItem[],
  marketData: MarketData,
  calendar: CalendarEvent[]
): WinOperationalMap {
  const eventRisk = calendar
    .filter((event) => ["ALTO", "MEDIO"].includes(normalizeImpact(event.impacto)))
    .slice(0, 3);
  const highImpact = eventRisk.find((event) => normalizeImpact(event.impacto) === "ALTO");
  const adaptiveBand = Math.round(Math.abs(leitura.gapPontos) * 0.45);
  const decisionBand = Math.max(300, Math.min(700, adaptiveBand || 350));
  const support = leitura.aberturaProjetada - decisionBand;
  const resistance = leitura.aberturaProjetada + decisionBand;
  const externalPressure = marketData.ewz + marketData.sp500 + marketData.nasdaq;
  const fearPressure =
    -(marketData.dxy + marketData.vix) -
    marketData.usdbrl * 0.75 -
    normalizeDiPressure(marketData.di);
  const localPressure =
    marketData.petr4 +
    marketData.vale3 +
    marketData.itub4 +
    marketData.bbdc4 +
    marketData.bbas3;
  const bankPressure = marketData.itub4 + marketData.bbdc4 + marketData.bbas3;
  const dominantDriver = [...drivers].sort(
    (first, second) => Math.abs(second.value) - Math.abs(first.value)
  )[0];

  const bias =
    leitura.score >= 65
      ? "Viés comprador no WIN"
      : leitura.score <= 42
        ? "Viés vendedor no WIN"
        : "WIN em faixa de confirmação";
  const headline =
    leitura.score >= 65
      ? "Compra só ganha prioridade se o preço sustentar a abertura projetada."
      : leitura.score <= 42
        ? "Venda ganha prioridade se o preço perder a região projetada."
        : "Sem direção limpa: primeiro rompimento precisa de confirmação.";
  const command =
    leitura.score >= 65
      ? "Evitar perseguir gap; melhor leitura vem de pullback controlado ou rompimento com dólar/VIX sem virar contra."
      : leitura.score <= 42
        ? "Evitar compra por preço barato; esperar repique falhar ou perda de suporte com pesos do IBOV negativos."
        : "Operar menor até EWZ, EUA, bancos e fluxo local apontarem para o mesmo lado.";

  const invalidation =
    leitura.score >= 65
      ? {
          value: `Abaixo de ${formatIndexLevel(support)}`,
          detail: "Perde a leitura compradora e vira dia de proteção.",
          tone: -1,
        }
      : leitura.score <= 42
        ? {
            value: `Acima de ${formatIndexLevel(resistance)}`,
            detail: "Perde a leitura vendedora e pede reavaliação do short.",
            tone: 1,
          }
        : {
            value: `${formatIndexLevel(support)} / ${formatIndexLevel(resistance)}`,
            detail: "Miolo do range pede paciência; bordas decidem o primeiro plano.",
            tone: 0,
          };

  const triggers =
    leitura.score >= 65
      ? [
          `Preço acima de ${formatIndexLevel(leitura.aberturaProjetada)} com pullback respeitado.`,
          "EWZ ou futuros dos EUA continuam positivos depois da abertura.",
          "DXY/VIX não aceleram contra o índice nos primeiros movimentos.",
        ]
      : leitura.score <= 42
        ? [
            `Preço abaixo de ${formatIndexLevel(leitura.aberturaProjetada)} sem retomada rápida.`,
            "PETR4, VALE3 ou bancos não conseguem puxar o IBOV.",
            "DXY/VIX pressionam e impedem repique sustentado.",
          ]
        : [
            `Rompimento limpo fora de ${formatIndexLevel(support)} - ${formatIndexLevel(resistance)}.`,
            "Driver dominante confirma a direção do rompimento.",
            "Evitar entrada no miolo enquanto score e fluxo estão mistos.",
          ];

  return {
    bias,
    headline,
    command,
    zones: [
      {
        label: "Base do plano",
        value: formatIndexLevel(leitura.aberturaProjetada),
        detail: `${leitura.vies}; fechamento usado: ${formatIndexLevel(leitura.fechamentoBase)}.`,
        tone: leitura.gapPontos,
      },
      {
        label: "Zona de decisão",
        value: `${formatIndexLevel(support)} - ${formatIndexLevel(resistance)}`,
        detail: `Faixa de ${currencyFormatter.format(decisionBand)} pts ao redor da abertura projetada.`,
        tone: 0,
      },
      {
        label: "Invalidação",
        value: invalidation.value,
        detail: invalidation.detail,
        tone: invalidation.tone,
      },
    ],
    pressure: [
      {
        label: "Driver dominante",
        value: dominantDriver
          ? `${dominantDriver.value > 0 ? "+" : ""}${dominantDriver.value.toFixed(2)}`
          : "--",
        detail: dominantDriver?.text ?? "Sem driver principal carregado.",
        tone: dominantDriver?.value ?? 0,
      },
      {
        label: "EUA + EWZ",
        value: formatPercent(externalPressure),
        detail: "Apetite externo que costuma guiar a abertura do índice.",
        tone: externalPressure,
      },
      {
        label: "Câmbio / DI / VIX",
        value: formatPercent(fearPressure),
        detail: `USD/BRL ${formatPercent(marketData.usdbrl)}; DI ${formatBps(marketData.di)}; VIX ${formatPercent(marketData.vix)}.`,
        tone: fearPressure,
      },
      {
        label: "IBOV pesado",
        value: formatPercent(localPressure),
        detail: `PETR4, VALE3 e bancos; bancos sozinhos: ${formatPercent(bankPressure)}.`,
        tone: localPressure,
      },
      {
        label: "Catalisador",
        value: highImpact ? highImpact.hora : "Sem alto",
        detail: highImpact?.titulo ?? "Eventos ficam como risco de horário, não como painel principal.",
        tone: highImpact ? -1 : 0,
      },
    ],
    triggers,
    riskEvents: eventRisk,
  };
}

function buildTacticalBrief(
  leitura: {
    score: number;
    gapPontos: number;
    sentimento: string;
    confianca: string;
    vies: string;
  },
  drivers: DriverItem[],
  marketData: MarketData,
  calendar: CalendarEvent[]
): TacticalBrief {
  const highImpact = calendar.find((event) => normalizeImpact(event.impacto) === "ALTO");
  const dominantDriver = [...drivers].sort(
    (first, second) => Math.abs(second.value) - Math.abs(first.value)
  )[0];
  const watchlist = marketLabels
    .filter((item) => item.key !== "win")
    .map((item) => ({
      label: item.name,
      value: marketData[item.key],
      desc: item.desc,
    }))
    .sort((first, second) => Math.abs(second.value) - Math.abs(first.value))
    .slice(0, 4);

  if (leitura.score >= 70) {
    return {
      regime: "Risk-on com disciplina",
      detail: `${leitura.vies}. ${dominantDriver?.label ?? "Drivers"} lidera a leitura, com confiança ${leitura.confianca.toLowerCase()}.`,
      stance: "Priorizar compras após confirmação",
      riskLine: "Perde força se dólar/VIX virarem contra",
      catalyst: highImpact ? `${highImpact.hora} ${highImpact.pais ?? "GLOBAL"}` : "Sem evento alto no topo",
      watchlist,
    };
  }

  if (leitura.score <= 40) {
    return {
      regime: "Risk-off defensivo",
      detail: `${leitura.vies}. O radar favorece proteção de caixa e entradas menores até o preço confirmar.`,
      stance: "Evitar compra por impulso",
      riskLine: "Só melhora com EWZ, EUA e bancos reagindo",
      catalyst: highImpact ? `${highImpact.hora} ${highImpact.pais ?? "GLOBAL"}` : "Sem evento alto no topo",
      watchlist,
    };
  }

  return {
    regime: "Mercado em confirmação",
    detail: `${leitura.vies}. O score está no miolo, então o plano depende mais da abertura real do que da projeção.`,
    stance: "Aguardar rompimento limpo",
    riskLine: "Evitar antecipar direção no ruído",
    catalyst: highImpact ? `${highImpact.hora} ${highImpact.pais ?? "GLOBAL"}` : "Sem evento alto no topo",
    watchlist,
  };
}

function getOperationalLevels(leitura: MarketReading) {
  const adaptiveBand = Math.round(Math.abs(leitura.gapPontos) * 0.45);
  const decisionBand = Math.max(300, Math.min(700, adaptiveBand || 350));

  return {
    decisionBand,
    support: leitura.aberturaProjetada - decisionBand,
    resistance: leitura.aberturaProjetada + decisionBand,
  };
}

function weightedContribution(value: number, max: number) {
  return Math.round(Math.max(-max, Math.min(max, (value / 2) * max)));
}

function getSaoPauloMinutes(date: Date) {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);

  return hour * 60 + minute;
}

function hasHighImpactWithin(calendar: CalendarEvent[], minutesAhead: number) {
  const nowMinutes = getSaoPauloMinutes(new Date());

  return calendar.some((event) => {
    if (normalizeImpact(event.impacto) !== "ALTO") {
      return false;
    }

    const [hour = "0", minute = "0"] = event.hora.split(":");
    const eventMinutes = Number(hour) * 60 + Number(minute);

    return eventMinutes >= nowMinutes && eventMinutes - nowMinutes <= minutesAhead;
  });
}

function normalizeImpact(impact: string) {
  return impact
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function normalizeDiPressure(value: number) {
  return Math.max(-2, Math.min(2, value / 4));
}

function formatPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatBps(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)} bps`;
}

function formatIndexLevel(value: number) {
  return currencyFormatter.format(Math.round(value));
}

function pressureBadgeClass(score: number) {
  if (score >= 25) {
    return "border-[#7ddc12]/50 bg-[#7ddc12]/10 text-[#b9ff6a]";
  }

  if (score <= -25) {
    return "border-red-400/50 bg-red-400/10 text-red-200";
  }

  return "border-[#c6a64f]/50 bg-[#c6a64f]/10 text-[#f4db8a]";
}

function toneClass(value: number) {
  if (value > 0) {
    return "text-emerald-300";
  }

  if (value < 0) {
    return "text-red-300";
  }

  return "text-zinc-100";
}

function barClass(value: number) {
  if (value > 0) {
    return "bg-[#7ddc12]";
  }

  if (value < 0) {
    return "bg-red-400";
  }

  return "bg-yellow-300";
}

function getDataQuality(source = "", error = ""): DataQuality {
  const normalized = source.toLowerCase();

  if (error) {
    return {
      label: "Erro",
      detail: "A última consulta falhou. Use a leitura com cautela até a próxima atualização.",
      tone: "danger",
    };
  }

  if (normalized.includes("sem referencia") || normalized.includes("fallback")) {
    return {
      label: "Fallback",
      detail: "A referência principal não respondeu e o radar está usando fonte alternativa.",
      tone: "warning",
    };
  }

  if (normalized.includes("parcial")) {
    return {
      label: "Parcial",
      detail: "Parte dos ativos não respondeu. O score segue disponível, mas com menor cobertura.",
      tone: "warning",
    };
  }

  return {
    label: "Online",
    detail: "Dados carregados com referência principal e atualização automática a cada minuto.",
    tone: "success",
  };
}

async function drawInstagramPost(
  ctx: CanvasRenderingContext2D,
  {
    leitura,
    drivers,
    marketData,
    dataQuality,
  }: {
    leitura: {
      forcaAbertura: number;
      score: number;
      fechamentoBase: number;
      gapPontos: number;
      aberturaProjetada: number;
      sentimento: string;
      confianca: string;
      vies: string;
    };
    drivers: DriverItem[];
    marketData: MarketData;
    dataQuality: DataQuality;
  }
) {
  const width = 1080;
  const height = 1350;
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#050805");
  bg.addColorStop(0.52, "#11170d");
  bg.addColorStop(1, "#070a08");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  drawGlow(ctx, 170, 140, 280, "rgba(125, 220, 18, 0.24)");
  drawGlow(ctx, 920, 220, 240, "rgba(198, 166, 79, 0.18)");
  drawGlow(ctx, 760, 1120, 320, "rgba(125, 220, 18, 0.12)");

  ctx.strokeStyle = "rgba(125, 220, 18, 0.28)";
  ctx.lineWidth = 2;
  ctx.strokeRect(46, 46, width - 92, height - 92);

  ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
  roundedRect(ctx, 82, 82, width - 164, height - 164, 28, true, false);

  const logo = await loadCanvasImage("/frogman-logo.png");
  if (logo) {
    ctx.save();
    roundedRect(ctx, 820, 92, 130, 130, 16, false, true);
    ctx.clip();
    ctx.drawImage(logo, 820, 92, 130, 130);
    ctx.restore();
    ctx.strokeStyle = "rgba(125, 220, 18, 0.45)";
    ctx.lineWidth = 3;
    roundedRect(ctx, 820, 92, 130, 130, 16, false, true);
  }

  ctx.fillStyle = "#7ddc12";
  ctx.font = "900 28px Arial";
  ctx.fillText("FROGMAN MARKET RADAR", 110, 132);
  ctx.fillStyle = "#c6a64f";
  ctx.font = "800 22px Arial";
  ctx.fillText("B3 • PRE-ABERTURA • WIN", 110, 170);

  ctx.fillStyle = "#e8e4d7";
  ctx.font = "900 112px Arial";
  ctx.fillText(`${leitura.score}%`, 110, 330);
  ctx.fillStyle = leitura.score >= 70 ? "#b9ff6a" : leitura.score <= 40 ? "#f87171" : "#f4db8a";
  ctx.font = "900 42px Arial";
  ctx.fillText(leitura.sentimento.toUpperCase(), 110, 390);

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 54px Arial";
  wrapCanvasText(ctx, leitura.vies, 110, 478, 820, 62);

  ctx.fillStyle = "#a1a1aa";
  ctx.font = "600 28px Arial";
  wrapCanvasText(
    ctx,
    `Confiança ${leitura.confianca.toLowerCase()} com força estimada de ${formatPercent(leitura.forcaAbertura)}.`,
    110,
    585,
    820,
    38
  );

  drawMetricBox(ctx, 110, 690, "GAP PROJETADO", `${leitura.gapPontos > 0 ? "+" : ""}${currencyFormatter.format(leitura.gapPontos)} pts`, toneHex(leitura.gapPontos));
  drawMetricBox(ctx, 560, 690, "ABERTURA", currencyFormatter.format(leitura.aberturaProjetada), "#e8e4d7");

  ctx.fillStyle = "#7ddc12";
  ctx.font = "900 24px Arial";
  ctx.fillText("DRIVERS PRINCIPAIS", 110, 900);

  drivers.forEach((driver, index) => {
    const y = 960 + index * 74;
    ctx.strokeStyle = "rgba(125, 220, 18, 0.16)";
    ctx.beginPath();
    ctx.moveTo(110, y + 34);
    ctx.lineTo(940, y + 34);
    ctx.stroke();
    ctx.fillStyle = "#f4f4f5";
    ctx.font = "800 30px Arial";
    ctx.fillText(driver.label, 110, y);
    ctx.fillStyle = toneHex(driver.value);
    ctx.font = "900 30px Arial";
    ctx.fillText(`${driver.value > 0 ? "+" : ""}${driver.value.toFixed(2)}`, 800, y);
    ctx.fillStyle = "#a1a1aa";
    ctx.font = "500 22px Arial";
    wrapCanvasText(ctx, driver.text, 110, y + 34, 760, 28);
  });

  const footerGradient = ctx.createLinearGradient(110, 1194, 940, 1194);
  footerGradient.addColorStop(0, "rgba(125, 220, 18, 0)");
  footerGradient.addColorStop(0.35, "#7ddc12");
  footerGradient.addColorStop(0.65, "#c6a64f");
  footerGradient.addColorStop(1, "rgba(198, 166, 79, 0)");
  ctx.fillStyle = footerGradient;
  ctx.fillRect(110, 1194, 830, 3);

  ctx.fillStyle = "#c6a64f";
  ctx.font = "900 22px Arial";
  ctx.fillText("DISCIPLINA • GESTÃO • CONSISTÊNCIA", 110, 1248);
  ctx.fillStyle = "#71717a";
  ctx.font = "600 20px Arial";
  ctx.fillText(`Dados ${marketData.dadosEm || "--"} • Status ${dataQuality.label} • Não constitui recomendação.`, 110, 1288);
}

function drawMetricBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  value: string,
  color: string
) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.34)";
  roundedRect(ctx, x, y, 370, 128, 18, true, false);
  ctx.strokeStyle = "rgba(125, 220, 18, 0.18)";
  ctx.lineWidth = 2;
  roundedRect(ctx, x, y, 370, 128, 18, false, true);
  ctx.fillStyle = "#c6a64f";
  ctx.font = "900 20px Arial";
  ctx.fillText(label, x + 28, y + 42);
  ctx.fillStyle = color;
  ctx.font = "900 42px Arial";
  ctx.fillText(value, x + 28, y + 92);
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: boolean,
  stroke: boolean
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fill) {
    ctx.fill();
  }
  if (stroke) {
    ctx.stroke();
  }
}

function drawGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string
) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  });

  if (line) {
    ctx.fillText(line, x, currentY);
  }
}

function toneHex(value: number) {
  if (value > 0) {
    return "#b9ff6a";
  }

  if (value < 0) {
    return "#f87171";
  }

  return "#f4db8a";
}

function loadCanvasImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}
