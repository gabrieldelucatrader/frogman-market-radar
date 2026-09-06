import { NextResponse } from "next/server";

type YahooResult = {
  chart: {
    result: Array<{
      meta: {
        regularMarketPrice?: number;
        previousClose?: number;
        chartPreviousClose?: number;
        regularMarketTime?: number;
        exchangeTimezoneName?: string;
      };
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
        }>;
      };
    }> | null;
  };
};

type TradingViewScanResult = {
  data?: Array<{
    s: string;
    d: Array<string | number | null>;
  }>;
};

type TradingViewAsset = {
  symbol: string;
  price: number;
  previous: number;
  changePercent: number;
  changeAbs: number;
  marketTime: {
    timestamp: number;
    display: string;
  };
  ok: boolean;
};

const saoPauloTimeZone = "America/Sao_Paulo";

function formatMarketTime(timestamp?: number, timeZone = saoPauloTimeZone) {
  if (!timestamp) {
    return {
      timestamp: 0,
      display: "--",
    };
  }

  const date = new Date(timestamp * 1000);

  return {
    timestamp,
    display: new Intl.DateTimeFormat("pt-BR", {
      timeZone,
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date),
  };
}

function getPreviousCloseFromQuotes(data: YahooResult) {
  const closes = data.chart.result?.[0]?.indicators?.quote?.[0]?.close?.filter(
    (close): close is number => typeof close === "number"
  );

  if (!closes || closes.length < 2) {
    return undefined;
  }

  return closes[closes.length - 2];
}

type MarketAsset = Awaited<ReturnType<typeof getYahoo>>;

const fallbackAsset: MarketAsset = {
  symbol: "",
  price: 0,
  previous: 0,
  changePercent: 0,
  marketTime: {
    timestamp: 0,
    display: "--",
  },
};

function getCurrentMarketTime() {
  const now = new Date();

  return {
    timestamp: Math.floor(now.getTime() / 1000),
    display: new Intl.DateTimeFormat("pt-BR", {
      timeZone: saoPauloTimeZone,
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(now),
  };
}

async function getYahoo(symbol: string) {
  const encodedSymbol = encodeURIComponent(symbol);
  const urls = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodedSymbol}?range=2d&interval=1d`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodedSymbol}?range=2d&interval=1d`,
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodedSymbol}?range=5d&interval=1d`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodedSymbol}?range=5d&interval=1d`,
  ];

  let data: YahooResult | undefined;

  for (const url of urls) {
    const res = await fetch(url, { cache: "no-store" });

    if (res.ok) {
      data = (await res.json()) as YahooResult;

      if (data.chart.result?.[0]?.meta) {
        break;
      }
    }
  }

  const meta = data?.chart.result?.[0]?.meta;

  if (!data || !meta) {
    throw new Error(`Sem dados para ${symbol}`);
  }

  const price = meta.regularMarketPrice ?? 0;
  const previous =
    meta.previousClose ??
    getPreviousCloseFromQuotes(data) ??
    meta.chartPreviousClose ??
    price;

  const changePercent =
    previous !== 0 ? ((price - previous) / previous) * 100 : 0;
  const marketTime = formatMarketTime(
    meta.regularMarketTime,
    meta.exchangeTimezoneName
  );

  return {
    symbol,
    price,
    previous,
    changePercent,
    marketTime,
  };
}

async function getTradingViewIbov() {
  const response = await fetch("https://scanner.tradingview.com/brazil/scan", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      symbols: {
        tickers: ["BMFBOVESPA:IBOV"],
        query: {
          types: [],
        },
      },
      columns: ["name", "description", "close", "change", "change_abs", "prev_close"],
    }),
  });

  if (!response.ok) {
    throw new Error("TradingView não respondeu para IBOV");
  }

  const data = (await response.json()) as TradingViewScanResult;
  const row = data.data?.[0]?.d;
  const price = row?.[2];
  const changePercent = row?.[3];
  const changeAbs = row?.[4];
  const previous =
    typeof row?.[5] === "number"
      ? row[5]
      : typeof price === "number" && typeof changeAbs === "number"
        ? price - changeAbs
        : undefined;

  if (
    typeof price !== "number" ||
    typeof changePercent !== "number" ||
    typeof previous !== "number"
  ) {
    throw new Error("TradingView retornou IBOV sem preço válido");
  }

  return {
    symbol: "BMFBOVESPA:IBOV",
    price,
    previous,
    changePercent,
    marketTime: getCurrentMarketTime(),
  };
}

