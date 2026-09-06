import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

export type UserRole = "admin" | "user";

export type SafeUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
};

type StoredUser = SafeUser & {
  passwordHash: string;
  passwordSalt: string;
};

type SessionPayload = {
  sub: string;
  name: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
};

const sessionCookieName = "frogman_session";
const sessionMaxAge = 60 * 60 * 12;
const usersFile = path.join(process.cwd(), "data", "users.json");
const kvUsersKey = "frogman:users";

function getSessionSecret() {
  return process.env.FROGMAN_AUTH_SECRET || "frogman-local-dev-secret-change-me";
}

function getKvConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

function toSafeUser(user: StoredUser): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt,
  };
}

function encodeBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  return {
    salt,
    hash: scryptSync(password, salt, 64).toString("hex"),
  };
}

function verifyPassword(password: string, salt: string, expectedHash: string) {
  const hash = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, "hex");

  return hash.length === expected.length && timingSafeEqual(hash, expected);
}

function createBootstrapAdmin(): StoredUser {
  if (process.env.NODE_ENV === "production" && !process.env.FROGMAN_ADMIN_PASSWORD) {
    throw new Error("Configure FROGMAN_ADMIN_PASSWORD para habilitar o admin inicial.");
  }

  const email = process.env.FROGMAN_ADMIN_EMAIL || "admin@frogman.local";
  const password = process.env.FROGMAN_ADMIN_PASSWORD || "frogman2026";
  const passwordData = hashPassword(password, `bootstrap:${email}:${getSessionSecret()}`);

  return {
    id: "frogman-bootstrap-admin",
    name: "Frogman Admin",
    email,
    role: "admin",
    active: true,
    createdAt: "2026-06-21T00:00:00.000Z",
    passwordHash: passwordData.hash,
    passwordSalt: passwordData.salt,
  };
}

async function readUsersFromKv() {
  const kv = getKvConfig();

  if (!kv) {
    return null;
  }

  const response = await fetch(`${kv.url}/get/${encodeURIComponent(kvUsersKey)}`, {
    headers: { Authorization: `Bearer ${kv.token}` },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Não foi possível ler usuários no Vercel KV.");
  }

  const data = (await response.json()) as { result?: string | null };

  return data.result ? (JSON.parse(data.result) as StoredUser[]) : [];
}

async function writeUsersToKv(users: StoredUser[]) {
  const kv = getKvConfig();

  if (!kv) {
    return false;
  }

  const value = encodeURIComponent(JSON.stringify(users));
  const response = await fetch(`${kv.url}/set/${encodeURIComponent(kvUsersKey)}/${value}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${kv.token}` },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Não foi possível salvar usuários no Vercel KV.");
  }

  return true;
}

function readUsersFromFile() {
  if (!existsSync(usersFile)) {
    writeUsersToFile([createBootstrapAdmin()]);
  }

  return JSON.parse(readFileSync(usersFile, "utf8")) as StoredUser[];
}

function writeUsersToFile(users: StoredUser[]) {
  mkdirSync(path.dirname(usersFile), { recursive: true });
  writeFileSync(usersFile, `${JSON.stringify(users, null, 2)}\n`, "utf8");
}

async function readUsers() {
  const kvUsers = await readUsersFromKv();

  if (kvUsers) {
    if (kvUsers.length === 0) {
      const bootstrapUsers = [createBootstrapAdmin()];
      await writeUsersToKv(bootstrapUsers);

      return bootstrapUsers;
    }

    return kvUsers;
  }

  if (process.env.VERCEL) {
    return [createBootstrapAdmin()];
  }

  return readUsersFromFile();
}

async function writeUsers(users: StoredUser[]) {
  if (await writeUsersToKv(users)) {
    return;
  }

  if (process.env.VERCEL) {
    throw new Error("Para criar usuários na Vercel, conecte Vercel KV/Upstash ao projeto.");
  }

  writeUsersToFile(users);
}

export function getSessionCookieName() {
  return sessionCookieName;
}

export function createSessionToken(user: SafeUser) {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    iat: now,
    exp: now + sessionMaxAge,
  };
  const body = encodeBase64Url(JSON.stringify(payload));

  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token?: string) {
  if (!token) {
    return null;
  }

  const [body, signature] = token.split(".");

  if (!body || !signature || sign(body) !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(body)) as SessionPayload;

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getSessionFromRequest(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const token = cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${sessionCookieName}=`))
    ?.split("=")[1];

  return verifySessionToken(token);
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: sessionMaxAge,
    path: "/",
  };
}

export async function authenticateUser(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = (await readUsers()).find((item) => item.email.toLowerCase() === normalizedEmail);

  if (!user || !user.active || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    return null;
  }

  return toSafeUser(user);
}

export async function listUsers() {
  return (await readUsers()).map(toSafeUser);
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}) {
  const users = await readUsers();
  const email = input.email.trim().toLowerCase();

  if (users.some((user) => user.email.toLowerCase() === email)) {
    throw new Error("Já existe um usuário com esse e-mail.");
  }

  if (input.password.length < 8) {
    throw new Error("A senha precisa ter pelo menos 8 caracteres.");
  }

  const passwordData = hashPassword(input.password);
  const user: StoredUser = {
    id: randomBytes(12).toString("hex"),
    name: input.name.trim(),
    email,
    role: input.role,
    active: true,
    createdAt: new Date().toISOString(),
    passwordHash: passwordData.hash,
    passwordSalt: passwordData.salt,
  };

  await writeUsers([...users, user]);

  return toSafeUser(user);
}
