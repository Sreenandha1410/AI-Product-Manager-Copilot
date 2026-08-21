// src/pages/AIChatAssistant.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Sparkles, Trash2 } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Avatar } from "../components/ui/Avatar";
import api from "../services/api";

const WORKSPACE = "default";

const PROMPTS = [
  { label: "Summarize customer feedback",  text: "What are the top customer pain points this month?" },
  { label: "Generate PRD",                 text: "Generate a PRD for the top priority feature." },
  { label: "Prioritize feature requests",  text: "Prioritize the current feature backlog using RICE scores." },
  { label: "Build roadmap",                text: "Suggest a quarterly roadmap based on current priorities." },
  { label: "Generate release notes",       text: "Draft release notes for the completed Q1 milestones." },
  { label: "Explain customer sentiment",   text: "Explain the current sentiment distribution in our feedback." },
];

export function AIChatAssistant() {
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState("");
  const [isTyping, setIsTyping]   = useState(false);
  const [loading, setLoading]     = useState(true);
  const bottomRef                 = useRef(null);
  const inputRef                  = useRef(null);

  // Load chat history from backend
  const loadHistory = useCallback(async () => {
    try {
      const res = await api.get(`/chat/history?workspace_id=${WORKSPACE}&limit=100`);
      const history = Array.isArray(res.data) ? res.data : [];
      if (history.length > 0) {
        setMessages(history.map(h => ({
          role:    h.role === "assistant" ? "ai" : h.role,
          content: h.message,
        })));
      } else {
        setMessages([{
          role:    "ai",
          content: "Hello! I am your AI Product Manager Copilot. I can help you analyze feedback, write PRDs, and plan your roadmap. What would you like to work on today?",
        }]);
      }
    } catch {
      setMessages([{
        role:    "ai",
        content: "Hello! I am your AI Product Manager Copilot. What would you like to work on today?",
      }]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

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
      setMessages(prev => [...prev, { role: "ai", content: res.data.response }]);
    } catch (err) {
    const errMsg =
        err?.response?.data?.detail ||
        "Sorry, I could not process your request.";
} finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Clear all chat history?")) return;
    try {
      await api.delete(`/chat/history?workspace_id=${WORKSPACE}`);
      setMessages([{
        role:    "ai",
        content: "Chat history cleared. How can I help you today?",
      }]);
    } catch { alert("Failed to clear history."); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center">
          <Bot className="mr-2 h-6 w-6 text-primary" />
          AI Chat Assistant
        </h1>
        <Button variant="ghost" size="sm" onClick={handleClearHistory} className="text-text-secondary hover:text-danger">
          <Trash2 className="mr-2 h-4 w-4" /> Clear History
        </Button>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-background">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <Avatar
                fallback={msg.role === "user"
                  ? <User className="h-4 w-4" />
                  : <Bot className="h-4 w-4" />
                }
                className={msg.role === "ai"
                  ? "bg-primary text-white shrink-0"
                  : "bg-surface-hover text-text-secondary border border-border shrink-0"
                }
              />
              <div
                className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-primary text-white rounded-tr-sm"
                    : "bg-surface-hover text-text-primary rounded-tl-sm border border-border"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-4">
              <Avatar
                fallback={<Bot className="h-4 w-4" />}
                className="bg-primary text-white shrink-0"
              />
              <div className="bg-surface-hover border border-border rounded-2xl rounded-tl-sm p-4 flex items-center gap-1.5">
                {[0, 0.2, 0.4].map((delay, i) => (
                  <span
                    key={i}
                    className="w-2 h-2 bg-text-muted rounded-full animate-bounce"
                    style={{ animationDelay: `${delay}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-border bg-surface shrink-0">
          {/* Suggested prompts */}
          <div className="mb-4 flex flex-wrap gap-2">
            {PROMPTS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p.text)}
                disabled={isTyping}
                className="inline-flex items-center text-xs text-text-secondary bg-surface-hover border border-border px-3 py-1.5 rounded-full hover:bg-background hover:text-text-primary transition-colors disabled:opacity-50"
              >
                <Sparkles className="mr-1.5 h-3 w-3 text-primary shrink-0" />
                {p.label}
              </button>
            ))}
          </div>

          {/* Text input */}
          <div className="relative flex items-center">
            <Input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Copilot anything… (Enter to send)"
              className="pr-12 h-12 rounded-xl"
              disabled={isTyping}
            />
            <Button
              type="button"
              size="icon"
              className="absolute right-1.5 h-9 w-9 rounded-lg"
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}