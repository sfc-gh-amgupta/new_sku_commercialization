import { NextResponse } from "next/server";

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
  }

  return NextResponse.json({
    siAgentUrl: `${siBaseUrl}/#/ai/chat/new?db=SNOWFLAKE_INTELLIGENCE&schema=AGENTS&agent=PRODUCT_LAUNCH_AGENT`,
  });
}