async function getTradingViewAsset(tickers: string[], fallbackSymbol: string): Promise<TradingViewAsset> {
  const response = await fetch("https://scanner.tradingview.com/brazil/scan", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      symbols: {
        tickers,
        query: {
          types: [],
        },
      },
      columns: ["name", "description", "close", "change", "change_abs", "prev_close"],
    }),
  });

  if (!response.ok) {
    throw new Error("TradingView não respondeu para ativo local");
  }

  const data = (await response.json()) as TradingViewScanResult;
  const row = data.data?.[0];
  const values = row?.d;
  const price = values?.[2];
  const changePercent = values?.[3];
  const changeAbs = values?.[4];
  const previous =
    typeof values?.[5] === "number"
      ? values[5]
      : typeof price === "number" && typeof changeAbs === "number"
        ? price - changeAbs
        : undefined;

  if (
    typeof price !== "number" ||
    typeof changePercent !== "number" ||
    typeof changeAbs !== "number" ||
    typeof previous !== "number"
  ) {
    throw new Error("TradingView retornou ativo local sem preço válido");
  }

  return {
    symbol: row?.s ?? fallbackSymbol,
    price,
    previous,
    changePercent,
    changeAbs,
    marketTime: getCurrentMarketTime(),
    ok: true,
  };
}

async function getDiReferencia() {
  try {
    const di = await getTradingViewAsset(
      ["BMFBOVESPA:DI1F2027", "BMFBOVESPA:DI1F27", "BMFBOVESPA:DI1F2028"],
      "DI1F2027"
    );

    return {
      diRate: di.price,
      diChange: di.changeAbs * 100,
      diFonte: di.symbol,
      diMarketTime: di.marketTime,
      ok: true,
    };
  } catch {
    const yahooSymbols = ["DI1F27.SA", "DI1F2027.SA", "DI1F28.SA", "DI1F2028.SA"];

    for (const symbol of yahooSymbols) {
      try {
        const di = await getYahoo(symbol);

        return {
          diRate: di.price,
          diChange: (di.price - di.previous) * 100,
          diFonte: symbol,
          diMarketTime: di.marketTime,
          ok: true,
        };
      } catch {
        // Tenta o proximo ticker de DI; fontes publicas variam o formato do contrato.
      }
    }

    return {
      diRate: 0,
      diChange: 0,
      diFonte: "DI indisponível",
      diMarketTime: fallbackAsset.marketTime,
      ok: false,
    };
  }
}

async function getWinReferencia() {
  try {
    const ibov = await getTradingViewIbov();

    return {
      winChange: ibov.changePercent,
      winFechamento: Math.round(ibov.previous),
      winAtual: Math.round(ibov.price),
      winFonte: "TradingView IBOV",
      winMarketTime: ibov.marketTime,
    };
  } catch {
    try {
      const win = await getYahoo("WINQ26.SA");

      return {
        winChange: win.changePercent,
        winFechamento: Math.round(win.previous),
        winAtual: Math.round(win.price),
        winFonte: "WINQ26",
        winMarketTime: win.marketTime,
      };
    } catch {
      try {
        const ibov = await getYahoo("^BVSP");

        return {
          winChange: ibov.changePercent,
          winFechamento: Math.round(ibov.previous),
          winAtual: Math.round(ibov.price),
          winFonte: "Yahoo IBOV fallback",
          winMarketTime: ibov.marketTime,
        };
      } catch {
        return {
          winChange: 0,
          winFechamento: 0,
          winAtual: 0,
          winFonte: "sem referencia online",
          winMarketTime: fallbackAsset.marketTime,
        };
      }
    }
  }
}

async function getYahooSafe(symbol: string) {
  try {
    return {
      ...(await getYahoo(symbol)),
      ok: true,
    };
  } catch {
    return {
      ...fallbackAsset,
      symbol,
      ok: false,
    };
  }
}

