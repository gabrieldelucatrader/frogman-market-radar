import { NextResponse } from "next/server";

type Region = "ASIA" | "EUROPA" | "ESTADOS UNIDOS" | "COMMODITIES" | "CRIPTO" | "DRIVERS";

type AssetDefinition = {
  id: string;
  name: string;
  symbol: string;
  region: Region;
  description: string;
  precision: number;
};

type YahooChart = {
  chart?: {
    result?: Array<{
      meta?: {
        currency?: string;
        exchangeTimezoneName?: string;
        marketState?: string;
        previousClose?: number;
        chartPreviousClose?: number;
        regularMarketPrice?: number;
        regularMarketTime?: number;
        regularMarketDayHigh?: number;
        regularMarketDayLow?: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
        }>;
      };
    }>;
  };
};

type ForexFactoryEvent = {
  title?: string;
  country?: string;
  date?: string;
  impact?: string;
  forecast?: string;
  previous?: string;
};

type InternationalAsset = AssetDefinition & {
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

const saoPauloTimeZone = "America/Sao_Paulo";

const assets: AssetDefinition[] = [
  { id: "aus200", name: "AUS200", symbol: "^AXJO", region: "ASIA", description: "Bolsa australiana", precision: 0 },
  { id: "jpn225", name: "JPN225", symbol: "^N225", region: "ASIA", description: "Nikkei 225", precision: 0 },
  { id: "hk50", name: "HK50", symbol: "^HSI", region: "ASIA", description: "Hang Seng", precision: 0 },
  { id: "cn50", name: "CN50", symbol: "000001.SS", region: "ASIA", description: "China / Xangai (proxy)", precision: 0 },
  { id: "audusd", name: "AUD/USD", symbol: "AUDUSD=X", region: "ASIA", description: "Dólar australiano", precision: 5 },
  { id: "usdjpy", name: "USD/JPY", symbol: "JPY=X", region: "ASIA", description: "Dólar contra iene", precision: 3 },
  { id: "gbpjpy", name: "GBP/JPY", symbol: "GBPJPY=X", region: "ASIA", description: "Libra contra iene", precision: 3 },
  { id: "usdcnh", name: "USD/CNH", symbol: "CNH=X", region: "ASIA", description: "Dólar contra yuan offshore", precision: 4 },

  { id: "ger40", name: "GER40", symbol: "^GDAXI", region: "EUROPA", description: "DAX alemão", precision: 0 },
  { id: "uk100", name: "UK100", symbol: "^FTSE", region: "EUROPA", description: "FTSE 100", precision: 0 },
  { id: "eustx50", name: "EUSTX50", symbol: "^STOXX50E", region: "EUROPA", description: "Euro Stoxx 50", precision: 0 },
  { id: "fra40", name: "FRA40", symbol: "^FCHI", region: "EUROPA", description: "CAC 40 francês", precision: 0 },
  { id: "eurusd", name: "EUR/USD", symbol: "EURUSD=X", region: "EUROPA", description: "Euro contra dólar", precision: 5 },
  { id: "gbpusd", name: "GBP/USD", symbol: "GBPUSD=X", region: "EUROPA", description: "Libra contra dólar", precision: 5 },
  { id: "eurgbp", name: "EUR/GBP", symbol: "EURGBP=X", region: "EUROPA", description: "Euro contra libra", precision: 5 },

  { id: "nas100", name: "NAS100", symbol: "NQ=F", region: "ESTADOS UNIDOS", description: "Nasdaq 100 futuro", precision: 0 },
  { id: "us500", name: "US500", symbol: "ES=F", region: "ESTADOS UNIDOS", description: "S&P 500 futuro", precision: 0 },
  { id: "us30", name: "US30", symbol: "YM=F", region: "ESTADOS UNIDOS", description: "Dow Jones futuro", precision: 0 },
  { id: "vix", name: "VIX", symbol: "^VIX", region: "ESTADOS UNIDOS", description: "Volatilidade esperada do S&P 500", precision: 2 },
  { id: "usdcad", name: "USD/CAD", symbol: "CAD=X", region: "ESTADOS UNIDOS", description: "Dólar contra dólar canadense", precision: 5 },

  { id: "xauusd", name: "XAU/USD", symbol: "GC=F", region: "COMMODITIES", description: "Ouro futuro (proxy)", precision: 2 },
  { id: "xagusd", name: "XAG/USD", symbol: "SI=F", region: "COMMODITIES", description: "Prata futura (proxy)", precision: 3 },
  { id: "usoil", name: "USOIL", symbol: "CL=F", region: "COMMODITIES", description: "Petróleo WTI futuro", precision: 2 },
  { id: "ukoil", name: "UKOIL", symbol: "BZ=F", region: "COMMODITIES", description: "Petróleo Brent futuro", precision: 2 },
  { id: "natgas", name: "NATGAS", symbol: "NG=F", region: "COMMODITIES", description: "Gás natural futuro", precision: 3 },

  { id: "btcusd", name: "BTC/USD", symbol: "BTC-USD", region: "CRIPTO", description: "Bitcoin", precision: 0 },
  { id: "ethusd", name: "ETH/USD", symbol: "ETH-USD", region: "CRIPTO", description: "Ethereum", precision: 2 },
  { id: "solusd", name: "SOL/USD", symbol: "SOL-USD", region: "CRIPTO", description: "Solana", precision: 2 },
  { id: "xrpusd", name: "XRP/USD", symbol: "XRP-USD", region: "CRIPTO", description: "XRP", precision: 4 },

  { id: "dxy", name: "DXY", symbol: "DX-Y.NYB", region: "DRIVERS", description: "Força global do dólar", precision: 2 },
  { id: "us10y", name: "US10Y", symbol: "^TNX", region: "DRIVERS", description: "Treasury americano de 10 anos", precision: 3 },
];

const offlineAsset = (definition: AssetDefinition): InternationalAsset => ({
  ...definition,
  price: 0,
  previousClose: 0,
  changePercent: 0,
  momentum60m: 0,
  dayHigh: 0,
  dayLow: 0,
  rangePosition: 50,
  atrPercent: 0,
  marketState: "UNKNOWN",
  marketTime: "--",
  timestamp: 0,
  currency: "",
  source: "Yahoo Finance indisponível",
  quality: "offline",
});

function validNumbers(values?: Array<number | null>) {
  return (values ?? []).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

function formatTimestamp(timestamp?: number) {
  if (!timestamp) return "--";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: saoPauloTimeZone,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp * 1000));
}

