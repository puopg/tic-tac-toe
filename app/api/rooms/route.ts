import { NextResponse } from "next/server";
import { createRoom, listRooms } from "@/lib/roomStore";
import { badRequest, parseJsonBody, storeResponse } from "@/utils/apiHelpers";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ rooms: await listRooms() });
}

export async function POST(request: Request) {
  const body = await parseJsonBody(request);
  if (!body) return badRequest();

  // Only online two-player games live on the server. Single-device modes
  // (vs-AI and local pass-and-play) run entirely in the browser and never
  // create a room here, so a request for one is rejected rather than quietly
  // coerced - the client should never be calling this for those modes.
  if (body.mode === "ai" || body.mode === "local") {
    return badRequest("single-device games are client-only");
  }

  const name = typeof body.name === "string" ? body.name : "";
  return storeResponse(await createRoom(name, "two-player"), 201);
}
