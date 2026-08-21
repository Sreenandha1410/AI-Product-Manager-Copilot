// src/components/common/FloatingChat.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Bot, X, Send, Sparkles } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import api from "../../services/api";

const WORKSPACE = "floating";

const QUICK_PROMPTS = [
  "What are the top pain points?",
  "Summarize feature requests",
  "What should we build next?",
];

export function FloatingChat() {
  const [isOpen, setIsOpen]     = useState(false);
  const [input, setInput]       = useState("");
  const [messages, setMessages] = useState([
    {
      role:    "ai",
      content: "Hi! I'm your AI PM Copilot. Ask me anything about your product feedback, features, or roadmap.",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef               = useRef(null);
  const inputRef                = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isOpen]);

  // Focus input when popup opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || isTyping) return;

    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await api.post("/chat/", {
        message:      msg,
        workspace_id: WORKSPACE,
      });
      setMessages(prev => [
        ...prev,
        { role: "ai", content: res.data.response },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: "ai", content: "Sorry, I couldn't process that. Please try again." },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        aria-label="Toggle AI Chat"
        className={`
          fixed bottom-6 right-6 z-50
          h-14 w-14 rounded-full shadow-lg
          flex items-center justify-center
          transition-all duration-300
          ${isOpen
            ? "bg-surface border border-border text-text-primary rotate-0 scale-95"
            : "bg-primary text-white hover:bg-primary-hover hover:scale-110"
          }
        `}
      >
        {isOpen
          ? <X className="h-6 w-6" />
          : <Bot className="h-6 w-6" />
        }
      </button>

      {/* Chat Popup */}
      <div
        className={`
          fixed bottom-24 right-6 z-50
          w-80 sm:w-96
          flex flex-col
          bg-surface border border-border rounded-2xl shadow-2xl
          overflow-hidden
          transition-all duration-300 origin-bottom-right
          ${isOpen
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
          }
        `}
        style={{ maxHeight: "520px" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-primary">
          <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">AI Copilot</p>
            <p className="text-xs text-white/70">Powered by Gemini</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="ml-auto text-white/70 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background" style={{ minHeight: 0 }}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              {msg.role === "ai" && (
                <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
              )}
              <div
                className={`
                  max-w-[78%] rounded-2xl px-3 py-2 text-xs leading-relaxed
                  ${msg.role === "user"
                    ? "bg-primary text-white rounded-tr-sm"
                    : "bg-surface-hover text-text-primary border border-border rounded-tl-sm"
                  }
                `}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-2">
              <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                <Bot className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="bg-surface-hover border border-border rounded-2xl rounded-tl-sm px-3 py-2 flex items-center gap-1">
                {[0, 0.2, 0.4].map((delay, i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-text-muted animate-bounce"
                    style={{ animationDelay: `${delay}s` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick prompts */}
        <div className="px-3 py-2 border-t border-border bg-surface flex gap-1.5 flex-wrap">
          {QUICK_PROMPTS.map((p, i) => (
            <button
              key={i}
              onClick={() => handleSend(p)}
              disabled={isTyping}
              className="text-[10px] text-text-secondary bg-surface-hover border border-border px-2 py-1 rounded-full hover:text-primary hover:border-primary/40 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="px-3 py-3 border-t border-border bg-surface flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Copilot…"
            disabled={isTyping}
            className="flex-1 h-9 px-3 text-sm border border-border rounded-lg bg-background text-text-primary placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping}
            className="h-9 w-9 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary-hover transition-colors disabled:opacity-40 shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}
