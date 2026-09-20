export interface AiQueryRequest {
  prompt: string;
}

export interface AiChatRequest {
  conversationId?: number;
  batchId?: number;
  prompt: string;
}

export interface AiQueryResponse {
  answer: string;
  category?: string;
  keyInsights?: string[];
  possibleCauses?: string[];
  recommendedActions?: string[];
  warningSigns?: string[];
  requiresVeterinarian?: boolean;
  sources?: string[];
  confidence?: string;
  conversationId?: number;
  dataPoints?: Record<string, unknown>;
  suggestions?: string[];
}

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  category?: string;
  keyInsights?: string[];
  possibleCauses?: string[];
  recommendedActions?: string[];
  warningSigns?: string[];
  requiresVeterinarian?: boolean;
  sources?: string[];
  confidence?: string;
  suggestions?: string[];
}

export interface ConversationSummary {
  id: number;
  userId: number;
  batchId?: number;
  batchCode?: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}
