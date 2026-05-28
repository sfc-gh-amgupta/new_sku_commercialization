import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";

export async function GET() {
  const host = process.env.SNOWFLAKE_HOST || "";
  let siBaseUrl = "https://ai.snowflake.com";

  if (host) {
    const bare = host.replace(".snowflakecomputing.com", "");
    const firstDash = bare.indexOf("-");
    if (firstDash > 0) {
      const org = bare.substring(0, firstDash);
      const acct = bare.substring(firstDash + 1).replace(/-/g, "_");
      siBaseUrl = `https://ai.snowflake.com/${org}/${acct}`;
    }
  } else {
    try {
      let token = "";
      let tokenType = "";
      if (existsSync("/snowflake/session/token")) {
        token = readFileSync("/snowflake/session/token", "utf-8").trim();
        tokenType = "OAUTH";
      } else if (process.env.SNOWFLAKE_TOKEN) {
        token = process.env.SNOWFLAKE_TOKEN;
        tokenType = "PROGRAMMATIC_ACCESS_TOKEN";
      }
      if (token) {
        const fallbackHost = process.env.SNOWFLAKE_ACCOUNT
          ? `${process.env.SNOWFLAKE_ACCOUNT}.snowflakecomputing.com`
          : "sfsenorthamerica-rraz-aws1.snowflakecomputing.com";
        const resp = await fetch(`https://${fallbackHost}/api/v2/statements`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "X-Snowflake-Authorization-Token-Type": tokenType,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ statement: "SELECT LOWER(CURRENT_ORGANIZATION_NAME()) AS org, LOWER(CURRENT_ACCOUNT_NAME()) AS acct", timeout: 30 }),
        });
        const data = await resp.json();
        if (data.data && data.data[0]) {
          const org = data.data[0][0];
          const acct = data.data[0][1];
          siBaseUrl = `https://ai.snowflake.com/${org}/${acct}`;
        }
      }
    } catch {}
  }

  return NextResponse.json({
    siAgentUrl: `${siBaseUrl}/#/ai/chat/new?db=SNOWFLAKE_INTELLIGENCE&schema=AGENTS&agent=PRODUCT_LAUNCH_AGENT`,
  });
}
