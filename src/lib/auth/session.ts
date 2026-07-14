import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_COOKIE = "tailor_session";
const encoder = new TextEncoder();

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return encoder.encode(secret);
}

export type SessionPayload = {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
  permissions: string[];
  isSuperAdmin?: boolean;
};

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const verified = await jwtVerify<SessionPayload>(token, getSecret());
    return verified.payload;
  } catch {
    return null;
  }
}
