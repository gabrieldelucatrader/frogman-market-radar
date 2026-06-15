import { NextResponse } from "next/server";

export async function GET() {
  const alertas = [];

  alertas.push({
    tipo: "INFO",
    mensagem: "Radar FrogMan Online",
  });

  const hora = new Date().getHours();

  if (hora >= 8 && hora <= 10) {
    alertas.push({
      tipo: "ALTO",
      mensagem: "Período de maior volatilidade da abertura",
    });
  }

  if (hora >= 14 && hora <= 15) {
    alertas.push({
      tipo: "ALTO",
      mensagem: "Horário típico de eventos Fed/FOMC",
    });
  }

  return NextResponse.json(alertas);
}