function calculateAtrPercent(
  highs: Array<number | null> | undefined,
  lows: Array<number | null> | undefined,
  price: number
) {
  if (!highs || !lows || price <= 0) return 0;
  const ranges = highs
    .map((high, index) =>
      typeof high === "number" && typeof lows[index] === "number" ? high - (lows[index] as number) : null
    )
    .filter((value): value is number => typeof value === "number")
    .slice(-14);
  if (!ranges.length) return 0;
  return (ranges.reduce((sum, value) => sum + value, 0) / ranges.length / price) * 100;
}

async function fetchYahooAsset(definition: AssetDefinition): Promise<InternationalAsset> {
  const encoded = encodeURIComponent(definition.symbol);
  const urls = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?range=2d&interval=5m&includePrePost=true`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encoded}?range=2d&interval=5m&includePrePost=true`,
  ];
  let payload: YahooChart | undefined;

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: { "User-Agent": "Mozilla/5.0 FrogmanMarketRadar/2.0" },
        signal: AbortSignal.timeout(7000),
      });
      if (!response.ok) continue;
      payload = (await response.json()) as YahooChart;
      if (payload.chart?.result?.[0]?.meta) break;
    } catch {
      // Tenta o segundo host antes de marcar o ativo como indisponível.
    }
  }

  const result = payload?.chart?.result?.[0];
  const meta = result?.meta;
  const quote = result?.indicators?.quote?.[0];
  const closes = validNumbers(quote?.close);
  const highs = validNumbers(quote?.high);
  const lows = validNumbers(quote?.low);
  const timestamps = result?.timestamp ?? [];
  const price = meta?.regularMarketPrice ?? closes.at(-1) ?? 0;
  const previousClose = meta?.previousClose ?? meta?.chartPreviousClose ?? closes.at(-2) ?? price;

  if (!meta || price <= 0) return offlineAsset(definition);

  const lookbackClose = closes.length > 12 ? closes.at(-13) ?? price : closes.at(0) ?? price;
  const momentum60m = lookbackClose ? ((price - lookbackClose) / lookbackClose) * 100 : 0;
  const dayHigh = meta.regularMarketDayHigh ?? (highs.length ? Math.max(...highs.slice(-96)) : price);
  const dayLow = meta.regularMarketDayLow ?? (lows.length ? Math.min(...lows.slice(-96)) : price);
  const timestamp = meta.regularMarketTime ?? timestamps.at(-1) ?? 0;
  const ageSeconds = timestamp ? Math.max(0, Date.now() / 1000 - timestamp) : Number.POSITIVE_INFINITY;
  const quality = ageSeconds <= 300 ? "online" : "delayed";
  const marketState =
    meta.marketState && meta.marketState !== "UNKNOWN"
      ? meta.marketState
      : quality === "online"
        ? "ABERTO / INDICATIVO"
        : "FECHADO / ATRASADO";

  return {
    ...definition,
    price,
    previousClose,
    changePercent: previousClose ? ((price - previousClose) / previousClose) * 100 : 0,
    momentum60m,
    dayHigh,
    dayLow,
    rangePosition: dayHigh > dayLow ? ((price - dayLow) / (dayHigh - dayLow)) * 100 : 50,
    atrPercent: calculateAtrPercent(quote?.high, quote?.low, price),
    marketState,
    marketTime: formatTimestamp(timestamp),
    timestamp,
    currency: meta.currency ?? "",
    source: `Yahoo Finance · ${definition.symbol}`,
    quality,
  };
}

