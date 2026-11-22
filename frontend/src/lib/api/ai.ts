import { api } from "@/lib/api";
import type { AiQueryRequest, AiQueryResponse, AiChatRequest, ConversationSummary, ChatMessage } from "@/types/ai";

export async function askAiAssistant(prompt: string): Promise<AiQueryResponse> {
  const response = await api.post<AiQueryResponse>("/api/ai/query", { prompt } as AiQueryRequest);
  return response.data;
}

export async function sendChatMessage(data: AiChatRequest): Promise<AiQueryResponse> {
  const response = await api.post<AiQueryResponse>("/api/ai/chat", data);
  return response.data;
}

export async function getConversations(): Promise<ConversationSummary[]> {
  const response = await api.get<ConversationSummary[]>("/api/ai/conversations");
  return response.data;
}

export async function getConversationHistory(conversationId: number): Promise<{ messages: ChatMessage[] }> {
  const response = await api.get<{ messages: ChatMessage[] }>(`/api/ai/history/${conversationId}`);
  return response.data;
}

export async function deleteConversation(conversationId: number): Promise<void> {
  await api.delete(`/api/ai/history/${conversationId}`);
}
