export type MessageRole = "user" | "assistant" | "analysis" | "suggestions" | "image-analysis";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  imageUrl?: string; // Optional image attachment
  imageBase64?: string; // Base64 encoded image for API calls
}

export interface EmotionalAnalysis {
  emotionalClarity: number;
  detectedState: string;
  relationshipRisk: "low" | "medium" | "high";
  summary: string;
  // Quick summary bullets for Analysis Screen
  tone?: string;
  pattern?: string;
  emotionalImpact?: string;
  coreIssue?: string;
  fullAnalysis?: string;
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

export interface DysfunctionLabel {
  tag: string;
  description: string;
}

export interface ImageAnalysis {
  summary: string;
  labels: DysfunctionLabel[];
  emotionalImpact: string;
  suggestedResponse: string;
}

export interface ImageAnalysisMessage extends Message {
  role: "image-analysis";
  analysis: ImageAnalysis;
}

export type ChatMessage = Message | AnalysisMessage | SuggestionsMessage | ImageAnalysisMessage;
