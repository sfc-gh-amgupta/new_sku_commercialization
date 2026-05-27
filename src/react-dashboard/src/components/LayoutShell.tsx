"use client";
import { useState, useRef, useCallback, ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import SnowflakeIntelligence from "@/components/SnowflakeIntelligence";

interface LayoutShellProps {
  children: ReactNode;
}

export default function LayoutShell({ children }: LayoutShellProps) {
  const [docked, setDocked] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [chatWidth, setChatWidth] = useState(420);
  const dragging = useRef<"sidebar" | "chat" | null>(null);

  const handleMouseDown = useCallback((pane: "sidebar" | "chat") => {
    dragging.current = pane;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (e: MouseEvent) => {
      if (dragging.current === "sidebar") {
        setSidebarWidth(Math.max(180, Math.min(320, e.clientX)));
      } else if (dragging.current === "chat") {
        setChatWidth(Math.max(320, Math.min(600, window.innerWidth - e.clientX)));
      }
    };

    const handleMouseUp = () => {
      dragging.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-900">
      <div style={{ width: sidebarWidth, minWidth: 180, maxWidth: 320 }} className="shrink-0">
        <Sidebar />
      </div>
      <div
        onMouseDown={() => handleMouseDown("sidebar")}
        className="w-1 bg-slate-700 hover:bg-[#29b5e8] cursor-col-resize transition-colors shrink-0"
      />
      <main className="flex-1 p-6 overflow-auto bg-gradient-to-br from-slate-900 via-[#0f2a4a] to-slate-900">
        {children}
      </main>
      {docked && (
        <>
          <div
            onMouseDown={() => handleMouseDown("chat")}
            className="w-1 bg-slate-700 hover:bg-[#29b5e8] cursor-col-resize transition-colors shrink-0"
          />
          <div style={{ width: chatWidth, minWidth: 320, maxWidth: 600 }} className="shrink-0 h-screen">
            <SnowflakeIntelligence docked onToggleDock={() => setDocked(false)} />
          </div>
        </>
      )}
      {!docked && <SnowflakeIntelligence docked={false} onToggleDock={() => setDocked(true)} />}
    </div>
  );
}
