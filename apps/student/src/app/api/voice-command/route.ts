import { POST as handleVoiceCommand } from "../voice/command/route";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleVoiceCommand(request);
}
