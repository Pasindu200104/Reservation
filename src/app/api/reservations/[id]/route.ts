import { NextResponse } from "next/server";
import { createErrorResponse, requireUserForApi } from "@/lib/apiHelpers";
import { cancelReservation, updateReservation } from "@/lib/reservationService";
import { parseIdentifier, parseReservationInput } from "@/lib/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PUT /api/reservations/5 : change the time or purpose
export async function PUT(request: Request, context: RouteContext) {
  try {
    const currentUser = await requireUserForApi();
    const { id } = await context.params;
    const reservationId = parseIdentifier(id, "The reservation");
    const body = await request.json().catch(() => null);
    const input = parseReservationInput(body);

    await updateReservation(reservationId, currentUser, input);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return createErrorResponse(error);
  }
}

// DELETE /api/reservations/5 : cancel the reservation
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const currentUser = await requireUserForApi();
    const { id } = await context.params;
    const reservationId = parseIdentifier(id, "The reservation");

    await cancelReservation(reservationId, currentUser);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return createErrorResponse(error);
  }
}
