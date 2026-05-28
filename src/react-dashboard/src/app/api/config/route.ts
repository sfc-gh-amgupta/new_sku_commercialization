import { NextResponse } from "next/server";

export async function GET() {
  const host = process.env.SNOWFLAKE_HOST || "";
  let siBaseUrl = "https://ai.snowflake.com";

  if (host) {
    const accountSlug = host.replace(".snowflakecomputing.com", "").replace(/-/g, "_").replace(/\./g, "/");
    const parts = accountSlug.split("_");
    if (parts.length >= 2) {
      const org = parts[0];
      const acct = parts.slice(1).join("_");
      siBaseUrl = `https://ai.snowflake.com/${org}/${acct}`;
    }
  }

  return NextResponse.json({
    siAgentUrl: `${siBaseUrl}/#/ai/chat/new?db=SNOWFLAKE_INTELLIGENCE&schema=AGENTS&agent=PRODUCT_LAUNCH_AGENT`,
  });
}
