"use client";

import { useEffect, useState } from "react";

type MarketData = {
  ewz: number;
  dxy: number;
  sp500: number;
  vix: number;
  petr4: number;
  vale3: number;
  itub4: number;
  bbdc4: number;
  win: number;
  score: number;
  sentimento: string;
};

type Noticia = {
  hora: string;
  titulo: string;
  impacto: string;
};

type EventoCalendario = {
  hora: string;
  titulo: string;
  impacto: string;
};

type Alerta = {
  tipo: string;
  mensagem: string;
};

export default function Home() {
  const [data, setData] = useState<MarketData | null>(null);
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);

  useEffect(() => {
    async function loadMarket() {
      const response = await fetch("/api/market");
      const result = await response.json();
      setData(result);
    }

    async function loadNews() {
      const response = await fetch("/api/news");
      const result = await response.json();
      setNoticias(Array.isArray(result) ? result : result.noticias || []);
    }

    async function loadCalendar() {
      const response = await fetch("/api/calendar");
      const result = await response.json();
      setEventos(result.eventos || []);
    }

    async function loadAlerts() {
      const response = await fetch("/api/alerts");
      const result = await response.json();
      setAlertas(Array.isArray(result) ? result : result.alertas || []);
    }

    loadMarket();
    loadNews();
    loadCalendar();
    loadAlerts();

    const timerMarket = setInterval(loadMarket, 15000);
    const timerNews = setInterval(loadNews, 300000);
    const timerCalendar = setInterval(loadCalendar, 300000);
    const timerAlerts = setInterval(loadAlerts, 60000);

    return () => {
      clearInterval(timerMarket);
      clearInterval(timerNews);
      clearInterval(timerCalendar);
      clearInterval(timerAlerts);
    };
  }, []);

  if (!data) {
    return (
      <main className="min-h-screen bg-black text-yellow-400 p-8">
        Carregando FrogMan Market Radar...
      </main>
    );
  }

  const bancos = Number(((data.itub4 + data.bbdc4) / 2).toFixed(2));
  const commodities = Number(((data.petr4 + data.vale3) / 2).toFixed(2));
  const atualizado = new Date().toLocaleTimeString("pt-BR");

  const marketCards = [
    { name: "BANCOS", value: `${bancos}%`, status: bancos >= 0 ? "positivo" : "negativo" },
    { name: "COMMODITIES", value: `${commodities}%`, status: commodities >= 0 ? "positivo" : "negativo" },
    { name: "EWZ", value: `${data.ewz}%`, status: data.ewz >= 0 ? "positivo" : "negativo" },
    { name: "DXY", value: `${data.dxy}%`, status: data.dxy <= 0 ? "positivo" : "negativo" },
    { name: "S&P 500", value: `${data.sp500}%`, status: data.sp500 >= 0 ? "positivo" : "negativo" },
    { name: "VIX", value: `${data.vix}%`, status: data.vix <= 0 ? "positivo" : "negativo" },
    { name: "PETR4", value: `${data.petr4}%`, status: data.petr4 >= 0 ? "positivo" : "negativo" },
    { name: "VALE3", value: `${data.vale3}%`, status: data.vale3 >= 0 ? "positivo" : "negativo" },
    { name: "ITUB4", value: `${data.itub4}%`, status: data.itub4 >= 0 ? "positivo" : "negativo" },
    { name: "BBDC4", value: `${data.bbdc4}%`, status: data.bbdc4 >= 0 ? "positivo" : "negativo" },
    { name: "🐸 FROGMAN SCORE", value: `${data.score}/100`, status: data.score >= 50 ? "positivo" : "negativo" },
  ];

  const leituraMercado =
    data.sentimento === "COMPRADOR"
      ? "EWZ positivo, S&P em alta e VIX caindo. Viés comprador favorecido. Buscar compras em pullbacks e evitar venda contra fluxo."
      : data.sentimento === "VENDEDOR"
      ? "Pressão vendedora no radar. Atenção para DXY forte, EWZ fraco ou VIX subindo. Evitar compras por impulso."
      : "Mercado misto. Melhor aguardar confirmação, rompimento ou pullback em região importante.";

  const sinaisAbertura = [
    { nome: "EWZ", ok: data.ewz > 0 },
    { nome: "S&P", ok: data.sp500 > 0 },
    { nome: "VIX", ok: data.vix < 0 },
    { nome: "DXY", ok: data.dxy < 0 },
    { nome: "BANCOS", ok: bancos > 0 },
    { nome: "COMMODITIES", ok: commodities > 0 },
  ];

  const positivosAbertura = sinaisAbertura.filter((sinal) => sinal.ok).length;
  const probabilidadeAbertura = Math.round(
    (positivosAbertura / sinaisAbertura.length) * 100
  );

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <header className="mb-8">
        <h1 className="text-5xl font-bold text-yellow-400">
          🐸 FrogMan Market Radar
        </h1>
        <p className="text-zinc-400 mt-2">
          Radar rápido para leitura do Mini Índice antes da entrada.
        </p>
      </header>

      <section className="grid grid-cols-4 gap-4 mb-8">
        {marketCards.map((item) => (
          <div key={item.name} className="bg-zinc-900 p-5 rounded-xl border border-zinc-800">
            <h2 className="text-yellow-400 text-sm">{item.name}</h2>
            <p className={item.status === "positivo" ? "text-3xl text-green-400" : "text-3xl text-red-400"}>
              {item.value}
            </p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-6 gap-4">
        <div className="bg-zinc-900 rounded-xl p-6 border border-yellow-500/30">
          <h2 className="text-yellow-400 text-xl mb-4">🚦 Termômetro B3</h2>
          <p className={data.sentimento === "COMPRADOR" ? "text-5xl text-green-400 font-bold" : data.sentimento === "VENDEDOR" ? "text-5xl text-red-400 font-bold" : "text-5xl text-yellow-400 font-bold"}>
            {data.sentimento}
          </p>
          <p className="text-zinc-400 mt-2 text-sm">Atualizado às {atualizado}</p>
          <div className="mt-4">
            <p className="text-yellow-400 font-bold">🐸 FROGMAN SCORE</p>
            <p className="text-3xl font-bold text-white">{data.score}/100</p>
            <div className="mt-2 w-full bg-zinc-800 rounded-full h-4">
              <div className={data.score >= 70 ? "bg-green-500 h-4 rounded-full" : data.score >= 40 ? "bg-yellow-400 h-4 rounded-full" : "bg-red-500 h-4 rounded-full"} style={{ width: `${data.score}%` }}></div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
          <h2 className="text-yellow-400 text-xl mb-4">🐸 Checklist GDL</h2>
          <ul className="space-y-3 text-zinc-300">
            <li>{data.ewz > 0 ? "🟢" : "🔴"} EWZ em alta</li>
            <li>{data.dxy < 0 ? "🟢" : "🔴"} DXY enfraquecendo</li>
            <li>{data.sp500 > 0 ? "🟢" : "🔴"} S&P em alta</li>
            <li>{data.vix < 0 ? "🟢" : "🔴"} VIX caindo</li>
          </ul>
          <p className="text-zinc-400 mt-4">
            Sinais positivos: {[data.ewz > 0, data.dxy < 0, data.sp500 > 0, data.vix < 0].filter(Boolean).length}/4
          </p>
        </div>

        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
          <h2 className="text-yellow-400 text-xl mb-4">📅 Calendário GDL</h2>
          <p className="text-zinc-400 text-sm mb-4">Eventos importantes do dia</p>
          <div className="space-y-3">
            {eventos.map((evento, index) => (
              <div key={index} className="border-b border-zinc-800 pb-2 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-zinc-400">{evento.hora}</span>
                  <span className={evento.impacto === "ALTO" ? "text-red-400 font-bold" : evento.impacto === "MÉDIO" ? "text-yellow-400 font-bold" : "text-green-400 font-bold"}>
                    {evento.impacto}
                  </span>
                </div>
                <p className="text-zinc-200 mt-1">{evento.titulo}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
          <h2 className="text-yellow-400 text-xl mb-4">📰 FrogNews</h2>
          <div className="space-y-3">
            {noticias.map((noticia, index) => (
              <div key={index} className="border-b border-zinc-800 pb-2 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-zinc-400">{noticia.hora}</span>
                  <span className={noticia.impacto === "alto" ? "text-red-400 font-bold" : "text-yellow-400 font-bold"}>
                    {noticia.impacto.toUpperCase()}
                  </span>
                </div>
                <p className="text-zinc-200 mt-1">{noticia.titulo}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900 rounded-xl p-6 border border-yellow-500/30">
          <h2 className="text-yellow-400 text-xl mb-4">🎯 Radar de Abertura</h2>
          <div className="space-y-3">
            {sinaisAbertura.map((sinal) => (
              <div key={sinal.nome} className="flex justify-between border-b border-zinc-800 pb-2">
                <span className="text-zinc-300">{sinal.nome}</span>
                <span>{sinal.ok ? "🟢 Positivo" : "🔴 Negativo"}</span>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <p className="text-zinc-400 text-sm">Probabilidade de abertura</p>
            <p className={probabilidadeAbertura >= 70 ? "text-green-400 text-3xl font-bold" : probabilidadeAbertura <= 40 ? "text-red-400 text-3xl font-bold" : "text-yellow-400 text-3xl font-bold"}>
              {probabilidadeAbertura}% {probabilidadeAbertura >= 70 ? "Compradora" : probabilidadeAbertura <= 40 ? "Vendedora" : "Mista"}
            </p>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-xl p-6 border border-red-500/30">
          <h2 className="text-red-400 text-xl mb-4">🚨 Alertas FrogMan</h2>
          <div className="space-y-3">
            {alertas.map((alerta, index) => (
              <p key={index} className={alerta.tipo === "ALTO" ? "text-red-400 font-bold" : "text-yellow-400"}>
                {alerta.mensagem}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-4 bg-zinc-900 rounded-xl p-6 border border-yellow-500/30">
        <h2 className="text-yellow-400 text-xl mb-4">🐸 Leitura FrogMan Pro</h2>
        <p className="text-zinc-400 text-sm mb-3">Interpretação automática do radar</p>
        <p className={data.sentimento === "COMPRADOR" ? "text-green-400 text-4xl font-bold" : data.sentimento === "VENDEDOR" ? "text-red-400 text-4xl font-bold" : "text-yellow-400 text-4xl font-bold"}>
          {data.sentimento}
        </p>
        <p className="text-zinc-300 mt-4 leading-relaxed">{leituraMercado}</p>
        <div className="mt-5 border-t border-zinc-700 pt-4">
          <p className="text-yellow-400 font-bold">Plano operacional</p>
          <p className="text-zinc-300 mt-2">
            {data.sentimento === "COMPRADOR"
              ? "Priorizar compras após correção. Evitar vender fundo."
              : data.sentimento === "VENDEDOR"
              ? "Priorizar vendas após repique. Evitar comprar topo."
              : "Aguardar o mercado escolher direção."}
          </p>
        </div>
      </section>
    </main>
  );
}