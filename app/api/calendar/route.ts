import { NextResponse } from "next/server";

type ForexFactoryEvent = {
  title: string;
  country: string;
  date: string;
  impact: "High" | "Medium" | "Low" | "Holiday" | string;
  forecast?: string;
  previous?: string;
};

type CalendarEvent = {
  data?: string;
  hora: string;
  pais: string;
  titulo: string;
  impacto: "ALTO" | "MEDIO" | "BAIXO";
  previsto?: string;
  anterior?: string;
  categoria?: string;
  motivo?: string;
  relevancia?: number;
};

type InvestingCalendarResponse = {
  data?: string;
};

const forexFactoryCalendarUrl = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";
const investingCalendarPageUrl = "https://www.investing.com/economic-calendar/";
const investingCalendarUrl =
  "https://www.investing.com/economic-calendar/Service/getCalendarFilteredData";
const saoPauloTimeZone = "America/Sao_Paulo";
const priorityCountries = new Set(["USD", "EUR", "GBP", "CAD", "JPY", "CNY", "AUD", "BRL"]);
const directMiniIndexCountries = new Set(["USD", "BRL", "CNY"]);
const investingCountryIds = ["5", "32", "37", "72", "22", "17", "25", "4", "35"];

const fallbackEventos = [
  {
    hora: "09:00",
    pais: "BRL",
    titulo: "Abertura do Mini Indice / Dolar Futuro",
    impacto: "ALTO",
    categoria: "B3",
    motivo: "Define o primeiro fluxo do WIN e do WDO.",
    relevancia: 10,
  },
  {
    hora: "10:00",
    pais: "BRL",
    titulo: "Abertura do mercado a vista B3",
    impacto: "ALTO",
    categoria: "B3",
    motivo: "Entrada de fluxo nas acoes que pesam no indice.",
    relevancia: 10,
  },
  {
    hora: "10:30",
    pais: "USD",
    titulo: "Dados dos EUA / petroleo quando houver",
    impacto: "MEDIO",
    categoria: "Exterior",
    motivo: "Pode mexer em S&P, Nasdaq, DXY, VIX e Petrobras.",
    relevancia: 7,
  },
  {
    hora: "14:00",
    pais: "USD",
    titulo: "Fed / FOMC / juros / leiloes do Tesouro dos EUA",
    impacto: "ALTO",
    categoria: "Juros/Fed",
    motivo: "Afeta juros globais, dolar, fluxo estrangeiro e apetite a risco.",
    relevancia: 10,
  },
  {
    hora: "17:00",
    pais: "BRL",
    titulo: "Ajustes finais e fechamento B3",
    impacto: "MEDIO",
    categoria: "B3",
    motivo: "Pode gerar ajuste de posicao no fim do pregao.",
    relevancia: 6,
  },
] satisfies CalendarEvent[];

function getDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: saoPauloTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getDisplayDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: saoPauloTimeZone,
    dateStyle: "short",
  }).format(date);
}

function getTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: saoPauloTimeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getUpdatedAt(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: saoPauloTimeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normalizeImpact(impact: string): CalendarEvent["impacto"] {
  const normalized = impact.toLowerCase();

  if (impact === "High" || normalized.includes("bull3") || normalized.includes("high")) {
    return "ALTO";
  }

  if (impact === "Medium" || normalized.includes("bull2") || normalized.includes("moderate")) {
    return "MEDIO";
  }

  return "BAIXO";
}

function compareImpact(a: string, b: string) {
  const score = { ALTO: 3, MEDIO: 2, BAIXO: 1 };

  return (score[b as keyof typeof score] ?? 0) - (score[a as keyof typeof score] ?? 0);
}

function normalizeText(value = "") {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function classifyMiniIndexImpact<T extends CalendarEvent>(event: T) {
  const title = normalizeText(event.titulo);
  let relevancia = directMiniIndexCountries.has(event.pais) ? 4 : 0;
  let categoria = "Fluxo";
  let motivo = "Pode afetar fluxo, dolar, juros ou apetite a risco no WIN.";

  const add = (points: number, nextCategory: string, nextReason: string) => {
    relevancia += points;
    categoria = nextCategory;
    motivo = nextReason;
  };

  if (event.pais === "BRL") {
    relevancia += 2;
    categoria = "Brasil/B3";
    motivo = "Impacta juros locais, curva DI, bancos, Petrobras, Vale ou fluxo da B3.";
  }

  if (
    /\b(fed|fomc|powell|interest rate|rate decision|rate statement|dot plot|beige book|treasury|2-year|5-year|7-year|10-year|30-year|auction|yield)\b/.test(
      title
    )
  ) {
    add(5, "Juros/Fed", "Afeta juros globais, dolar, VIX e fluxo estrangeiro para bolsa.");
  }

  if (/\b(cpi|pce|ppi|inflation|ipca|igp|deflator|consumer prices)\b/.test(title)) {
    add(5, "Inflacao", "Mexe em expectativa de juros, dolar e precificacao de risco.");
  }

  if (/\b(nonfarm|payroll|nfp|employment|unemployment|jobless|adp|jolts|caged|wage)\b/.test(title)) {
    add(4, "Emprego", "Dado forte dos EUA muda Fed, S&P, Nasdaq, DXY e VIX.");
  }

  if (/\b(retail sales|gdp|pmi|ism|industrial production|durable goods|consumer confidence|sentiment)\b/.test(title)) {
    add(3, "Atividade", "Altera leitura de crescimento e apetite a risco no exterior.");
  }

  if (/\b(china|caixin|trade balance|exports|imports|manufacturing)\b/.test(title) && event.pais === "CNY") {
    add(4, "China/Commodities", "Impacta minerio, Vale e fluxo para emergentes.");
  }

  if (/\b(oil|crude|petroleum|eia|api weekly crude|inventories)\b/.test(title)) {
    add(3, "Petroleo", "Pode mexer em Petrobras e no humor do indice.");
  }

  if (/\b(copom|selic|bcb|banco central|fiscal|tax|primary budget|public debt|current account)\b/.test(title)) {
    add(5, "Brasil/Juros", "Impacta DI, bancos, dolar local e fluxo de estrangeiro.");
  }

  if (/\b(speaks|speech|testifies|testimony)\b/.test(title)) {
    if (/\b(fed|powell|fomc|bcb|banco central)\b/.test(title) || event.pais === "USD" || event.pais === "BRL") {
      add(3, "Autoridade monetaria", "Fala pode mudar expectativa de juros e risco.");
    } else {
      relevancia -= 2;
    }
  }

  const keep =
    directMiniIndexCountries.has(event.pais)
      ? relevancia >= 6
      : event.impacto === "ALTO" && relevancia >= 6;

  return {
    keep,
    event: {
      ...event,
      impacto: relevancia >= 9 || (event.impacto === "ALTO" && relevancia >= 7) ? "ALTO" : "MEDIO",
      categoria,
      motivo,
      relevancia,
    } as T & CalendarEvent,
  };
}

function filterMiniIndexEvents(events: CalendarEvent[]) {
  return events
    .map((event) => classifyMiniIndexImpact(event))
    .filter((item) => item.keep)
    .map((item) => item.event);
}

function cleanHtml(value = "") {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function getCell(row: string, className: string) {
  const match = row.match(
    new RegExp(`<td[^>]*class="[^"]*${className}[^"]*"[^>]*>([\\s\\S]*?)<\\/td>`, "i")
  );

  return cleanHtml(match?.[1]);
}

function parseInvestingRows(html = "") {
  const rows = html.match(/<tr[^>]*js-event-item[\s\S]*?<\/tr>/gi) ?? [];

  return rows
    .map((row) => {
      const dateTime = row.match(/data-event-datetime="([^"]+)"/i)?.[1] ?? "";
      const timestamp = Date.parse(dateTime.replace(/\//g, "-").replace(" ", "T"));
      const currency = row.match(/<td class="left flagCur noWrap">[\s\S]*?<\/span>\s*([A-Z]{3})/i)
        ?.[1];
      const sentiment =
        row.match(/<td[^>]*class="[^"]*sentiment[^"]*"[^>]*data-img_key="([^"]+)"/i)?.[1] ??
        "";
      const title = getCell(row, "event");

      return {
        date: Number.isNaN(timestamp) ? 0 : timestamp,
        data: dateTime ? dateTime.slice(0, 10).replace(/\//g, "-") : undefined,
        hora: getCell(row, "time") || "--:--",
        pais: currency ?? "--",
        titulo: title.replace(/^Click to view more info on\s+/i, ""),
        impacto: normalizeImpact(sentiment),
        previsto: getCell(row, "fore") || "-",
        anterior: getCell(row, "prev") || "-",
      };
    })
    .filter((event) => event.titulo)
    .filter((event) => event.impacto !== "BAIXO")
    .filter((event) => priorityCountries.has(event.pais))
    .map((event) => classifyMiniIndexImpact(event))
    .filter((item) => item.keep)
    .map((item) => item.event)
    .sort((a, b) => {
      const timeDiff = a.date - b.date;

      return timeDiff === 0 ? compareImpact(a.impacto, b.impacto) : timeDiff;
    });
}

async function getInvestingCookieHeader() {
  const response = await fetch(investingCalendarPageUrl, {
    cache: "no-store",
    headers: {
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,pt-BR;q=0.8,pt;q=0.7",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    },
  });
  const setCookie = response.headers.getSetCookie?.() ?? [];

  return setCookie.map((cookie) => cookie.split(";")[0]).join("; ");
}

async function getInvestingCalendar(today: Date) {
  const todayKey = getDateKey(today);
  const params = new URLSearchParams({
    dateFrom: todayKey,
    dateTo: todayKey,
    timeZone: "12",
    timeFilter: "timeRemain",
    currentTab: "today",
    limit_from: "0",
  });

  investingCountryIds.forEach((country) => params.append("country[]", country));
  ["2", "3"].forEach((importance) => params.append("importance[]", importance));
  const cookieHeader = await getInvestingCookieHeader();

  const response = await fetch(investingCalendarUrl, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Accept": "application/json, text/javascript, */*; q=0.01",
      "Accept-Language": "en-US,en;q=0.9,pt-BR;q=0.8,pt;q=0.7",
      "Content-Type": "application/x-www-form-urlencoded",
      ...(cookieHeader ? { "Cookie": cookieHeader } : {}),
      "Origin": "https://www.investing.com",
      "Referer": "https://www.investing.com/economic-calendar/",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error("Investing indisponível");
  }

  const data = (await response.json()) as InvestingCalendarResponse;
  const eventos = parseInvestingRows(data.data);

  if (eventos.length === 0) {
    throw new Error("Investing sem eventos relevantes hoje");
  }

  return eventos;
}

async function getForexFactoryCalendar(today: Date) {
  const todayKey = getDateKey(today);
  const response = await fetch(forexFactoryCalendarUrl, {
    cache: "no-store",
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error("Calendário externo indisponível");
  }

  const data = (await response.json()) as ForexFactoryEvent[];

  return data
    .map((event) => {
      const date = new Date(event.date);

      return {
        date,
        data: getDateKey(date),
        hora: getTime(date),
        pais: event.country,
        titulo: event.title,
        impacto: normalizeImpact(event.impact),
        previsto: event.forecast || "-",
        anterior: event.previous || "-",
      };
    })
    .filter((event) => event.data === todayKey)
    .filter((event) => event.impacto !== "BAIXO")
    .filter((event) => priorityCountries.has(event.pais))
    .map((event) => classifyMiniIndexImpact(event))
    .filter((item) => item.keep)
    .map((item) => item.event)
    .sort((a, b) => {
      const timeDiff = a.date.getTime() - b.date.getTime();

      return timeDiff === 0 ? compareImpact(a.impacto, b.impacto) : timeDiff;
    })
    .map((event) => ({
      data: event.data,
      hora: event.hora,
      pais: event.pais,
      titulo: event.titulo,
      impacto: event.impacto,
      previsto: event.previsto,
      anterior: event.anterior,
      categoria: event.categoria,
      motivo: event.motivo,
      relevancia: event.relevancia,
    }));
}

export async function GET() {
  const today = new Date();
  const baseResponse = {
    data: getDisplayDate(today),
    atualizadoEm: getUpdatedAt(today),
  };

  try {
    return NextResponse.json({
      ...baseResponse,
      fonte: "Investing",
      eventos: await getInvestingCalendar(today),
    });
  } catch {
    try {
      const eventos = await getForexFactoryCalendar(today);
      const hasExternalEvents = eventos.length > 0;

      return NextResponse.json({
        ...baseResponse,
        fonte: hasExternalEvents ? "ForexFactory WIN fallback" : "Agenda WIN local",
        eventos: hasExternalEvents ? eventos : filterMiniIndexEvents(fallbackEventos),
      });
    } catch {
      return NextResponse.json({
        ...baseResponse,
        fonte: "Agenda WIN local",
        eventos: filterMiniIndexEvents(fallbackEventos),
      });
    }
  }
}
