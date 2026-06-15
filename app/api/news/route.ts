import { NextResponse } from "next/server";

const noticias = [
  {
    hora: new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    titulo: "FrogNews online: monitorando EWZ, DXY, S&P, VIX, petróleo e B3",
    impacto: "medio",
  },
  {
    hora: new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    titulo: "Atenção para falas de Fed, Trump, petróleo, guerra e dados dos EUA",
    impacto: "alto",
  },
];

export async function GET() {
  return NextResponse.json({
    noticias,
  });
}