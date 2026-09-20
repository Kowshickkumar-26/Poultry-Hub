import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { sendChatMessage } from "@/lib/api/ai";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AiMarkdownRenderer } from "@/components/AiMarkdownRenderer";
import type { ChatMessage, AiQueryResponse } from "@/types/ai";
import {
  Bot,
  Send,
  User,
  Activity,
  Trash2,
  Sparkles,
  Stethoscope,
  TrendingDown,
  Scale,
  Wheat,
  Flame,
  ShieldCheck,
  AlertTriangle,
  BookOpen,
  ShieldAlert,
} from "lucide-react";

let messageCounter = 0;
function createMessageId(prefix: string): string {
  messageCounter += 1;
  return `${prefix}-${messageCounter}`;
}

const DASHBOARD_WELCOME_MESSAGE: ChatMessage = {
  id: "welcome-msg",
  sender: "ai",
  text: "👋 **Hello! I'm your Poultry AI Assistant.**\n\nI analyze your live flock telemetry (mortality, feed stock, bird weight, and FCR) alongside veterinary knowledge. Ask me any question about your flock or pick a quick prompt below!",
  timestamp: "Today",
  category: "Flock Assistant",
  suggestions: [
    "Analyze my current batch",
    "Check today's mortality",
    "Analyze my bird weight & FCR",
    "How is my feed stock holding up?",
    "Tips to manage heat stress",
  ],
};

const QUICK_PROMPTS = [
  { label: "Analyze Batch", prompt: "Analyze my current batch performance and status", icon: Activity, color: "hover:border-emerald-500 hover:text-emerald-900" },
  { label: "Mortality Check", prompt: "Check today's mortality and cumulative trend", icon: TrendingDown, color: "hover:border-rose-500 hover:text-rose-900" },
  { label: "Weight & FCR", prompt: "Analyze my bird weight and FCR trajectory", icon: Scale, color: "hover:border-blue-500 hover:text-blue-900" },
  { label: "Feed Stock", prompt: "Check my feed stock and days remaining", icon: Wheat, color: "hover:border-amber-500 hover:text-amber-900" },
  { label: "Heat Stress", prompt: "How to handle heat stress in broiler house?", icon: Flame, color: "hover:border-orange-500 hover:text-orange-900" },
  { label: "Clinical Check", prompt: "What are warning signs of respiratory infection in flock?", icon: Stethoscope, color: "hover:border-teal-500 hover:text-teal-900" },
  { label: "Medication Guide", prompt: "How to calculate medication dosage safely for poultry?", icon: ShieldCheck, color: "hover:border-indigo-500 hover:text-indigo-900" },
];

