import { NextResponse } from "next/server";
import { createErrorResponse, requireAdminForApi, requireUserForApi } from "@/lib/apiHelpers";
import { createResource, listResources } from "@/lib/resourceService";
import { parseResourceInput } from "@/lib/validation";

// GET /api/resources : active resources (admins can add ?includeInactive=true)
export async function GET(request: Request) {
  try {
    const currentUser = await requireUserForApi();
    const wantsInactive = new URL(request.url).searchParams.get("includeInactive") === "true";
    const resources = await listResources(wantsInactive && currentUser.role === "admin");
    return NextResponse.json(resources);
  } catch (error) {
    return createErrorResponse(error);
  }
}

// POST /api/resources : admin only
export async function POST(request: Request) {
  try {
    await requireAdminForApi();
    const body = await request.json().catch(() => null);
    await createResource(parseResourceInput(body));
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return createErrorResponse(error);
  }
}
