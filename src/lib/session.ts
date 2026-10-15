import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { databasePool } from "./database";
import { CurrentUser } from "./types";

const SESSION_COOKIE_NAME = "session";
const SESSION_LIFETIME_IN_SECONDS = 60 * 60 * 8;

function createSignature(value: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is missing. Copy .env.example to .env and set it.");
  }
  return createHmac("sha256", secret).update(value).digest("hex");
}

// The cookie looks like "3.9f2a..." : the user id, a dot, and a signature.
// The signature stops people from changing the id to pretend to be someone else.
export async function createSession(userId: number) {
  const cookieStore = await cookies();
  const userIdText = String(userId);
  cookieStore.set(SESSION_COOKIE_NAME, `${userIdText}.${createSignature(userIdText)}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_LIFETIME_IN_SECONDS,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!cookieValue) {
    return null;
  }

  const [userIdText, signature] = cookieValue.split(".");
  if (!userIdText || !signature) {
    return null;
  }

  const expectedSignature = createSignature(userIdText);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  const result = await databasePool.query(
    "SELECT id, name, email, role FROM users WHERE id = $1",
    [Number(userIdText)]
  );
  return result.rows[0] ?? null;
}

// For pages: send the visitor to the login page when they are not signed in.
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
