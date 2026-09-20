import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { sendChatMessage } from "@/lib/api/ai";
import { AppLayout } from "@/components/AppLayout";
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
  ShieldCheck,
  Flame,
  Scale,
  TrendingDown,
  Wheat,
  AlertTriangle,
  Stethoscope,
  BookOpen,
  ShieldAlert,
} from "lucide-react";

let messageCounter = 0;
function createMessageId(prefix: string): string {
  messageCounter += 1;
  return `${prefix}-${messageCounter}`;
}

const INITIAL_WELCOME_MESSAGE: ChatMessage = {
  id: "welcome-msg",
  sender: "ai",
  text: "👋 **Hello! I am PoultryAI — your Clinical Avian Veterinary & Farm Operations Assistant.**\n\nI combine **real-time flock telemetry** (mortality curves, feed stocks, weight gains, and FCR) with **peer-reviewed poultry veterinary science** to provide grounded clinical decision support.\n\nAsk me about symptoms, heat stress, growth curves, vaccination schedules, or click a quick prompt below!",
  timestamp: "Today",
  category: "Clinical Decision Support",
  suggestions: [
    "My 19-day-old birds are coughing and mortality increased",
    "Analyze my current batch",
    "Check today's mortality",
    "Analyze my bird weight & FCR",
    "How to handle heat stress?",
    "Check my feed stock",
    "What vaccines should be administered?",
    "How to calculate medication dosage safely?",
  ],
};

