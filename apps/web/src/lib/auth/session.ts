import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { readAuthSecret } from "../env/runtime";

export type SessionPayload = {
  userId: string;
  email: string;
  tenantId?: string;
  expiresAt: number;
};

const defaultCookieName = "termopane_session";
const defaultSessionDays = 7;

export function sessionCookieName() {
  return process.env.AUTH_COOKIE_NAME ?? defaultCookieName;
}

function sessionDurationMs() {
  const days = Number.parseInt(process.env.AUTH_SESSION_DAYS ?? "", 10);
  return (Number.isFinite(days) && days > 0 ? days : defaultSessionDays) * 24 * 60 * 60 * 1000;
}

function authSecret() {
  return readAuthSecret();
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return createHmac("sha256", authSecret()).update(value).digest("base64url");
}

export function createSessionToken(payload: Omit<SessionPayload, "expiresAt">) {
  const session: SessionPayload = {
    ...payload,
    expiresAt: Date.now() + sessionDurationMs(),
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(session));

  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature, "base64url");
  const expectedBuffer = Buffer.from(expectedSignature, "base64url");

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as SessionPayload;

    if (!payload.userId || !payload.email || payload.expiresAt <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(sessionCookieName())?.value);
}

export async function setSessionCookie(payload: Omit<SessionPayload, "expiresAt">) {
  const cookieStore = await cookies();
  const token = createSessionToken(payload);

  cookieStore.set(sessionCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(sessionDurationMs() / 1000),
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName());
}
