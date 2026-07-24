import { NextRequest } from "next/server";

export function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-api-key");
  const expectedKey = process.env.ADMIN_API_KEY;

  if (!expectedKey) {
    console.warn("ADMIN_API_KEY is not set in environment variables");
    return false;
  }

  return apiKey === expectedKey;
}
