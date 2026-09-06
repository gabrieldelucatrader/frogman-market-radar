import { NextResponse } from "next/server";
import {
  authenticateUser,
  createSessionToken,
  getSessionCookieName,
  getSessionCookieOptions,
} from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; password?: string }
    | null;

  if (!body?.email || !body?.password) {
    return NextResponse.json(
      { error: "Informe e-mail e senha." },
      { status: 400 }
    );
  }

  const user = await authenticateUser(body.email, body.password);

  if (!user) {
    return NextResponse.json(
      { error: "Credenciais inválidas." },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ user });
  response.cookies.set(
    getSessionCookieName(),
    createSessionToken(user),
    getSessionCookieOptions()
  );

  return response;
}
