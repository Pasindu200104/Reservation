"use server";

import { redirect } from "next/navigation";
import { databasePool } from "@/lib/database";
import { createSession } from "@/lib/session";

// Demo login: the person picks an account and we look it up in the database.
// Passwords and registration are left out on purpose for this exercise.
export async function loginWithEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  const result = await databasePool.query("SELECT id FROM users WHERE email = $1", [email]);
  const user = result.rows[0];
  if (!user) {
    redirect("/login?error=unknown-account");
  }

  await createSession(user.id);
  redirect("/dashboard");
}
