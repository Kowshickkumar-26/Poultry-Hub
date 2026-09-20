import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { getActiveBatches, getCompletedBatches } from "@/lib/api/batches";
import { askAiAssistant } from "@/lib/api/ai";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AiMarkdownRenderer } from "@/components/AiMarkdownRenderer";
import type { ChatMessage, AiQueryResponse } from "@/types/ai";
import {
  Bot,
  Send,
  Sparkles,
  User,
  Lightbulb,
  Activity,
  Trash2,
  Building2,
  Layers,
  CheckCircle2,
} from "lucide-react";

let messageCounter = 0;
function createMessageId(prefix: string): string {
  messageCounter += 1;
  return `${prefix}-${messageCounter}`;
}

const INITIAL_CEO_MESSAGE: ChatMessage = {
  id: "welcome-ceo-msg",
  sender: "ai",
  text: "👋 **Welcome, Executive!**\n\nI am your **Enterprise Poultry Intelligence Assistant**. I provide multi-farm operational overviews, aggregate flock statistics, production cycle summaries, and facility performance analytics.\n\nSelect a prompt below or ask any executive query:",
  timestamp: "Today",
  category: "Executive Analytics",
  suggestions: [
    "Give me an executive summary",
    "How many active batches are in production?",
    "What is the total bird count across all farms?",
    "How many completed batches in archive?",
  ],
};

