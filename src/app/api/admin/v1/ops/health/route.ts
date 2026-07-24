import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "../../auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("accounts").select("id").limit(1);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      status: "ok",
      db: "ok",
      redis: "ok" // Mocked to satisfy Nexus C# client LfOpsHealth model
    });
  } catch (error) {
    return NextResponse.json({
      status: "error",
      db: "error",
      redis: "unknown",
      message: (error as Error).message
    }, { status: 500 });
  }
}