export function FarmerAIAssistantSection() {
  const [inputPrompt, setInputPrompt] = useState("");
  const [conversationId, setConversationId] = useState<number | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([DASHBOARD_WELCOME_MESSAGE]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const aiMutation = useMutation({
    mutationFn: (promptText: string) =>
      sendChatMessage({
        prompt: promptText,
        conversationId,
      }),
    onSuccess: (data: AiQueryResponse) => {
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      const aiReply: ChatMessage = {
        id: createMessageId("ai"),
        sender: "ai",
        text: data.answer || "Flock analysis completed.",
        category: data.category || "Clinical Consultation",
        keyInsights: data.keyInsights || [],
        possibleCauses: data.possibleCauses || [],
        recommendedActions: data.recommendedActions || [],
        warningSigns: data.warningSigns || [],
        requiresVeterinarian: data.requiresVeterinarian || false,
        sources: data.sources || [],
        confidence: data.confidence || "High",
        suggestions: data.suggestions || [],
        timestamp: "Just now",
      };
      setMessages((prev) => [...prev, aiReply]);
    },
    onError: (error) => {
      const errorText = isAxiosError(error)
        ? error.response?.data?.message || "Sorry, I encountered an issue analyzing your farm data."
        : "Failed to connect to AI Assistant.";
      const aiReply: ChatMessage = {
        id: createMessageId("ai-err"),
        sender: "ai",
        text: "⚠️ **System Notice:** " + errorText + "\n\nPlease try again or check your connection.",
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
      id: createMessageId("user"),
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
    setMessages([DASHBOARD_WELCOME_MESSAGE]);
    setConversationId(undefined);
  };

  return (
    <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-xs">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-900 p-5 text-white sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">AI Assistant / Veterinary Chatbot</h3>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
                Live Farm Telemetry Grounded
              </span>
            </div>
            <p className="text-xs text-emerald-100/70">
              Ask questions about flock health, daily mortality, FCR, feed planning, and disease prevention.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleClearChat}
          className="h-8 self-start rounded-xl border-emerald-700/60 bg-emerald-950/40 text-xs font-medium text-emerald-200 hover:bg-emerald-900/60 hover:text-white transition-colors sm:self-auto"
        >
          <Trash2 size={13} className="mr-1.5" />
          Reset Chat
        </Button>
      </div>

      {/* Quick Prompt Chips */}
      <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
            Quick Prompts:
          </span>
          {QUICK_PROMPTS.map((qp, idx) => {
            const Icon = qp.icon;
            return (
              <button
                key={idx}
                onClick={() => handleSendMessage(qp.prompt)}
                disabled={aiMutation.isPending}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition-all ${qp.color}`}
              >
                <Icon size={12} className="text-emerald-600" />
                <span>{qp.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="max-h-[380px] min-h-[220px] overflow-y-auto bg-slate-50/40 p-4 md:p-6 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.sender === "ai" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-xs">
                <Bot size={16} />
              </div>
            )}

            <div
              className={`max-w-2xl rounded-2xl p-4 text-xs md:text-sm shadow-xs ${
                msg.sender === "user"
                  ? "bg-emerald-600 text-white"
                  : "border border-slate-200 bg-white text-slate-900"
              }`}
            >
              {/* Category & Vet Alert */}
              {msg.sender === "ai" && (
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {msg.category && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                      <Activity size={10} className="text-emerald-600" />
                      {msg.category}
                    </span>
                  )}
                  {msg.requiresVeterinarian && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 border border-rose-300 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-rose-800 animate-pulse">
                      <ShieldAlert size={11} className="text-rose-600" />
                      Vet Consultation Recommended
                    </span>
                  )}
                </div>
              )}

              {/* Message Content */}
              {msg.sender === "ai" ? (
                <AiMarkdownRenderer content={msg.text} />
              ) : (
                <div className="whitespace-pre-wrap leading-relaxed font-medium">
                  {msg.text}
                </div>
              )}

              {/* Differential Diagnoses */}
              {msg.possibleCauses && msg.possibleCauses.length > 0 && (
                <div className="mt-3 rounded-xl bg-amber-50/90 p-2.5 border border-amber-200 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-1">
                    <AlertTriangle size={13} className="text-amber-600" /> Differential Potential:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {msg.possibleCauses.map((cause, i) => (
                      <span key={i} className="rounded-md bg-white px-2 py-0.5 font-semibold text-amber-800 border border-amber-200 text-[11px]">
                        {cause}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Citations */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2.5 rounded-xl bg-slate-50 p-2 border border-slate-200 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1 font-bold text-slate-800 mb-0.5">
                    <BookOpen size={12} className="text-emerald-600" /> Verified References:
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {msg.sources.map((src, i) => (
                      <li key={i}>{src}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggestions */}
              {msg.suggestions && msg.suggestions.length > 0 && (
                <div className="mt-3 border-t border-slate-100 pt-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Suggested Follow-ups:</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {msg.suggestions.map((sug, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(sug)}
                        disabled={aiMutation.isPending}
                        className="rounded-lg bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors text-left"
                      >
                        ↳ {sug}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div
                className={`mt-2 text-[10px] ${
                  msg.sender === "user" ? "text-emerald-100" : "text-slate-400"
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
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-xs">
              <Bot size={16} />
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
              <div className="flex gap-1">
                <div className="h-2 w-2 animate-bounce rounded-full bg-emerald-600"></div>
                <div className="h-2 w-2 animate-bounce rounded-full bg-emerald-600 delay-150"></div>
                <div className="h-2 w-2 animate-bounce rounded-full bg-emerald-600 delay-300"></div>
              </div>
              <span className="text-xs font-semibold text-slate-600">Analyzing live farm records & veterinary database...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="border-t border-slate-100 bg-white p-3 md:p-4">
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
            placeholder="Ask AI about mortality spikes, feed conversion, bird weight, vaccination, or heat stress..."
            disabled={aiMutation.isPending}
            className="flex-1 rounded-xl bg-slate-50 text-xs md:text-sm shadow-2xs border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 h-10 md:h-11"
          />
          <Button
            onClick={() => handleSendMessage()}
            disabled={!inputPrompt.trim() || aiMutation.isPending}
            className="h-10 md:h-11 rounded-xl bg-emerald-600 px-4 md:px-6 font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors shrink-0"
          >
            <Send size={15} className="mr-1.5" />
            <span>Ask AI</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