async function fetchAssets() {
  const result: InternationalAsset[] = [];
  const batchSize = 10;
  for (let index = 0; index < assets.length; index += batchSize) {
    const batch = assets.slice(index, index + batchSize);
    result.push(...(await Promise.all(batch.map(fetchYahooAsset))));
  }
  return result;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function calculatePulse(data: InternationalAsset[]) {
  const byId = Object.fromEntries(data.map((asset) => [asset.id, asset]));
  const norm = (id: string, scale = 1) => clamp((byId[id]?.changePercent ?? 0) / scale, -1, 1);
  const risk = Math.round(
    100 * (norm("us500", 1.2) * 0.32 + norm("nas100", 1.5) * 0.23 - norm("vix", 8) * 0.3 - norm("dxy", 0.8) * 0.15)
  );
  const dollar = Math.round(
    100 * (norm("dxy", 0.8) * 0.45 - norm("eurusd", 0.8) * 0.2 - norm("gbpusd", 0.8) * 0.15 - norm("audusd", 0.8) * 0.1 + norm("usdjpy", 0.8) * 0.1)
  );
  const volatility = Math.round(clamp(50 + (byId.vix?.changePercent ?? 0) * 4, 0, 100));
  const score = clamp(risk, -100, 100);
  const regime = score >= 45 ? "RISK-ON FORTE" : score >= 18 ? "RISK-ON" : score <= -45 ? "RISK-OFF FORTE" : score <= -18 ? "RISK-OFF" : "MERCADO MISTO";

  return {
    score,
    regime,
    risk,
    dollar: clamp(dollar, -100, 100),
    volatility,
    rates: byId.us10y?.price ?? 0,
    ratesChangeBps:
      byId.us10y?.price && byId.us10y.previousClose
        ? (byId.us10y.price - byId.us10y.previousClose) * 100
        : 0,
    summary:
      regime.includes("RISK-ON")
        ? "Índices e volatilidade apontam maior apetite por risco; confirme no ativo e na sessão."
        : regime.includes("RISK-OFF")
          ? "Proteção e volatilidade ganham peso; reduza confiança em compras sem confirmação."
          : "Os principais drivers divergem. Priorize níveis e confirmação antes da execução.",
  };
}

function getLocalClock(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "0";
  return {
    weekday: value("weekday"),
    hour: Number(value("hour")),
    minute: Number(value("minute")),
  };
}

function buildSessions() {
  const definitions = [
    { id: "sydney", name: "Sydney", timeZone: "Australia/Sydney", start: 8, end: 17, note: "AUS200 · AUD" },
    { id: "tokyo", name: "Tóquio", timeZone: "Asia/Tokyo", start: 8, end: 17, note: "JPN225 · JPY" },
    { id: "london", name: "Londres", timeZone: "Europe/London", start: 8, end: 17, note: "Europa · EUR · GBP" },
    { id: "newyork", name: "Nova York", timeZone: "America/New_York", start: 8, end: 17, note: "EUA · USD · índices" },
  ];

  return definitions.map((session) => {
    const clock = getLocalClock(session.timeZone);
    const minutes = clock.hour * 60 + clock.minute;
    const isWeekday = !["Sat", "Sun"].includes(clock.weekday);
    const open = isWeekday && minutes >= session.start * 60 && minutes < session.end * 60;
    return {
      ...session,
      open,
      localTime: `${String(clock.hour).padStart(2, "0")}:${String(clock.minute).padStart(2, "0")}`,
      status: open ? "ABERTA" : "FECHADA",
    };
  });
}

async function fetchMacroEvents() {
  try {
    const response = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", {
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
      headers: { "User-Agent": "Mozilla/5.0 FrogmanMarketRadar/2.0" },
    });
    if (!response.ok) return [];
    const events = (await response.json()) as ForexFactoryEvent[];
    const now = Date.now();
    const start = now - 2 * 60 * 60 * 1000;
    const end = now + 36 * 60 * 60 * 1000;
    return events
      .map((event) => ({ ...event, timestamp: event.date ? new Date(event.date).getTime() : 0 }))
      .filter((event) => event.timestamp >= start && event.timestamp <= end)
      .filter((event) => ["High", "Medium"].includes(event.impact ?? ""))
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, 12)
      .map((event) => ({
        title: event.title ?? "Evento econômico",
        currency: event.country ?? "GLOBAL",
        impact: (event.impact ?? "Medium").toUpperCase(),
        forecast: event.forecast ?? "--",
        previous: event.previous ?? "--",
        timestamp: event.timestamp,
        time: new Intl.DateTimeFormat("pt-BR", {
          timeZone: saoPauloTimeZone,
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(event.timestamp)),
      }));
  } catch {
    return [];
  }
}

