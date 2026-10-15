import { NextResponse } from "next/server";
import { createErrorResponse, requireUserForApi } from "@/lib/apiHelpers";
import { ApplicationError } from "@/lib/errors";
import { createReservation, listReservations } from "@/lib/reservationService";
import { parseIdentifier, parseReservationInput } from "@/lib/validation";

// GET /api/reservations?resourceId=1&start=...&end=...
export async function GET(request: Request) {
  try {
    await requireUserForApi();

    const searchParameters = new URL(request.url).searchParams;
    const resourceId = parseIdentifier(searchParameters.get("resourceId"), "The resource");
    const rangeStart = new Date(searchParameters.get("start") ?? "");
    const rangeEnd = new Date(searchParameters.get("end") ?? "");
    if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
      throw new ApplicationError("Please provide a valid start and end date.", 400);
    }

    const reservations = await listReservations(resourceId, rangeStart, rangeEnd);
    return NextResponse.json(reservations);
  } catch (error) {
    return createErrorResponse(error);
  }
}

// POST /api/reservations
export async function POST(request: Request) {
  try {
    const currentUser = await requireUserForApi();
    const body = await request.json().catch(() => null);

    const resourceId = parseIdentifier((body as { resourceId?: unknown } | null)?.resourceId, "The resource");
    const input = parseReservationInput(body);

    const created = await createReservation(resourceId, currentUser, input);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return createErrorResponse(error);
  }
}
