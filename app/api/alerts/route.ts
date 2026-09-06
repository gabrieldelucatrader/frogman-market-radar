import { NextResponse } from "next/server";

const saoPauloTimeZone = "America/Sao_Paulo";

export async function GET() {
  const alertas = [];

  alertas.push({
    tipo: "INFO",
    mensagem: "Radar FrogMan Online",
  });

  const hora = Number(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: saoPauloTimeZone,
      hour: "2-digit",
      hour12: false,
    }).format(new Date())
  );

  if (hora >= 8 && hora <= 10) {
    alertas.push({
      tipo: "ALTO",
      mensagem: "Periodo de maior volatilidade da abertura",
    });
  }

  if (hora >= 14 && hora <= 15) {
    alertas.push({
      tipo: "ALTO",
      mensagem: "Horario tipico de eventos Fed/FOMC",
    });
  }

  return NextResponse.json(alertas);
}
