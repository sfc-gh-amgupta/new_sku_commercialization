"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SUGGESTED_QUESTIONS } from "@/lib/constants";

interface Message {
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  tables?: { columns: string[]; rows: string[][] }[];
  isStreaming?: boolean;
}

interface ThreadState {
  threadId: string | null;
  parentMessageId: string | null;
}

interface SnowflakeIntelligenceProps {
  docked?: boolean;
  onToggleDock?: () => void;
}

export default function SnowflakeIntelligence({ docked = false, onToggleDock }: SnowflakeIntelligenceProps) {
  const [open, setOpen] = useState(docked);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [thread, setThread] = useState<ThreadState>({ threadId: null, parentMessageId: null });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const createThread = useCallback(async () => {
    try {
      const resp = await fetch("/api/agent/thread", { method: "POST" });
      const data = await resp.json();
      if (data.thread_id) {
        setThread({ threadId: data.thread_id, parentMessageId: null });
        return data.thread_id;
      }
    } catch {
    }
    return null;
  }, []);

  const sendMessage = useCallback(async (question: string) => {
    if (!question.trim() || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setLoading(true);

    let currentThreadId = thread.threadId;
    if (!currentThreadId) {
      currentThreadId = await createThread();
    }

    setMessages((prev) => [...prev, { role: "assistant", content: "", isStreaming: true }]);

    try {
      const resp = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          threadId: currentThreadId,
          parentMessageId: thread.parentMessageId,
        }),
      });

      if (!resp.ok) {
        let errMsg = resp.statusText;
        try {
          const err = await resp.json();
          errMsg = err.error || errMsg;
        } catch {
          errMsg = await resp.text().catch(() => errMsg);
        }
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: `Error: ${errMsg}` };
          return copy;
        });
        setLoading(false);
        return;
      }

      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      let tables: { columns: string[]; rows: string[][] }[] = [];
      let assistantMessageId: string | null = null;
      let buffer = "";
      let currentEventType = "";
      let toolSteps: string[] = [];
      let finalResponseReceived = false;
      let finalText = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEventType = line.slice(7).trim();
            continue;
          }
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;

          try {
            const evt = JSON.parse(payload);
            const eventType = currentEventType || evt.type || "";
            currentEventType = "";

            if (eventType === "response" && evt.content) {
              finalResponseReceived = true;
              const textItems = (evt.content as { type: string; text?: string }[]).filter((c: { type: string }) => c.type === "text");
              finalText = textItems.map((c: { text?: string }) => c.text || "").join("\n\n");
              const tableItems = (evt.content as { type: string; table?: { result_set?: { resultSetMetaData?: { rowType?: { name: string }[] }; data?: string[][] } } }[]).filter((c: { type: string }) => c.type === "table");
              for (const ti of tableItems) {
                if (ti.table?.result_set) {
                  const cols = ti.table.result_set.resultSetMetaData?.rowType?.map((r: { name: string }) => r.name) || [];
                  const rows = ti.table.result_set.data || [];
                  tables = [...tables, { columns: cols, rows }];
                }
              }
              if (evt.metadata?.assistant_message_id) {
                assistantMessageId = evt.metadata.assistant_message_id;
              }
              continue;
            }

            if (eventType === "response.tool_use" || evt.tool_use_id) {
              const toolName = evt.name || evt.tool_name || "data source";
              toolSteps.push(`Querying ${toolName}...`);
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: "", thinking: toolSteps.join("\n"), tables, isStreaming: true };
                return copy;
              });
            } else if (eventType === "response.status" && evt.message) {
              toolSteps.push(evt.message);
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: "", thinking: toolSteps.join("\n"), tables, isStreaming: true };
                return copy;
              });
            } else if (eventType === "response.table" && evt.result_set) {
              const cols = evt.result_set.resultSetMetaData?.rowType?.map((r: { name: string }) => r.name) || [];
              const rows = evt.result_set.data || [];
              tables = [...tables, { columns: cols, rows }];
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: "", thinking: toolSteps.join("\n"), tables, isStreaming: true };
                return copy;
              });
            } else if (evt.metadata?.assistant_message_id) {
              assistantMessageId = evt.metadata.assistant_message_id;
            }
          } catch {
          }
        }
      }

      setMessages((prev) => {
        const copy = [...prev];
        const thinkingContent = toolSteps.length > 0 ? toolSteps.join("\n") : undefined;
        copy[copy.length - 1] = { role: "assistant", content: finalText || "No response received.", thinking: thinkingContent, tables, isStreaming: false };
        return copy;
      });

      if (assistantMessageId) {
        setThread((prev) => ({ ...prev, parentMessageId: assistantMessageId }));
      }
    } catch (e) {
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: "assistant", content: `Connection error: ${e instanceof Error ? e.message : "unknown"}` };
        return copy;
      });
    }

    setLoading(false);
  }, [loading, thread, createThread]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const resetConversation = () => {
    setMessages([]);
    setThread({ threadId: null, parentMessageId: null });
  };

  if (!open && !docked) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 bg-[#29b5e8] hover:bg-[#1a9fd4] text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg z-50 transition-transform hover:scale-110"
        title="Ask Product Launch Agent"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
        </svg>
      </button>
    );
  }

  const containerClass = docked
    ? "flex flex-col h-full bg-slate-800 border-l border-slate-600"
    : "fixed bottom-6 right-6 w-[480px] h-[640px] bg-slate-800 rounded-xl shadow-2xl z-50 flex flex-col border border-slate-600 overflow-hidden";

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between px-4 py-3 bg-[#0f2a4a] border-b border-slate-600">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#29b5e8] animate-pulse"></div>
          <div>
            <span className="font-semibold text-white text-base">Product Launch Agent</span>
            <p className="text-[11px] text-blue-300 italic">Powered by Snowflake Cortex</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://ai.snowflake.com/sfsenorthamerica/rraz_aws1/#/ai/chat/new?db=SNOWFLAKE_INTELLIGENCE&schema=AGENTS&agent=PRODUCT_LAUNCH_AGENT"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] bg-slate-700 hover:bg-slate-600 text-blue-200 px-2 py-1 rounded transition-colors whitespace-nowrap"
          >
            Launch in Snowflake Cowork
          </a>
          <button onClick={resetConversation} className="text-slate-400 hover:text-white px-2 text-xs" title="New conversation">New</button>
          {onToggleDock && (
            <button onClick={onToggleDock} className="text-slate-400 hover:text-white px-1" title={docked ? "Undock" : "Dock to side"}>
              {docked ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>
              )}
            </button>
          )}
          {!docked && <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white text-lg leading-none">&times;</button>}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-slate-400 text-sm">Ask about SKU launch performance, inventory, distribution, or consumer insights:</p>
            <div className="space-y-1.5">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button key={i} onClick={() => sendMessage(q)} className="block w-full text-left text-xs bg-slate-700 hover:bg-slate-600 text-blue-200 rounded-lg px-3 py-2 transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${msg.role === "user" ? "bg-[#29b5e8] text-white" : "bg-slate-700 text-slate-100"}`}>
              {msg.role === "assistant" ? (
                <>
                  {msg.thinking && (
                    <details className="mb-2 border border-slate-600 rounded px-2 py-1.5" open={msg.isStreaming}>
                      <summary className="text-[11px] text-slate-400 cursor-pointer select-none flex items-center gap-1 hover:text-slate-200">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 transition-transform"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
                        Reviewed context
                      </summary>
                      <div className="mt-2 text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto">{msg.thinking}</div>
                    </details>
                  )}
                  <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-li:my-0.5 prose-table:text-xs prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1 prose-th:border prose-th:border-slate-500 prose-td:border prose-td:border-slate-500 prose-th:bg-slate-600">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    {msg.isStreaming && <span className="animate-pulse">|</span>}
                  </div>
                </>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
              {msg.tables && msg.tables.map((tbl, ti) => (
                <div key={ti} className="mt-2 overflow-x-auto">
                  <table className="text-xs border-collapse w-full">
                    <thead>
                      <tr>{tbl.columns.map((col, ci) => <th key={ci} className="border border-slate-500 px-2 py-1 bg-slate-600 text-left">{col}</th>)}</tr>
                    </thead>
                    <tbody>
                      {tbl.rows.slice(0, 10).map((row, ri) => (
                        <tr key={ri}>{row.map((cell, ci) => <td key={ci} className="border border-slate-500 px-2 py-1">{cell}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                  {tbl.rows.length > 10 && <p className="text-xs text-slate-400 mt-1">...{tbl.rows.length - 10} more rows</p>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-600 p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about SKU launch..."
            className="flex-1 bg-slate-700 border border-slate-500 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#29b5e8]"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="bg-[#29b5e8] hover:bg-[#1a9fd4] disabled:bg-slate-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            {loading ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
