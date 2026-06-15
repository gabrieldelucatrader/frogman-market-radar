import { NextResponse } from "next/server";

async function getChange(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1d&interval=5m`;

  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Erro ao buscar ${symbol}`);
  }

  const data = await response.json();
  const result = data?.chart?.result?.[0];
  const meta = result?.meta;

  const current = meta?.regularMarketPrice;
  const previous = meta?.previousClose;

  if (!current || !previous) {
    throw new Error(`Dados inválidos para ${symbol}`);
  }

  const change = ((current - previous) / previous) * 100;
  return Number(change.toFixed(2));
}

export async function GET() {
  try {
    const [ewz, sp500, vix, dxy, petr4, vale3, itub4, bbdc4] =
      await Promise.all([
        getChange("EWZ"),
        getChange("^GSPC"),
        getChange("^VIX"),
        getChange("DX-Y.NYB"),
        getChange("PETR4.SA"),
        getChange("VALE3.SA"),
        getChange("ITUB4.SA"),
        getChange("BBDC4.SA"),
      ]);

    let score = 0;

    if (ewz > 0) score += 15;
    if (dxy < 0) score += 15;
    if (sp500 > 0) score += 15;
    if (vix < 0) score += 10;

    if (petr4 > 0) score += 15;
    if (vale3 > 0) score += 15;
    if (itub4 > 0) score += 8;
    if (bbdc4 > 0) score += 7;

    score = Math.max(0, Math.min(100, score));

    let sentimento = "NEUTRO";

    if (score >= 70) sentimento = "COMPRADOR";
    if (score <= 35) sentimento = "VENDEDOR";

    return NextResponse.json({
      ewz,
      dxy,
      sp500,
      vix,
      petr4,
      vale3,
      itub4,
      bbdc4,
      score,
      win: score,
      sentimento,
    });
  } catch (error) {
    return NextResponse.json({
      erro: "Falha ao buscar dados reais",
      detalhe: String(error),
    });
  }
}