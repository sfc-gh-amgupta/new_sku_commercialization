import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";

function getAuthHeaders(req: Request): Record<string, string> | null {
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

export async function POST(req: Request) {
  const { sql } = await req.json();
  const host = process.env.SNOWFLAKE_HOST || "sfsenorthamerica-rraz-aws1.snowflakecomputing.com";

  const authHeaders = getAuthHeaders(req);
  if (!authHeaders) {
    return NextResponse.json({ error: "No auth token available" }, { status: 401 });
  }

  const headers: Record<string, string> = { "Content-Type": "application/json", ...authHeaders };

  try {
    const resp = await fetch(`https://${host}/api/v2/statements`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        statement: sql,
        warehouse: "SKU_LAUNCH_WH",
        database: "SKU_LAUNCH",
        timeout: 60,
      }),
    });

    const data = await resp.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to connect to Snowflake: ${e instanceof Error ? e.message : "unknown"}`, code: "NETWORK_ERROR" },
      { status: 502 }
    );
  }
}
