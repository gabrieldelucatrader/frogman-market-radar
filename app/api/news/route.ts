import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type NewsImpact = "alto" | "medio" | "baixo";

type FeedSource = {
  name: string;
  url: string;
  category: string;
  priority: number;
};

type ParsedFeedItem = {
  title: string;
  link: string;
  description: string;
  source: string;
  publishedAt: Date;
  sourcePriority: number;
  fallbackCategory: string;
};

type NewsItem = {
  id: string;
  hora: string;
  titulo: string;
  impacto: NewsImpact;
  categoria: string;
  ticker?: string;
  fonte: string;
  url: string;
  publicadoEm: string;
  resumo?: string;
  score: number;
};

const saoPauloTimeZone = "America/Sao_Paulo";
const maxFeedItems = 18;
const requestTimeoutMs = 6500;

const feedSources: FeedSource[] = [
  {
    name: "FinancialJuice",
    url: "https://www.financialjuice.com/feed.ashx?xy=rss",
    category: "MACRO",
    priority: 5,
  },
  {
    name: "Google News B3",
    url: "https://news.google.com/rss/search?q=Ibovespa%20OR%20B3%20OR%20Petrobras%20OR%20VALE3%20OR%20%22Vale%20S.A.%22%20when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    category: "B3",
    priority: 4,
  },
  {
    name: "Google News Macro",
    url: "https://news.google.com/rss/search?q=Selic%20OR%20IPCA%20OR%20Copom%20OR%20dolar%20OR%20juros%20when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    category: "MACRO",
    priority: 4,
  },
  {
    name: "Google News Exterior",
    url: "https://news.google.com/rss/search?q=Fed%20OR%20FOMC%20OR%20S%26P%20500%20OR%20Nasdaq%20OR%20oil%20OR%20China%20when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    category: "EXTERIOR",
    priority: 3,
  },
];

const tickerKeywords: Array<{ ticker: string; words: string[] }> = [
  { ticker: "PETR4", words: ["PETR4", "PETR3", "PETROBRAS", "PETROLEO", "BRENT", "OIL"] },
  { ticker: "VALE3", words: ["VALE3", "VALE S.A", "VALE SA", "MINERIO", "IRON ORE"] },
  { ticker: "ITUB4", words: ["ITUB4", "ITAU"] },
  { ticker: "BBDC4", words: ["BBDC4", "BRADESCO"] },
  { ticker: "BBAS3", words: ["BBAS3", "BANCO DO BRASIL"] },
  { ticker: "B3SA3", words: ["B3SA3", "B3"] },
  { ticker: "IBOV", words: ["IBOV", "IBOVESPA", "BOVESPA", "WIN", "INDICE"] },
  { ticker: "USD/BRL", words: ["USD/BRL", "DOLAR", "CAMBIO"] },
  { ticker: "DI", words: ["JUROS", "SELIC", "COPOM", "DI FUTURO", "TREASURY"] },
  { ticker: "EWZ", words: ["EWZ"] },
  { ticker: "SPX", words: ["S&P", "S&P 500", "SP500", "SPX"] },
  { ticker: "NDX", words: ["NASDAQ", "NDX"] },
];

const highImpactTerms = [
  "FED",
  "FOMC",
  "POWELL",
  "COPOM",
  "SELIC",
  "IPCA",
  "PAYROLL",
  "CPI",
  "PCE",
  "GDP",
  "PIB",
  "TREASURY",
  "DOLAR",
  "USD",
  "OIL",
  "BRENT",
  "PETROBRAS",
  "VALE3",
  "CHINA",
  "GUERRA",
  "TARIFA",
  "BALANCO",
  "LUCRO",
  "GUIDANCE",
  "REBAIXA",
  "RATING",
];

const mediumImpactTerms = [
  "IBOV",
  "IBOVESPA",
  "B3",
  "BANCOS",
  "VIX",
  "NASDAQ",
  "S&P",
  "FLUXO",
  "ESTRANGEIRO",
  "DIVIDENDOS",
  "PROJECAO",
  "EBITDA",
  "RESULTADO",
];

const fallbackNoticias: NewsItem[] = [
  {
    id: "fallback-financialjuice",
    hora: getTime(new Date()),
    titulo: "FrogNews tentando reconectar ao FinancialJuice e feeds de mercado",
    impacto: "medio",
    categoria: "SISTEMA",
    fonte: "Frogman",
    url: "https://www.financialjuice.com/home",
    publicadoEm: new Date().toISOString(),
    resumo: "A mesa continua monitorando B3, exterior, dolar, juros, petroleo e China.",
    score: 4,
  },
  {
    id: "fallback-watchlist",
    hora: getTime(new Date()),
    titulo: "Watchlist do pregao: IBOV, USD/BRL, DI, PETR4, VALE3 e bancos",
    impacto: "baixo",
    categoria: "B3",
    fonte: "Frogman",
    url: "https://www.google.com/search?q=Ibovespa+B3+Petrobras+Vale+noticias",
    publicadoEm: new Date().toISOString(),
    resumo: "Use junto com calendario macro e leitura de fluxo antes de aumentar mao.",
    score: 2,
  },
];

