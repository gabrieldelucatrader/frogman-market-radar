import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

type TradeInput = {
  id?: string;
  date?: string;
  market?: string;
  kind?: string;
  asset?: string;
  direction?: string;
  quantity?: number;
  gross?: number;
  costs?: number;
  swap?: number;
  currency?: string;
  status?: string;
  strategy?: string;
  notes?: string;
  createdAt?: string;
};

type TradeRow = {
  id: string;
  owner_email: string;
  trade_date: string;
  market: "B3" | "PEPPERSTONE";
  kind: "TRADE" | "APORTE" | "SAQUE";
  asset: string;
  direction: "COMPRA" | "VENDA";
  quantity: number;
  gross: number;
  costs: number;
  swap: number;
  currency: "BRL" | "USD";
  status: "FECHADO" | "ABERTO";
  strategy: string;
  notes: string;
  created_at: string;
};

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && serviceKey ? { url: url.replace(/\/$/, ""), serviceKey } : null;
}

async function supabaseRequest(path: string, init?: RequestInit) {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase não configurado no servidor.");

  return fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: config.serviceKey,
      Authorization: `Bearer ${config.serviceKey}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
}

function toEntry(row: TradeRow) {
  return {
    id: row.id,
    date: row.trade_date,
    market: row.market,
    kind: row.kind,
    asset: row.asset,
    direction: row.direction,
    quantity: Number(row.quantity),
    gross: Number(row.gross),
    costs: Number(row.costs),
    swap: Number(row.swap),
    currency: row.currency,
    status: row.status,
    strategy: row.strategy,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function text(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeEntry(input: TradeInput, ownerEmail: string): TradeRow | null {
  const market = input.market === "PEPPERSTONE" ? "PEPPERSTONE" : input.market === "B3" ? "B3" : null;
  const kind = ["TRADE", "APORTE", "SAQUE"].includes(input.kind ?? "") ? input.kind as TradeRow["kind"] : null;
  const direction = input.direction === "VENDA" ? "VENDA" : "COMPRA";
  const status = input.status === "ABERTO" ? "ABERTO" : "FECHADO";
  const date = text(input.date, 10);

  if (!input.id || !market || !kind || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  return {
    id: text(input.id, 80),
    owner_email: ownerEmail.toLowerCase(),
    trade_date: date,
    market,
    kind,
    asset: text(input.asset, 40) || kind,
    direction,
    quantity: Math.max(0, number(input.quantity)),
    gross: number(input.gross),
    costs: Math.max(0, number(input.costs)),
    swap: number(input.swap),
    currency: market === "B3" ? "BRL" : "USD",
    status: kind === "TRADE" ? status : "FECHADO",
    strategy: text(input.strategy, 120),
    notes: text(input.notes, 2000),
    created_at: input.createdAt && !Number.isNaN(Date.parse(input.createdAt)) ? input.createdAt : new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  try {
    const email = encodeURIComponent(session.email.toLowerCase());
    const [entriesResponse, preferencesResponse] = await Promise.all([
      supabaseRequest(`trade_entries?owner_email=eq.${email}&select=*&order=trade_date.desc,created_at.desc`),
      supabaseRequest(`trade_preferences?owner_email=eq.${email}&select=fx_rate,updated_at&limit=1`),
    ]);

    if (!entriesResponse.ok || !preferencesResponse.ok) throw new Error("Falha ao consultar o banco.");
    const rows = await entriesResponse.json() as TradeRow[];
    const preferences = await preferencesResponse.json() as Array<{ fx_rate: number; updated_at: string }>;

    return NextResponse.json({
      entries: rows.map(toEntry),
      fxRate: preferences[0] ? Number(preferences[0].fx_rate) : 5.3,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha na sincronização." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  try {
    const body = await request.json() as { entries?: TradeInput[]; entry?: TradeInput; fxRate?: number };
    const inputs = body.entries ?? (body.entry ? [body.entry] : []);
    if (inputs.length > 5000) return NextResponse.json({ error: "Limite de importação excedido." }, { status: 400 });
    const rows = inputs.map((entry) => normalizeEntry(entry, session.email)).filter((entry): entry is TradeRow => Boolean(entry));
    if (inputs.length && rows.length !== inputs.length) return NextResponse.json({ error: "Há lançamentos inválidos." }, { status: 400 });

    if (rows.length) {
      const response = await supabaseRequest("trade_entries?on_conflict=id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(rows),
      });
      if (!response.ok) throw new Error("Não foi possível salvar os lançamentos.");
    }

    if (body.fxRate !== undefined) {
      const response = await supabaseRequest("trade_preferences?on_conflict=owner_email", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ owner_email: session.email.toLowerCase(), fx_rate: Math.max(0.01, number(body.fxRate)), updated_at: new Date().toISOString() }),
      });
      if (!response.ok) throw new Error("Não foi possível salvar as preferências.");
    }

    return NextResponse.json({ ok: true, syncedAt: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha na sincronização." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

  try {
    const body = await request.json() as { id?: string };
    const id = text(body.id, 80);
    if (!id) return NextResponse.json({ error: "Lançamento inválido." }, { status: 400 });
    const response = await supabaseRequest(`trade_entries?id=eq.${encodeURIComponent(id)}&owner_email=eq.${encodeURIComponent(session.email.toLowerCase())}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Não foi possível excluir o lançamento.");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha na sincronização." }, { status: 503 });
  }
}
