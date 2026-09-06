import { NextResponse } from "next/server";
import { createUser, getSessionFromRequest, listUsers, UserRole } from "@/lib/auth";

function requireAdmin(request: Request) {
  const session = getSessionFromRequest(request);

  return session?.role === "admin" ? session : null;
}

export async function GET(request: Request) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
  }

  return NextResponse.json({ users: await listUsers() });
}

export async function POST(request: Request) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | { name?: string; email?: string; password?: string; role?: UserRole }
    | null;

  if (!body?.name || !body.email || !body.password) {
    return NextResponse.json(
      { error: "Informe nome, e-mail e senha." },
      { status: 400 }
    );
  }

  try {
    const user = await createUser({
      name: body.name,
      email: body.email,
      password: body.password,
      role: body.role === "admin" ? "admin" : "user",
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível criar o usuário." },
      { status: 400 }
    );
  }
}