export default function FarmerAIAssistantPage() {
  const [inputPrompt, setInputPrompt] = useState("");
  const [conversationId, setConversationId] = useState<number | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_WELCOME_MESSAGE]);
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
        text: "⚠️ **System Notice:** " + errorText + "\n\nPlease try again or check your server connection.",
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
    setMessages([INITIAL_WELCOME_MESSAGE]);
    setConversationId(undefined);
  };

  const quickPrompts = [
    { label: "Coughing & Mortality", prompt: "My 19-day-old birds are coughing and mortality increased", icon: Stethoscope, color: "hover:border-rose-500 hover:text-rose-900" },
    { label: "Current Batch", prompt: "Analyze my current batch", icon: Activity, color: "hover:border-emerald-500 hover:text-emerald-900" },
    { label: "Today's Mortality", prompt: "Check today's mortality", icon: TrendingDown, color: "hover:border-rose-500 hover:text-rose-900" },
    { label: "Bird Weight & FCR", prompt: "Analyze my bird weight and FCR", icon: Scale, color: "hover:border-blue-500 hover:text-blue-900" },
    { label: "Feed Stock", prompt: "Check my feed stock", icon: Wheat, color: "hover:border-amber-500 hover:text-amber-900" },
    { label: "Heat Stress Guide", prompt: "How to handle heat stress?", icon: Flame, color: "hover:border-orange-500 hover:text-orange-900" },
    { label: "Medication Safety", prompt: "How to calculate medication dosage safely?", icon: ShieldCheck, color: "hover:border-teal-500 hover:text-teal-900" },
  ];

  return (
    <AppLayout
      title="Veterinary AI Assistant"
      breadcrumb={[{ label: "Home", href: "/dashboard" }, { label: "AI Assistant" }]}
    >
      <div className="flex h-[calc(100vh-80px)] flex-col p-3 md:p-6 max-w-6xl mx-auto w-full">
        {/* Assistant Header Card */}
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-950 p-4 text-white shadow-lg border border-emerald-800/30">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-400/40 shadow-inner">
              <Stethoscope size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-bold tracking-tight">Veterinary Decision Support AI</h2>
                <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
                  RAG + Live Telemetry Grounded
                </span>
              </div>
              <p className="text-xs text-emerald-100/70 hidden sm:block">
                Powered by Avian Pathology & Pharmacology Vector Database + Live Farm Telemetry.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearChat}
              className="h-8 rounded-xl border-emerald-700/50 bg-emerald-950/40 text-xs font-medium text-emerald-200 hover:bg-emerald-900/60 hover:text-white transition-colors"
            >
              <Trash2 size={13} className="mr-1.5" />
              New Chat
            </Button>
          </div>
        </div>

        {/* Suggested Quick Prompt Chips */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {quickPrompts.map((qp, idx) => {
            const Icon = qp.icon;
            return (
              <button
                key={idx}
                onClick={() => handleSendMessage(qp.prompt)}
                disabled={aiMutation.isPending}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition-all ${qp.color}`}
              >
                <Icon size={13} className="text-emerald-600" />
                <span>{qp.label}</span>
              </button>
            );
          })}
        </div>

        {/* Chat Stream Window */}
        <Card className="mt-3 flex-1 overflow-y-auto rounded-2xl border-slate-200 bg-slate-50/60 p-3 md:p-6 shadow-inner">
          <div className="space-y-4">
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
                  className={`max-w-2xl rounded-2xl p-4 text-sm shadow-xs ${
                    msg.sender === "user"
                      ? "bg-emerald-600 text-white"
                      : "border border-slate-200 bg-white text-slate-900"
                  }`}
                >
                  {/* Category Pill & Veterinarian Emergency Alert */}
                  {msg.sender === "ai" && (
                    <div className="flex flex-wrap items-center gap-2 mb-2.5">
                      {msg.category && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                          <Activity size={11} className="text-emerald-600" />
                          {msg.category}
                        </span>
                      )}
                      {msg.requiresVeterinarian && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 border border-rose-300 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-rose-800 animate-pulse">
                          <ShieldAlert size={12} className="text-rose-600" />
                          Licensed Vet Consultation Required
                        </span>
                      )}
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

                  {/* Differential Diagnoses Tags */}
                  {msg.possibleCauses && msg.possibleCauses.length > 0 && (
                    <div className="mt-3 rounded-xl bg-amber-50/80 p-3 border border-amber-200 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-1.5">
                        <AlertTriangle size={14} className="text-amber-600" /> Differential Diagnosis Potential:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.possibleCauses.map((cause, i) => (
                          <span key={i} className="rounded-md bg-white px-2 py-0.5 font-semibold text-amber-800 border border-amber-200 shadow-2xs">
                            {cause}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Source Citations & References */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 rounded-xl bg-slate-50 p-2.5 border border-slate-200 text-xs text-slate-600">
                      <div className="flex items-center gap-1 font-bold text-slate-800 mb-1">
                        <BookOpen size={13} className="text-emerald-600" /> Verified RAG References:
                      </div>
                      <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                        {msg.sources.map((src, i) => (
                          <li key={i}>{src}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Dynamic Follow-up Suggestions */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="mt-3.5 border-t border-slate-100 pt-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Related Clinical Inquiries:</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {msg.suggestions.map((sug, i) => (
                          <button
                            key={i}
                            onClick={() => handleSendMessage(sug)}
                            disabled={aiMutation.isPending}
                            className="rounded-lg bg-emerald-50 border border-emerald-200/50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300 transition-colors text-left"
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
                  <span className="text-xs font-semibold text-slate-600">Retrieving veterinary knowledge & querying flock database...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </Card>

        {/* Input Bar */}
        <div className="mt-3 flex items-center gap-2">
          <Input
            ref={inputRef}
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
            placeholder="Ask about coughing, mortality spikes, FCR, heat stress, vaccines, or dosage safety..."
            disabled={aiMutation.isPending}
            className="flex-1 rounded-xl bg-white text-sm shadow-xs border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 h-11"
          />
          <Button
            onClick={() => handleSendMessage()}
            disabled={!inputPrompt.trim() || aiMutation.isPending}
            className="h-11 rounded-xl bg-emerald-600 px-6 font-semibold text-white shadow-md hover:bg-emerald-700 transition-colors"
          >
            <Send size={16} className="mr-1.5" />
            Consult
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