export default function CEOAIAssistantPage() {
  const { data: active = [] } = useQuery({ queryKey: ["activeBatches"], queryFn: getActiveBatches });
  const { data: completed = [] } = useQuery({ queryKey: ["completedBatches"], queryFn: getCompletedBatches });

  const totalBatches = active.length + completed.length;
  const totalActiveBirds = active.reduce((acc, b) => acc + (b.initialBirds || 0), 0);

  const [inputPrompt, setInputPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_CEO_MESSAGE]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const aiMutation = useMutation({
    mutationFn: (prompt: string) => askAiAssistant(prompt),
    onSuccess: (data: AiQueryResponse) => {
      const aiReply: ChatMessage = {
        id: createMessageId("ai-ceo"),
        sender: "ai",
        text: data.answer || "Executive analysis compiled successfully.",
        category: data.category || "Executive Analytics",
        keyInsights: data.keyInsights || [],
        suggestions: data.suggestions || [],
        timestamp: "Just now",
      };
      setMessages((prev) => [...prev, aiReply]);
    },
    onError: (error) => {
      const errorText = isAxiosError(error)
        ? error.response?.data?.message || "Sorry, I encountered an issue analyzing enterprise data."
        : "Failed to connect to AI Assistant.";
      const aiReply: ChatMessage = {
        id: createMessageId("ai-ceo-err"),
        sender: "ai",
        text: "⚠️ **Executive Query Error:** " + errorText,
        category: "Error Notice",
        timestamp: "Just now",
      };
      setMessages((prev) => [...prev, aiReply]);
    },
  });

  const handleSendMessage = (promptToSend?: string) => {
    const text = (promptToSend || inputPrompt).trim();
    if (!text || aiMutation.isPending) return;

    const userMsg: ChatMessage = {
      id: createMessageId("user-ceo"),
      sender: "user",
      text,
      timestamp: "Just now",
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!promptToSend) setInputPrompt("");
    aiMutation.mutate(text);

    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleClearChat = () => {
    setMessages([INITIAL_CEO_MESSAGE]);
  };

  const ceoPrompts = [
    { label: "Executive Summary", prompt: "Give me an executive summary of all farms", icon: Sparkles },
    { label: "Active Production", prompt: "How many active batches and birds are in production?", icon: Layers },
    { label: "Completed Batches", prompt: "How many completed batches in archive?", icon: CheckCircle2 },
    { label: "Farm Facilities", prompt: "Provide an overview of registered farm operators", icon: Building2 },
  ];

  return (
    <AppLayout title="Executive AI Assistant" breadcrumb={[{ label: "AI Assistant" }]}>
      <div className="flex h-[calc(100vh-80px)] flex-col p-3 md:p-6 max-w-6xl mx-auto w-full space-y-3">
        {/* Metric Summary Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3.5 bg-white border-slate-200 shadow-xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active Batches</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{active.length}</p>
          </Card>
          <Card className="p-3.5 bg-white border-slate-200 shadow-xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active Placed Birds</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{totalActiveBirds.toLocaleString()}</p>
          </Card>
          <Card className="p-3.5 bg-white border-slate-200 shadow-xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Completed Batches</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{completed.length}</p>
          </Card>
          <Card className="p-3.5 bg-white border-slate-200 shadow-xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Tracked Batches</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{totalBatches}</p>
          </Card>
        </div>

        {/* Executive Header Card */}
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 text-white shadow-lg border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-400/40 shadow-inner">
              <Bot size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-bold tracking-tight">Enterprise Intelligence Engine</h2>
                <span className="inline-flex items-center rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-300 ring-1 ring-indigo-500/30">
                  CEO Executive Suite
                </span>
              </div>
              <p className="text-xs text-indigo-200/70 hidden sm:block">
                Query across enterprise data, farm production cycles, and aggregated metrics.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearChat}
              className="h-8 rounded-xl border-slate-700 bg-slate-900/60 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <Trash2 size={13} className="mr-1.5" />
              Clear Chat
            </Button>
          </div>
        </div>

        {/* Quick Executive Prompt Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {ceoPrompts.map((cp, idx) => {
            const Icon = cp.icon;
            return (
              <button
                key={idx}
                onClick={() => handleSendMessage(cp.prompt)}
                disabled={aiMutation.isPending}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-900 transition-all"
              >
                <Icon size={13} className="text-indigo-600" />
                <span>{cp.label}</span>
              </button>
            );
          })}
        </div>

        {/* Chat Stream Window */}
        <Card className="flex-1 overflow-y-auto rounded-2xl border-slate-200 bg-slate-50/60 p-3 md:p-6 shadow-inner">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.sender === "ai" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                    <Bot size={16} />
                  </div>
                )}

                <div
                  className={`max-w-2xl rounded-2xl p-4 text-sm shadow-xs ${
                    msg.sender === "user"
                      ? "bg-indigo-600 text-white"
                      : "border border-slate-200 bg-white text-slate-900"
                  }`}
                >
                  {/* Category Pill for AI */}
                  {msg.sender === "ai" && msg.category && (
                    <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-800">
                      <Activity size={11} className="text-indigo-600" />
                      {msg.category}
                    </div>
                  )}

                  {/* Main Text / Markdown */}
                  {msg.sender === "ai" ? (
                    <AiMarkdownRenderer content={msg.text} />
                  ) : (
                    <div className="whitespace-pre-wrap leading-relaxed font-medium">
                      {msg.text}
                    </div>
                  )}

                  {/* Key Insights Chips */}
                  {msg.keyInsights && msg.keyInsights.length > 0 && (
                    <div className="mt-3.5 space-y-1.5 rounded-xl bg-slate-50 p-3 border border-slate-200/80 text-xs text-slate-700">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <Lightbulb size={14} className="text-amber-500" /> Key Insights:
                      </div>
                      {msg.keyInsights.map((ki, i) => (
                        <p key={i} className="pl-4 text-slate-700 leading-relaxed">• {ki}</p>
                      ))}
                    </div>
                  )}

                  {/* Dynamic Suggestions */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="mt-3.5 border-t border-slate-100 pt-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Related Inquiries:</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {msg.suggestions.map((sug, i) => (
                          <button
                            key={i}
                            onClick={() => handleSendMessage(sug)}
                            disabled={aiMutation.isPending}
                            className="rounded-lg bg-indigo-50 border border-indigo-200/50 px-3 py-1.5 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 hover:border-indigo-300 transition-colors text-left"
                          >
                            ↳ {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div
                    className={`mt-2 text-[10px] ${
                      msg.sender === "user" ? "text-indigo-100" : "text-slate-400"
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>

                {msg.sender === "user" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-white shadow-xs">
                    <User size={16} />
                  </div>
                )}
              </div>
            ))}

            {/* AI Typing Indicator */}
            {aiMutation.isPending && (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                  <Bot size={16} />
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-indigo-600"></div>
                    <div className="h-2 w-2 animate-bounce rounded-full bg-indigo-600 delay-150"></div>
                    <div className="h-2 w-2 animate-bounce rounded-full bg-indigo-600 delay-300"></div>
                  </div>
                  <span className="text-xs font-semibold text-slate-600">Aggregating enterprise batch records...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </Card>

        {/* Input Bar */}
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
            placeholder="Ask an enterprise question (e.g. 'Give me an executive summary')..."
            disabled={aiMutation.isPending}
            className="flex-1 rounded-xl bg-white text-sm shadow-xs border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 h-11"
          />
          <Button
            onClick={() => handleSendMessage()}
            disabled={!inputPrompt.trim() || aiMutation.isPending}
            className="h-11 rounded-xl bg-indigo-600 px-6 font-semibold text-white shadow-md hover:bg-indigo-700 transition-colors"
          >
            <Send size={16} className="mr-1.5" />
            Send
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