function buildInsights(data: InternationalAsset[]) {
  const byId = Object.fromEntries(data.map((asset) => [asset.id, asset]));
  const insights: Array<{ title: string; detail: string; tone: "positive" | "negative" | "neutral" }> = [];
  const equities = ((byId.us500?.changePercent ?? 0) + (byId.nas100?.changePercent ?? 0)) / 2;
  const vix = byId.vix?.changePercent ?? 0;
  const dxy = byId.dxy?.changePercent ?? 0;
  const gold = byId.xauusd?.changePercent ?? 0;

  insights.push({
    title: "Bolsa x volatilidade",
    detail:
      equities > 0 && vix < 0
        ? "Índices sobem com VIX cedendo: movimento de risco está confirmado."
        : equities < 0 && vix > 0
          ? "Índices caem com VIX subindo: proteção domina o fluxo."
          : "Bolsa e VIX divergem; o movimento exige confirmação adicional.",
    tone: equities > 0 && vix < 0 ? "positive" : equities < 0 && vix > 0 ? "negative" : "neutral",
  });
  insights.push({
    title: "Dólar global",
    detail: dxy > 0.25 ? "DXY firme pressiona pares contra o dólar e pode limitar metais." : dxy < -0.25 ? "DXY perde força e alivia moedas, metais e ativos de risco." : "DXY perto do neutro; o driver cambial não domina.",
    tone: dxy > 0.25 ? "negative" : dxy < -0.25 ? "positive" : "neutral",
  });
  insights.push({
    title: "Proteção",
    detail:
      gold > 0 && equities < 0
        ? "Ouro sobe enquanto bolsas cedem: procura por proteção está presente."
        : gold > 0 && equities > 0
          ? "Ouro e bolsas sobem juntos: liquidez ou expectativa de juros pode estar dominando."
          : "Ouro não confirma uma busca forte por proteção neste momento.",
    tone: gold > 0 && equities < 0 ? "negative" : "neutral",
  });
  return insights;
}

export async function GET() {
  try {
    const [marketAssets, events] = await Promise.all([fetchAssets(), fetchMacroEvents()]);
    const online = marketAssets.filter((asset) => asset.quality === "online").length;
    const delayed = marketAssets.filter((asset) => asset.quality === "delayed").length;
    const offline = marketAssets.filter((asset) => asset.quality === "offline").length;

    return NextResponse.json({
      assets: marketAssets,
      pulse: calculatePulse(marketAssets),
      sessions: buildSessions(),
      events,
      insights: buildInsights(marketAssets),
      meta: {
        updatedAt: new Intl.DateTimeFormat("pt-BR", {
          timeZone: saoPauloTimeZone,
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(new Date()),
        refreshSeconds: 30,
        online,
        delayed,
        offline,
        source: "Yahoo Finance + calendário econômico",
        disclaimer: "Cotações indicativas. O preço de execução deve ser confirmado na corretora.",
      },
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar o radar internacional." }, { status: 500 });
  }
}
