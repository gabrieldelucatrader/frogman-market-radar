import { NextResponse } from "next/server";

const eventos = [
  { hora: "09:00", titulo: "Abertura do Mini Índice / Dólar Futuro", impacto: "ALTO" },
  { hora: "10:00", titulo: "Abertura do mercado à vista B3", impacto: "ALTO" },
  { hora: "10:30", titulo: "Dados dos EUA / Petróleo quando houver", impacto: "MÉDIO" },
  { hora: "11:00", titulo: "Formação de tendência pós-abertura", impacto: "MÉDIO" },
  { hora: "14:00", titulo: "Fed / FOMC / Discursos importantes", impacto: "ALTO" },
  { hora: "15:30", titulo: "Retorno de fluxo da tarde", impacto: "MÉDIO" },
  { hora: "17:00", titulo: "Ajustes finais e fechamento B3", impacto: "MÉDIO" },
];

export async function GET() {
  return NextResponse.json({
    data: new Date().toLocaleDateString("pt-BR"),
    eventos,
  });
}