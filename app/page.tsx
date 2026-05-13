"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Lights out and away we go. I'm F1·AI — ask me anything about Formula 1, from the 1950 British Grand Prix to this season. History, drivers, teams, strategy, regulations — I've got it all.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const data = await res.json();
      setMessages([...updatedMessages, { role: "assistant", content: data.message }]);
    } catch (err) {
      setMessages([...updatedMessages, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <main className="min-h-screen bg-[#15151E] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl flex flex-col h-[90vh] bg-[#1E1E2A] rounded-2xl border border-white/10 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-[#15151E] flex items-center gap-3">
          <div className="text-[#E10600] font-black text-xl tracking-widest font-mono">F1</div>
          <div className="w-px h-5 bg-white/20" />
          <div>
            <div className="text-white font-semibold text-sm">F1·AI</div>
            <div className="text-white/40 text-xs">Formula 1 Expert</div>
          </div>
          <div className="ml-auto w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-[#E10600] flex items-center justify-center text-white text-xs font-black font-mono flex-shrink-0 mt-1">
                  F1
                </div>
              )}
              <div
                className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-[#E10600] text-white rounded-tr-sm"
                    : "bg-[#252535] text-white/90 rounded-tl-sm"
                }`}
              >
                {msg.content}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-xs flex-shrink-0 mt-1">
                  You
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-[#E10600] flex items-center justify-center text-white text-xs font-black font-mono flex-shrink-0 mt-1">
                F1
              </div>
              <div className="bg-[#252535] px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1 items-center">
                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-4 border-t border-white/10 bg-[#15151E] flex gap-3 items-end">
          <textarea
            className="flex-1 bg-[#252535] text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm resize-none outline-none border border-white/10 focus:border-[#E10600]/50 transition-colors max-h-32"
            placeholder="Ask anything about Formula 1..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-[#E10600] hover:bg-[#c00400] disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-3 rounded-xl text-sm font-semibold transition-colors flex-shrink-0"
          >
            Send
          </button>
        </div>

      </div>
    </main>
  );
}