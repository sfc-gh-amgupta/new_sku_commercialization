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

export async function POST(req: Request) {
  const { objectName, column } = await req.json();
  const host = process.env.SNOWFLAKE_HOST || "sfsenorthamerica-rraz-aws1.snowflakecomputing.com";

  const authHeaders = getAuthHeaders();
  if (!authHeaders) {
    return NextResponse.json({ error: "No auth token" }, { status: 401 });
  }

  const objectRef = column ? `${objectName}.${column}` : objectName;
  const domain = column ? "COLUMN" : "TABLE";
  const sql = `SELECT * FROM TABLE(SNOWFLAKE.CORE.GET_LINEAGE('${objectRef}', '${domain}', 'UPSTREAM', 3))`;

  const headers: Record<string, string> = { "Content-Type": "application/json", ...authHeaders };

  try {
    const resp = await fetch(`https://${host}/api/v2/statements`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        statement: sql,
        warehouse: "SKU_LAUNCH_WH",
        database: "SKU_LAUNCH",
        timeout: 30,
      }),
    });

    const data = await resp.json();
    if (data.data && data.data.length > 0) {
      data.data = data.data.filter((row: string[]) => 
        row[0] !== 'SKU_LAUNCH_WH' && row[7] !== 'SKU_LAUNCH_WH'
      );
      const seen = new Set<string>();
      data.data = data.data.filter((row: string[]) => {
        const key = `${row[5]}→${row[7]}.${row[8]}.${row[9]}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      data.data.sort((a: string[], b: string[]) => Number(a[14]) - Number(b[14]));
    }
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to connect: ${e instanceof Error ? e.message : "unknown"}` },
      { status: 502 }
    );
  }
}
