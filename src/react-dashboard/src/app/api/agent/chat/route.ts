import { readFileSync, existsSync } from "fs";

function getAuthHeaders(): { headers: Record<string, string> } | null {
  if (existsSync("/snowflake/session/token")) {
    const token = readFileSync("/snowflake/session/token", "utf-8").trim();
    return {
      headers: {
        "Authorization": `Bearer ${token}`,
        "X-Snowflake-Authorization-Token-Type": "OAUTH",
      },
    };
  }
  const envToken = process.env.SNOWFLAKE_TOKEN || "";
  if (envToken) {
    return {
      headers: {
        "Authorization": `Bearer ${envToken}`,
        "X-Snowflake-Authorization-Token-Type": "PROGRAMMATIC_ACCESS_TOKEN",
      },
    };
  }
  return null;
}

export async function POST(req: Request) {
  const { question, threadId, parentMessageId } = await req.json();
  const host = process.env.SNOWFLAKE_HOST;
  if (!host) {
    return new Response(JSON.stringify({ error: "SNOWFLAKE_HOST not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const auth = getAuthHeaders();
  if (!auth) {
    return new Response(JSON.stringify({ error: "No auth token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const agentUrl = `https://${host}/api/v2/databases/SNOWFLAKE_INTELLIGENCE/schemas/AGENTS/agents/PRODUCT_LAUNCH_AGENT:run`;

  const body: Record<string, unknown> = {
    messages: [{ role: "user", content: [{ type: "text", text: question }] }],
    stream: true,
  };

  if (threadId) {
    body.thread_id = threadId;
    body.parent_message_id = parentMessageId ?? 0;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
    ...auth.headers,
  };

  try {
    const agentResp = await fetch(agentUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!agentResp.ok) {
      const errorText = await agentResp.text();
      return new Response(JSON.stringify({ error: errorText }), {
        status: agentResp.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(agentResp.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: `Failed to connect: ${e instanceof Error ? e.message : "unknown"}` }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