async function getYahooSafeBatch(symbols: string[], batchSize = 3) {
  const assets: Array<Awaited<ReturnType<typeof getYahooSafe>>> = [];

  for (let index = 0; index < symbols.length; index += batchSize) {
    const batch = symbols.slice(index, index + batchSize);
    const batchAssets = await Promise.all(batch.map((symbol) => getYahooSafe(symbol)));

    assets.push(...batchAssets);
  }

  return assets;
}

export async function GET() {
  try {
    const marketSymbols = [
      "EWZ",
      "ES=F",
      "NQ=F",
      "DX-Y.NYB",
      "^VIX",
      "BZ=F",
      "BRL=X",
      "PETR4.SA",
      "VALE3.SA",
      "ITUB4.SA",
      "BBDC4.SA",
      "BBAS3.SA",
    ];
    const [
      ewz,
      sp500,
      nasdaq,
      dxy,
      vix,
      brent,
      usdbrl,
      petr4,
      vale3,
      itub4,
      bbdc4,
      bbas3,
    ] = await getYahooSafeBatch(marketSymbols);
    const [winRef, diRef] = await Promise.all([getWinReferencia(), getDiReferencia()]);

    const offlineSymbols = [
      ewz,
      sp500,
      nasdaq,
      dxy,
      vix,
      brent,
      usdbrl,
      petr4,
      vale3,
      itub4,
      bbdc4,
      bbas3,
    ]
      .filter((asset) => !asset.ok)
      .map((asset) => asset.symbol);
    if (!diRef.ok) {
      offlineSymbols.push(diRef.diFonte);
    }
    const latestTimestamp = Math.max(
      ewz.marketTime.timestamp,
      sp500.marketTime.timestamp,
      nasdaq.marketTime.timestamp,
      dxy.marketTime.timestamp,
      vix.marketTime.timestamp,
      brent.marketTime.timestamp,
      usdbrl.marketTime.timestamp,
      petr4.marketTime.timestamp,
      vale3.marketTime.timestamp,
      itub4.marketTime.timestamp,
      bbdc4.marketTime.timestamp,
      bbas3.marketTime.timestamp,
      diRef.diMarketTime.timestamp,
      winRef.winMarketTime.timestamp
    );

    return NextResponse.json({
      ewz: ewz.changePercent,
      sp500: sp500.changePercent,
      nasdaq: nasdaq.changePercent,
      dxy: dxy.changePercent,
      vix: vix.changePercent,
      brent: brent.changePercent,
      usdbrl: usdbrl.changePercent,
      usdbrlPrice: usdbrl.price,
      petr4: petr4.changePercent,
      vale3: vale3.changePercent,
      itub4: itub4.changePercent,
      bbdc4: bbdc4.changePercent,
      bbas3: bbas3.changePercent,
      di: diRef.diChange,
      diRate: diRef.diRate,
      diFonte: diRef.diFonte,

      win: winRef.winChange,
      winFechamento: winRef.winFechamento,
      winAtual: winRef.winAtual,
      winFonte:
        offlineSymbols.length > 0
          ? `${winRef.winFonte} / parcial: ${offlineSymbols.join(", ")}`
          : winRef.winFonte,

      dadosEm: latestTimestamp
        ? formatMarketTime(latestTimestamp, saoPauloTimeZone).display
        : "--",
      atualizadoEm: new Intl.DateTimeFormat("pt-BR", {
        timeZone: saoPauloTimeZone,
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date()),
      assetTimes: {
        ewz: ewz.marketTime.display,
        sp500: sp500.marketTime.display,
        nasdaq: nasdaq.marketTime.display,
        dxy: dxy.marketTime.display,
        vix: vix.marketTime.display,
        brent: brent.marketTime.display,
        usdbrl: usdbrl.marketTime.display,
        petr4: petr4.marketTime.display,
        vale3: vale3.marketTime.display,
        itub4: itub4.marketTime.display,
        bbdc4: bbdc4.marketTime.display,
        bbas3: bbas3.marketTime.display,
        di: diRef.diMarketTime.display,
        win: winRef.winMarketTime.display,
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: "Erro ao buscar dados do mercado",
      },
      { status: 500 }
    );
  }
}
