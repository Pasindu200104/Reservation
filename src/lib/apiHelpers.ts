import { NextResponse } from "next/server";
import { ApplicationError } from "./errors";
import { getCurrentUser } from "./session";
import { CurrentUser } from "./types";

// For API routes: throw an error (instead of redirecting) when not allowed.
export async function requireUserForApi(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new ApplicationError("Please log in to continue.", 401);
  }
  return user;
}

export async function requireAdminForApi(): Promise<CurrentUser> {
  const user = await requireUserForApi();
  if (user.role !== "admin") {
    throw new ApplicationError("Only administrators can do this.", 403);
  }
  return user;
}

export function createErrorResponse(error: unknown) {
  if (error instanceof ApplicationError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }
  console.error(error);
  return NextResponse.json({ error: "Something went wrong on the server." }, { status: 500 });
}
