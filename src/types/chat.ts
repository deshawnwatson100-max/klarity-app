export type MessageRole = "user" | "assistant" | "analysis" | "suggestions";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
}

export interface EmotionalAnalysis {
  emotionalClarity: number;
  detectedState: string;
  relationshipRisk: "low" | "medium" | "high";
  summary: string;
}

export interface SuggestedResponse {
  id: string;
  text: string;
  tone: "soften" | "direct" | "playful";
}

export interface AnalysisMessage extends Message {
  role: "analysis";
  analysis: EmotionalAnalysis;
}

export interface SuggestionsMessage extends Message {
  role: "suggestions";
  suggestions: SuggestedResponse[];
}

export type ChatMessage = Message | AnalysisMessage | SuggestionsMessage;
