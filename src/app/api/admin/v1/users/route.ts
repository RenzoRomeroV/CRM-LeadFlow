import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "../auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createClient();
    
    const { data: accounts, error } = await supabase
      .from("accounts")
      .select("id, name, owner_user_id, is_active, created_at");

    if (error) {
      throw error;
    }

    // Nexus espera un Array directamente, no un objeto { users: [] }
    const users = (accounts || []).map(acc => ({
      id: acc.id,
      email: `${acc.name}@leadflow.local`, // Fallback
      full_name: acc.name,
      status: acc.is_active ? "active" : "suspended",
      password_change_required: false,
      last_login_at: null,
      created_at: acc.created_at,
      twofa_enabled: false
    }));

    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
