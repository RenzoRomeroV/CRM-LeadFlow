import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "../../../auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string, action: string } }
) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, action } = params;

    if (action !== "suspend" && action !== "activate") {
      return NextResponse.json(
        { error: "Invalid action. Use 'suspend' or 'activate'." },
        { status: 400 }
      );
    }

    const isActive = action === "activate";
    const supabase = await createClient();

    const { error } = await supabase
      .from("accounts")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      throw error;
    }

    // Nexus espera el usuario actualizado de vuelta
    return NextResponse.json({
      id: id,
      status: isActive ? "active" : "suspended"
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