export async function GET() {
  const settled = await Promise.allSettled(feedSources.map(fetchFeed));
  const parsedItems = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const errors = settled
    .map((result, index) =>
      result.status === "rejected" ? `${feedSources[index].name}: ${result.reason}` : ""
    )
    .filter(Boolean);

  const noticias = await normalizeFeedItems(parsedItems);
  const payloadItems = noticias.length > 0 ? noticias : fallbackNoticias;
  const response = NextResponse.json(
    {
      noticias: payloadItems,
      meta: {
        atualizadoEm: getTime(new Date()),
        live: noticias.length > 0,
        total: payloadItems.length,
        fontes: getActiveSources(payloadItems),
        erros: errors.slice(0, 3),
      },
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );

  return response;
}

async function fetchFeed(source: FeedSource): Promise<ParsedFeedItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(source.url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml, */*",
        "User-Agent": "Mozilla/5.0 FrogmanMarketRadar/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const xml = await response.text();

    if (!/<(rss|feed|item|entry)[\s>]/i.test(xml)) {
      throw new Error("feed indisponivel");
    }

    return parseFeed(xml, source);
  } finally {
    clearTimeout(timeout);
  }
}

function parseFeed(xml: string, source: FeedSource): ParsedFeedItem[] {
  const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];

  return itemMatches
    .slice(0, maxFeedItems)
    .map((itemXml) => {
      const title = cleanText(readTag(itemXml, "title"));
      const link = readTag(itemXml, "link") || readAtomLink(itemXml) || source.url;
      const description = cleanText(readTag(itemXml, "description") || readTag(itemXml, "summary"));
      const sourceTag = cleanText(readTag(itemXml, "source"));
      const publishedRaw =
        readTag(itemXml, "pubDate") || readTag(itemXml, "published") || readTag(itemXml, "updated");
      const publishedAt = Number.isNaN(Date.parse(publishedRaw)) ? new Date() : new Date(publishedRaw);

      return {
        title,
        link: decodeHtml(link),
        description,
        source: sourceTag || source.name,
        publishedAt,
        sourcePriority: source.priority,
        fallbackCategory: source.category,
      };
    })
    .filter((item) => item.title.length > 0);
}

async function normalizeFeedItems(items: ParsedFeedItem[]): Promise<NewsItem[]> {
  const seen = new Set<string>();
  const translatedItems = await Promise.all(
    items.map(async (item) => {
      const translatedTitle = isLikelyEnglish(item.title, item.source)
        ? await translateHeadlineToPortuguese(item.title)
        : item.title;
      const translatedDescription =
        item.description && isLikelyEnglish(item.description, item.source)
          ? localMarketTranslation(item.description)
          : item.description;

      return {
        ...item,
        title: stripSourcePrefix(translatedTitle, item.source),
        description: translatedDescription,
        originalTitle: item.title,
      };
    })
  );

  return translatedItems
    .map((item) => {
      const normalizedTitle = normalizeText(`${item.title} ${item.originalTitle}`);
      const ticker = detectTicker(normalizedTitle);
      const categoria = detectCategory(normalizedTitle, item.fallbackCategory);
      const impacto = detectImpact(normalizedTitle);
      const score = scoreNews(item, normalizedTitle, impacto, ticker);
      const id = createNewsId(item.title, item.publishedAt);

      return {
        id,
        hora: getTime(item.publishedAt),
        titulo: item.title,
        impacto,
        categoria,
        ticker,
        fonte: item.source,
        url: item.link,
        publicadoEm: item.publishedAt.toISOString(),
        resumo: item.description || buildSummary(categoria, ticker, impacto),
        score,
      };
    })
    .filter((item) => isMarketRelevant(`${item.titulo} ${item.resumo ?? ""}`, item.fonte))
    .filter((item) => {
      const key = normalizeText(item.titulo).slice(0, 120);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const scoreDelta = b.score - a.score;

      if (Math.abs(scoreDelta) >= 2) {
        return scoreDelta;
      }

      return new Date(b.publicadoEm).getTime() - new Date(a.publicadoEm).getTime();
    })
    .slice(0, 14);
}

function readTag(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));

  return match?.[1] ?? "";
}

function readAtomLink(xml: string) {
  const hrefMatch = xml.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i);

  return hrefMatch?.[1] ?? "";
}

function cleanText(value: string) {
  return decodeHtml(decodeHtml(value))
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isLikelyEnglish(value: string, source: string) {
  const normalized = normalizeText(`${source} ${value}`);

  if (normalized.includes("FINANCIALJUICE")) {
    return true;
  }

  const englishTerms = ["THE ", "FED", "TREASURY", "STOCKS", "MARKET", "OIL", "SAYS", "DATA", "RATE"];
  const portugueseTerms = [" QUE ", " COM ", " PARA ", "JUROS", "DOLAR", "PETROLEO", "MERCADO"];

  return (
    englishTerms.filter((term) => normalized.includes(term)).length >
    portugueseTerms.filter((term) => normalized.includes(term)).length
  );
}

async function translateHeadlineToPortuguese(title: string) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt&dt=t&q=${encodeURIComponent(title)}`,
      {
        cache: "no-store",
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 FrogmanMarketRadar/1.0",
        },
      }
    );
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as Array<Array<Array<string>>>;
    const translated = data[0]?.map((part) => part[0]).join("").trim();

    return translated || localMarketTranslation(title);
  } catch {
    return localMarketTranslation(title);
  }
}

function localMarketTranslation(title: string) {
  const replacements: Array<[RegExp, string]> = [
    [/\bbreaking\b/gi, "urgente"],
    [/\bstocks\b/gi, "bolsas"],
    [/\bmarket\b/gi, "mercado"],
    [/\bmarkets\b/gi, "mercados"],
    [/\bfutures\b/gi, "futuros"],
    [/\bbonds\b/gi, "titulos"],
    [/\byields\b/gi, "juros"],
    [/\byield\b/gi, "juro"],
    [/\brates\b/gi, "juros"],
    [/\brate\b/gi, "juro"],
    [/\btreasury\b/gi, "Treasury"],
    [/\boil\b/gi, "petroleo"],
    [/\bcrude\b/gi, "petroleo"],
    [/\bgold\b/gi, "ouro"],
    [/\bdollar\b/gi, "dolar"],
    [/\bgreenback\b/gi, "dolar"],
    [/\bfed\b/gi, "Fed"],
    [/\bfomc\b/gi, "FOMC"],
    [/\bcpi\b/gi, "CPI"],
    [/\bpce\b/gi, "PCE"],
    [/\bgdp\b/gi, "PIB"],
    [/\bpayrolls\b/gi, "payroll"],
    [/\bjobless claims\b/gi, "pedidos de seguro-desemprego"],
    [/\bchina\b/gi, "China"],
    [/\bus\b/gi, "EUA"],
    [/\bu\.s\./gi, "EUA"],
    [/\beurozone\b/gi, "zona do euro"],
    [/\bsays\b/gi, "diz"],
    [/\bsaid\b/gi, "disse"],
    [/\brises\b/gi, "sobe"],
    [/\brise\b/gi, "sobe"],
    [/\bgains\b/gi, "avanca"],
    [/\bgain\b/gi, "avanca"],
    [/\bjumps\b/gi, "salta"],
    [/\bfalls\b/gi, "cai"],
    [/\bfall\b/gi, "queda"],
    [/\bdrops\b/gi, "recua"],
    [/\bslips\b/gi, "perde forca"],
    [/\bafter\b/gi, "apos"],
    [/\bbefore\b/gi, "antes de"],
    [/\bahead of\b/gi, "antes de"],
    [/\bon\b/gi, "com"],
    [/\bas\b/gi, "enquanto"],
    [/\bdata\b/gi, "dados"],
    [/\binflation\b/gi, "inflacao"],
    [/\brecession\b/gi, "recessao"],
    [/\btrade\b/gi, "comercio"],
    [/\btariffs\b/gi, "tarifas"],
    [/\bearnings\b/gi, "resultados"],
    [/\bforecast\b/gi, "projecao"],
    [/\boutlook\b/gi, "perspectiva"],
  ];

  return replacements.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), title);
}

function stripSourcePrefix(title: string, source: string) {
  return title.replace(new RegExp(`^${escapeRegExp(source)}\\s*:\\s*`, "i"), "").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeHtml(value: string) {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity: string) => {
    const normalized = entity.toLowerCase();

    if (normalized.startsWith("#x")) {
      return String.fromCodePoint(Number.parseInt(normalized.slice(2), 16));
    }

    if (normalized.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(normalized.slice(1), 10));
    }

    return namedEntities[normalized] ?? `&${entity};`;
  });
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function detectTicker(normalizedTitle: string) {
  const explicitTicker = normalizedTitle.match(/\b[A-Z]{4}[0-9]{1,2}\b/)?.[0];

  if (explicitTicker) {
    return explicitTicker;
  }

  return tickerKeywords.find((item) => item.words.some((word) => normalizedTitle.includes(word)))?.ticker;
}

function detectCategory(normalizedTitle: string, fallback: string) {
  if (/(FED|FOMC|POWELL|COPOM|SELIC|IPCA|PAYROLL|CPI|PCE|PIB|GDP|JUROS|TREASURY)/.test(normalizedTitle)) {
    return "MACRO";
  }

  if (/(PETROBRAS|VALE3|VALE S\.A|ITAU|BRADESCO|BANCO DO BRASIL|BALANCO|LUCRO|EBITDA|DIVIDENDO|RATING)/.test(normalizedTitle)) {
    return "CORP";
  }

  if (/(DOLAR|USD\/BRL|CAMBIO|DXY|FOREX)/.test(normalizedTitle)) {
    return "CAMBIO";
  }

  if (/(PETROLEO|BRENT|OIL|MINERIO|COMMODIT)/.test(normalizedTitle)) {
    return "COMM";
  }

  if (/(BITCOIN|ETHEREUM|CRYPTO|CRIPTO)/.test(normalizedTitle)) {
    return "CRIPTO";
  }

  if (/(FLUXO|ESTRANGEIRO|VOLUME|LEILAO|MOC)/.test(normalizedTitle)) {
    return "FLUXO";
  }

  return fallback;
}

function detectImpact(normalizedTitle: string): NewsImpact {
  if (highImpactTerms.some((term) => normalizedTitle.includes(term))) {
    return "alto";
  }

  if (mediumImpactTerms.some((term) => normalizedTitle.includes(term))) {
    return "medio";
  }

  return "baixo";
}

function isMarketRelevant(text: string, source?: string) {
  const normalized = normalizeText(`${source ?? ""} ${text}`);

  if (normalized.includes("FINANCIALJUICE")) {
    return true;
  }

  const noiseTerms = [
    "CONCURSO",
    "EDITAL",
    "COPA DO MUNDO",
    "SELECAO",
    "TURISTICA",
    "TURISMO",
    "PREFEITURA",
    "CAMARA MUNICIPAL",
    "HOROSCOPO",
    "FUTEBOL",
    "NOVELA",
  ];
  const marketTerms = [
    "IBOV",
    "IBOVESPA",
    "B3",
    "BOLSA",
    "ACAO",
    "ACOES",
    "PETROBRAS",
    "PETR4",
    "PETR3",
    "VALE3",
    "VALE S.A",
    "MINERIO",
    "ITAU",
    "ITUB4",
    "BRADESCO",
    "BBDC4",
    "BBAS3",
    "SELIC",
    "IPCA",
    "COPOM",
    "FED",
    "FOMC",
    "DOLAR",
    "CAMBIO",
    "JUROS",
    "S&P",
    "NASDAQ",
    "BRENT",
    "PETROLEO",
    "RESULTADO",
    "LUCRO",
    "EBITDA",
    "DIVIDENDO",
    "INVESTIDOR",
    "ESTRANGEIRO",
    "RATING",
    "REBAIXA",
    "ECONOMIA",
    "MERCADO",
  ];

  if (noiseTerms.some((term) => normalized.includes(term))) {
    return marketTerms.some((term) => normalized.includes(term));
  }

  if (/\bVALE\b/.test(normalized) && !/(VALE3|VALE S\.A|MINERIO|BOLSA|ACOES|B3)/.test(normalized)) {
    return false;
  }

  return marketTerms.some((term) => normalized.includes(term));
}

function scoreNews(item: ParsedFeedItem, normalizedTitle: string, impact: NewsImpact, ticker?: string) {
  const ageMinutes = Math.max(0, (Date.now() - item.publishedAt.getTime()) / 60000);
  const recencyScore = ageMinutes <= 30 ? 4 : ageMinutes <= 120 ? 3 : ageMinutes <= 360 ? 2 : 0;
  const impactScore = impact === "alto" ? 5 : impact === "medio" ? 3 : 1;
  const tickerScore = ticker ? 2 : 0;
  const localScore = /(IBOV|IBOVESPA|B3|PETROBRAS|VALE3|DOLAR|SELIC|COPOM)/.test(normalizedTitle) ? 2 : 0;

  return item.sourcePriority + recencyScore + impactScore + tickerScore + localScore;
}

function buildSummary(category: string, ticker: string | undefined, impact: NewsImpact) {
  const focus = ticker ? `${ticker} no radar` : `${category} no radar`;

  return impact === "alto"
    ? `${focus}; pode alterar preco, volatilidade ou fluxo do indice.`
    : `${focus}; acompanhar confirmacao no tape e nos drivers.`;
}

function createNewsId(title: string, publishedAt: Date) {
  const slug = normalizeText(title)
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);

  return `${publishedAt.getTime()}-${slug}`;
}

function getTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: saoPauloTimeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getActiveSources(items: NewsItem[]) {
  return Array.from(new Set(items.map((item) => item.fonte))).slice(0, 6);
}
