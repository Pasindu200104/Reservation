import { NextResponse } from "next/server";
import { createErrorResponse, requireAdminForApi } from "@/lib/apiHelpers";
import { updateResource } from "@/lib/resourceService";
import { parseIdentifier, parseResourceInput } from "@/lib/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PUT /api/resources/3 : admin only. Also used to activate or deactivate.
export async function PUT(request: Request, context: RouteContext) {
  try {
    await requireAdminForApi();
    const { id } = await context.params;
    const resourceId = parseIdentifier(id, "The resource");
    const body = await request.json().catch(() => null);
    await updateResource(resourceId, parseResourceInput(body));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return createErrorResponse(error);
  }
}
