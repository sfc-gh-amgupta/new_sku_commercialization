import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";

function getAuthHeaders(): Record<string, string> | null {
  if (existsSync("/snowflake/session/token")) {
    const token = readFileSync("/snowflake/session/token", "utf-8").trim();
    return {
      "Authorization": `Bearer ${token}`,
      "X-Snowflake-Authorization-Token-Type": "OAUTH",
    };
  }
  const envToken = process.env.SNOWFLAKE_TOKEN || "";
  if (envToken) {
    return {
      "Authorization": `Bearer ${envToken}`,
      "X-Snowflake-Authorization-Token-Type": "PROGRAMMATIC_ACCESS_TOKEN",
    };
  }
  return null;
}

export async function POST() {
  const host = process.env.SNOWFLAKE_HOST || "sfsenorthamerica-rraz-aws1.snowflakecomputing.com";

  const authHeaders = getAuthHeaders();
  if (!authHeaders) {
    return NextResponse.json({ error: "No auth token" }, { status: 401 });
  }

  const headers: Record<string, string> = { "Content-Type": "application/json", ...authHeaders };

  try {
    const resp = await fetch(`https://${host}/api/v2/cortex/threads`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      return NextResponse.json({ error: errorText }, { status: resp.status });
    }

    const data = await resp.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to connect: ${e instanceof Error ? e.message : "unknown"}` },
      { status: 502 }
    );
  }
}
