"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function formatMessage(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let keyCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim() === "") {
      elements.push(<div key={keyCounter++} style={{ height: "8px" }} />);
      continue;
    }

    if (line.startsWith("## ") || line.startsWith("### ")) {
      const text = line.replace(/^#{2,3}\s+/, "");
      elements.push(
        <div key={keyCounter++} style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: "11px",
          fontWeight: 700,
          color: "#FF8000",
          letterSpacing: "2px",
          textTransform: "uppercase",
          marginTop: "14px",
          marginBottom: "6px",
          borderBottom: "1px solid rgba(255,128,0,0.2)",
          paddingBottom: "4px"
        }}>
          {text}
        </div>
      );
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("• ")) {
      const content = line.replace(/^[-•]\s+/, "");
      elements.push(
        <div key={keyCounter++} style={{ display: "flex", gap: "10px", marginBottom: "4px", paddingLeft: "4px" }}>
          <span style={{ color: "#E10600", marginTop: "2px", flexShrink: 0 }}>▸</span>
          <span>{renderInline(content)}</span>
        </div>
      );
      continue;
    }

    const numberedMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (numberedMatch) {
      elements.push(
        <div key={keyCounter++} style={{ display: "flex", gap: "10px", marginBottom: "4px", paddingLeft: "4px" }}>
          <span style={{ color: "#FF8000", fontFamily: "'Orbitron', monospace", fontSize: "11px", flexShrink: 0, marginTop: "2px" }}>{numberedMatch[1]}.</span>
          <span>{renderInline(numberedMatch[2])}</span>
        </div>
      );
      continue;
    }

    elements.push(
      <div key={keyCounter++} style={{ marginBottom: "2px" }}>
        {renderInline(line)}
      </div>
    );
  }

  return elements;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} style={{ color: "#ffffff", fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i} style={{ color: "rgba(255,255,255,0.6)", fontStyle: "italic" }}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Lights out and away we go.\n\nI'm **PITWALL** — your F1 Intelligence Hub for everything Formula 1. From the 1950 British Grand Prix to this season's championship battle.\n\nAsk me about drivers, teams, strategy, regulations, lap records, controversies — anything in the paddock.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [lapTime, setLapTime] = useState("1:23.456");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const interval = setInterval(() => {
      const sec = Math.floor(Math.random() * 40) + 10;
      const ms = Math.floor(Math.random() * 999).toString().padStart(3, "0");
      setLapTime(`1:${sec.toString().padStart(2, "0")}.${ms}`);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  async function sendMessage(text?: string) {
    const userText = text || input;
    if (!userText.trim() || loading || streaming) return;

    const userMessage: Message = { role: "user", content: userText };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    const assistantMessage: Message = { role: "assistant", content: "" };
    setMessages([...updatedMessages, assistantMessage]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!res.ok) throw new Error("Request failed");
      if (!res.body) throw new Error("No response body");

      setLoading(false);
      setStreaming(true);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setMessages([...updatedMessages, { role: "assistant", content: fullText }]);
      }

      setStreaming(false);
    } catch {
      setLoading(false);
      setStreaming(false);
      setMessages([...updatedMessages, { role: "assistant", content: "Something went wrong. Please try again." }]);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const suggestions = [
    "Who won the last F1 race?",
    "Current 2026 championship standings",
    "Compare Senna vs Prost",
    "What happened at the 1994 San Marino GP?",
    "How does DRS work?",
    "Best F1 car ever built?",
  ];

  const isThinking = loading && !streaming;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&family=Rajdhani:wght@300;400;500;600;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #0a0a0f;
          font-family: 'Rajdhani', sans-serif;
          overflow: hidden;
        }

        .f1-app {
          min-height: 100vh;
          background: #0a0a0f;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 16px;
          position: relative;
          overflow: hidden;
        }

        .f1-app::before {
          content: '';
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse at 15% 50%, rgba(225,6,0,0.09) 0%, transparent 55%),
            radial-gradient(ellipse at 85% 20%, rgba(255,128,0,0.06) 0%, transparent 45%),
            radial-gradient(ellipse at 55% 85%, rgba(225,6,0,0.07) 0%, transparent 45%),
            repeating-linear-gradient(-45deg, transparent, transparent 60px, rgba(255,255,255,0.013) 60px, rgba(255,255,255,0.013) 61px),
            repeating-linear-gradient(45deg, transparent, transparent 60px, rgba(225,6,0,0.018) 60px, rgba(225,6,0,0.018) 61px);
          pointer-events: none;
          z-index: 0;
        }

        .f1-app::after {
          content: '';
          position: fixed;
          top: -200px;
          left: 50%;
          transform: translateX(-50%);
          width: 900px;
          height: 400px;
          background: radial-gradient(ellipse, rgba(225,6,0,0.13) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
          animation: glowPulse 4s ease-in-out infinite;
        }

        @keyframes glowPulse {
          0%, 100% { opacity: 0.6; transform: translateX(-50%) scale(1); }
          50% { opacity: 1; transform: translateX(-50%) scale(1.1); }
        }

        .light-streaks {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }

        .streak {
          position: absolute;
          height: 1px;
          border-radius: 999px;
          opacity: 0;
          animation: streakMove linear infinite;
        }

        .streak:nth-child(1) { width: 280px; top: 12%; left: -280px; background: linear-gradient(90deg, transparent, rgba(225,6,0,0.7), transparent); animation-duration: 3.5s; animation-delay: 0s; }
        .streak:nth-child(2) { width: 480px; top: 28%; left: -480px; background: linear-gradient(90deg, transparent, rgba(255,128,0,0.5), transparent); animation-duration: 4.8s; animation-delay: 1.3s; }
        .streak:nth-child(3) { width: 180px; top: 45%; left: -180px; background: linear-gradient(90deg, transparent, rgba(225,6,0,0.6), transparent); animation-duration: 2.9s; animation-delay: 2.6s; }
        .streak:nth-child(4) { width: 380px; top: 63%; left: -380px; background: linear-gradient(90deg, transparent, rgba(255,200,0,0.35), transparent); animation-duration: 5.2s; animation-delay: 0.8s; }
        .streak:nth-child(5) { width: 320px; top: 78%; left: -320px; background: linear-gradient(90deg, transparent, rgba(225,6,0,0.5), transparent); animation-duration: 4s; animation-delay: 3.5s; }
        .streak:nth-child(6) { width: 220px; top: 91%; left: -220px; background: linear-gradient(90deg, transparent, rgba(255,128,0,0.4), transparent); animation-duration: 3.2s; animation-delay: 1.8s; }

        @keyframes streakMove {
          0% { transform: translateX(0); opacity: 0; }
          8% { opacity: 1; }
          88% { opacity: 1; }
          100% { transform: translateX(120vw); opacity: 0; }
        }

        .circuit-overlay {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }

        .orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          z-index: 0;
          animation: orbFloat ease-in-out infinite;
        }

        .orb-1 { width: 400px; height: 400px; background: rgba(225,6,0,0.08); top: -100px; left: -100px; animation-duration: 8s; }
        .orb-2 { width: 300px; height: 300px; background: rgba(255,128,0,0.06); bottom: -80px; right: -80px; animation-duration: 10s; animation-delay: -3s; }
        .orb-3 { width: 250px; height: 250px; background: rgba(225,6,0,0.05); top: 40%; left: 70%; animation-duration: 12s; animation-delay: -6s; }

        @keyframes orbFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-20px, 15px) scale(0.95); }
        }

        .chat-container {
          width: 100%;
          max-width: 800px;
          height: 92vh;
          display: flex;
          flex-direction: column;
          position: relative;
          z-index: 1;
          filter: drop-shadow(0 20px 40px rgba(225,6,0,0.4)) drop-shadow(0 40px 80px rgba(225,6,0,0.2));
        }

        .header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 24px;
          background: rgba(8,8,12,0.92);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(225,6,0,0.25);
          border-bottom: none;
          border-radius: 16px 16px 0 0;
          position: relative;
          overflow: hidden;
        }

        .header::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent 0%, #E10600 30%, #FF8000 50%, #E10600 70%, transparent 100%);
          animation: scanline 3s linear infinite;
        }

        @keyframes scanline {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .pitwall-logo { display: flex; flex-direction: column; gap: 1px; }

        .pitwall-name {
          font-family: 'Orbitron', monospace;
          font-weight: 900;
          font-size: 22px;
          color: white;
          letter-spacing: 6px;
          line-height: 1;
          text-shadow: 0 0 30px rgba(225,6,0,0.5);
        }

        .pitwall-name span { color: #E10600; }

        .pitwall-sub {
          font-size: 9px;
          color: rgba(255,255,255,0.3);
          letter-spacing: 3px;
          text-transform: uppercase;
          font-weight: 500;
        }

        .header-divider {
          width: 1px;
          height: 36px;
          background: rgba(255,255,255,0.1);
          margin: 0 4px;
        }

        .header-meta { display: flex; flex-direction: column; gap: 3px; }

        .header-meta-label {
          font-size: 9px;
          color: rgba(255,255,255,0.25);
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .header-meta-value {
          font-family: 'Orbitron', monospace;
          font-size: 12px;
          color: #FF8000;
          font-weight: 700;
          letter-spacing: 1px;
          transition: all 0.3s ease;
        }

        .header-right {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .season-badge { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
        .season-label { font-size: 9px; color: rgba(255,255,255,0.25); letter-spacing: 2px; text-transform: uppercase; }
        .season-value { font-family: 'Orbitron', monospace; font-size: 13px; font-weight: 700; color: white; letter-spacing: 2px; }

        .status-group { display: flex; align-items: center; gap: 7px; }

        .status-label {
          font-size: 9px;
          color: #00D26A;
          letter-spacing: 2px;
          font-weight: 600;
          text-transform: uppercase;
          font-family: 'Orbitron', monospace;
        }

        .status-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #00D26A;
          box-shadow: 0 0 8px #00D26A;
          animation: blink 2s ease-in-out infinite;
        }

        .status-dot.thinking {
          background: #FF8000;
          box-shadow: 0 0 8px #FF8000;
          animation: thinkingPulse 0.8s ease-in-out infinite;
        }

        .status-dot.streaming {
          background: #E10600;
          box-shadow: 0 0 8px #E10600;
          animation: thinkingPulse 0.4s ease-in-out infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }

        @keyframes thinkingPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.6; }
        }

        .speed-strip {
          height: 3px;
          background: linear-gradient(90deg, #8B0000, #E10600, #FF8000, #E10600, #8B0000);
          background-size: 200% 100%;
          animation: speedMove 1.8s linear infinite;
          flex-shrink: 0;
        }

        @keyframes speedMove {
          0% { background-position: 0% 0%; }
          100% { background-position: 200% 0%; }
        }

        .messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          background: rgba(8,8,12,0.88);
          backdrop-filter: blur(20px);
          border-left: 1px solid rgba(225,6,0,0.15);
          border-right: 1px solid rgba(225,6,0,0.15);
          scrollbar-width: thin;
          scrollbar-color: rgba(225,6,0,0.3) transparent;
        }

        .messages-area::-webkit-scrollbar { width: 3px; }
        .messages-area::-webkit-scrollbar-thumb { background: rgba(225,6,0,0.4); border-radius: 3px; }

        .msg-row {
          display: flex;
          gap: 12px;
          animation: msgAppear 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes msgAppear {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .msg-row.user { flex-direction: row-reverse; }

        .avatar {
          width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Orbitron', monospace;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.5px;
          flex-shrink: 0;
          margin-top: 2px;
          clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px));
        }

        .avatar.ai {
          background: linear-gradient(135deg, #E10600 0%, #6B0000 100%);
          color: white;
          box-shadow: 0 0 16px rgba(225,6,0,0.4);
        }

        .avatar.user {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.5);
        }

        .bubble {
          max-width: 74%;
          padding: 14px 18px;
          font-size: 15px;
          line-height: 1.75;
          font-weight: 400;
          letter-spacing: 0.2px;
        }

        .bubble.ai {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.15);
          border-left: 3px solid #E10600;
          border-radius: 0 12px 12px 12px;
          color: rgba(255,255,255,0.95);
          box-shadow: 0 0 20px rgba(0,0,0,0.4), inset 0 0 30px rgba(255,255,255,0.02);
        }

        .bubble.user {
          background: rgba(225,6,0,0.18);
          border: 1px solid rgba(225,6,0,0.5);
          border-right: 3px solid #FF8000;
          border-radius: 12px 0 12px 12px;
          color: #ffffff;
          box-shadow: 0 0 20px rgba(225,6,0,0.15), inset 0 0 30px rgba(225,6,0,0.05);
          white-space: pre-wrap;
        }

        .cursor {
          display: inline-block;
          width: 2px;
          height: 14px;
          background: #E10600;
          margin-left: 2px;
          vertical-align: middle;
          animation: cursorBlink 0.7s ease-in-out infinite;
        }

        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        .thinking-bubble {
          background: rgba(255,128,0,0.06);
          border: 1px solid rgba(255,128,0,0.2);
          border-left: 3px solid #FF8000;
          border-radius: 0 12px 12px 12px;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: rgba(255,255,255,0.5);
          font-size: 12px;
          letter-spacing: 1px;
          font-family: 'Orbitron', monospace;
          box-shadow: 0 0 20px rgba(255,128,0,0.08);
        }

        .thinking-dots { display: flex; gap: 4px; }

        .thinking-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #FF8000;
          animation: typingBounce 1.2s ease-in-out infinite;
        }
        .thinking-dot:nth-child(2) { animation-delay: 0.2s; }
        .thinking-dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
          30% { transform: translateY(-6px); opacity: 1; }
        }

        .suggestions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 0 24px 16px;
          background: rgba(8,8,12,0.88);
          backdrop-filter: blur(20px);
          border-left: 1px solid rgba(225,6,0,0.15);
          border-right: 1px solid rgba(225,6,0,0.15);
        }

        .sug-btn {
          background: transparent;
          border: 1px solid rgba(225,6,0,0.3);
          color: rgba(255,255,255,0.5);
          padding: 6px 14px;
          font-family: 'Rajdhani', sans-serif;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.5px;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.25s;
          clip-path: polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px));
        }

        .sug-btn:hover {
          border-color: #E10600;
          color: white;
          background: rgba(225,6,0,0.12);
          box-shadow: 0 0 14px rgba(225,6,0,0.25);
          transform: translateY(-1px);
        }

        .input-area {
          display: flex;
          gap: 10px;
          padding: 16px 20px 20px;
          background: rgba(15,10,10,0.98);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(225,6,0,0.5);
          border-top: 1px solid rgba(225,6,0,0.3);
          border-radius: 0 0 16px 16px;
          position: relative;
          box-shadow: 0 0 30px rgba(225,6,0,0.15), 0 0 60px rgba(225,6,0,0.06), inset 0 1px 0 rgba(225,6,0,0.2);
        }

        .input-area::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent 0%, #E10600 30%, #FF8000 50%, #E10600 70%, transparent 100%);
          border-radius: 0 0 16px 16px;
          animation: scanline 3s linear infinite reverse;
        }

        .input-row {
          flex: 1;
          display: flex;
          gap: 10px;
          align-items: flex-end;
        }

        .chat-input {
          flex: 1;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.35);
          border-radius: 8px;
          padding: 12px 16px;
          font-family: 'Rajdhani', sans-serif;
          font-size: 15px;
          font-weight: 400;
          color: white;
          outline: none;
          resize: none;
          min-height: 46px;
          max-height: 120px;
          transition: border-color 0.2s, box-shadow 0.2s;
          letter-spacing: 0.3px;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.08), inset 0 0 20px rgba(255,255,255,0.03);
        }

        .chat-input::placeholder { color: rgba(255,255,255,0.35); }

        .chat-input:focus {
          border-color: rgba(225,6,0,0.7);
          box-shadow: 0 0 0 2px rgba(225,6,0,0.12), 0 0 20px rgba(225,6,0,0.1);
        }

        .send-btn {
          width: 46px; height: 46px;
          background: linear-gradient(135deg, #E10600, #8B0000);
          border: none;
          border-radius: 8px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s;
          clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
        }

        .send-btn:hover:not(:disabled) { transform: scale(1.06); box-shadow: 0 0 24px rgba(225,6,0,0.65); }
        .send-btn:active:not(:disabled) { transform: scale(0.96); }
        .send-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        .send-icon {
          width: 18px; height: 18px;
          fill: none;
          stroke: white;
          stroke-width: 2.5;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
      `}</style>

      <div className="f1-app">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />

        <div className="light-streaks">
          <div className="streak" /><div className="streak" /><div className="streak" />
          <div className="streak" /><div className="streak" /><div className="streak" />
        </div>

        <svg className="circuit-overlay" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <g stroke="rgba(225,6,0,0.07)" strokeWidth="1.5" fill="none">
            <path d="M-50 200 L200 200 L200 150 L500 150 L500 300 L700 300 L700 200 L900 200 L900 400 L1100 400 L1100 250 L1400 250 L1500 250" />
            <path d="M-50 600 L150 600 L150 500 L400 500 L400 650 L650 650 L650 520 L850 520 L850 700 L1050 700 L1050 580 L1300 580 L1500 580" />
            <path d="M300 -50 L300 100 L450 100 L450 350 L350 350 L350 550 L500 550 L500 800 L300 800 L300 950" />
            <path d="M900 -50 L900 180 L1050 180 L1050 420 L950 420 L950 620 L1100 620 L1100 850 L900 850 L900 950" />
            <circle cx="200" cy="200" r="8" stroke="rgba(225,6,0,0.15)" />
            <circle cx="500" cy="150" r="6" stroke="rgba(255,128,0,0.12)" />
            <circle cx="700" cy="300" r="10" stroke="rgba(225,6,0,0.12)" />
            <circle cx="900" cy="200" r="6" stroke="rgba(255,128,0,0.1)" />
            <circle cx="1100" cy="400" r="8" stroke="rgba(225,6,0,0.12)" />
            <circle cx="400" cy="500" r="6" stroke="rgba(255,128,0,0.1)" />
            <circle cx="650" cy="650" r="10" stroke="rgba(225,6,0,0.12)" />
            <circle cx="850" cy="520" r="6" stroke="rgba(255,200,0,0.1)" />
            <circle cx="1050" cy="700" r="8" stroke="rgba(225,6,0,0.1)" />
          </g>
          <g stroke="rgba(255,128,0,0.04)" strokeWidth="1" fill="none">
            <path d="M100 -50 L100 900" strokeDasharray="4 8" />
            <path d="M600 -50 L600 900" strokeDasharray="4 8" />
            <path d="M1100 -50 L1100 900" strokeDasharray="4 8" />
            <path d="M-50 300 L1500 300" strokeDasharray="4 8" />
            <path d="M-50 650 L1500 650" strokeDasharray="4 8" />
          </g>
        </svg>

        <div className="chat-container">
          <div className="header">
            <div className="pitwall-logo">
              <div className="pitwall-name">PIT<span>WALL</span></div>
              <div className="pitwall-sub">Your F1 Intelligence Hub</div>
            </div>

            <div className="header-divider" />

            <div className="header-meta">
              <div className="header-meta-label">Lap Time</div>
              <div className="header-meta-value">{lapTime}</div>
            </div>

            <div className="header-right">
              <div className="season-badge">
                <div className="season-label">Season</div>
                <div className="season-value">2026</div>
              </div>
              <div className="status-group">
                <span className="status-label">
                  {isThinking ? "Searching" : streaming ? "Streaming" : "Online"}
                </span>
                <div className={`status-dot ${isThinking ? "thinking" : streaming ? "streaming" : ""}`} />
              </div>
            </div>
          </div>

          <div className="speed-strip" />

          <div className="messages-area">
            {messages.map((msg, i) => (
              <div key={i} className={`msg-row ${msg.role}`}>
                <div className={`avatar ${msg.role === "assistant" ? "ai" : "user"}`}>
                  {msg.role === "assistant" ? "PW" : "YOU"}
                </div>
                <div className={`bubble ${msg.role === "assistant" ? "ai" : "user"}`}>
                  {msg.role === "assistant" ? (
                    <>
                      {formatMessage(msg.content)}
                      {streaming && i === messages.length - 1 && (
                        <span className="cursor" />
                      )}
                    </>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="msg-row assistant">
                <div className="avatar ai">PW</div>
                <div className="thinking-bubble">
                  <div className="thinking-dots">
                    <div className="thinking-dot" />
                    <div className="thinking-dot" />
                    <div className="thinking-dot" />
                  </div>
                  <span>Searching paddock data...</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {messages.length <= 1 && (
            <div className="suggestions">
              {suggestions.map((s, i) => (
                <button key={i} className="sug-btn" onClick={() => sendMessage(s)}>{s}</button>
              ))}
            </div>
          )}

          <div className="input-area">
            <div className="input-row">
              <textarea
                className="chat-input"
                placeholder="Ask PITWALL anything about Formula 1..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button className="send-btn" onClick={() => sendMessage()} disabled={loading || streaming || !input.trim()}>
                <svg className="send-icon" viewBox="0 0 24 24">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}