export type MessageRole =
  | "user"
  | "assistant"
  | "analysis"
  | "suggestions"
  | "image-analysis"
  | "typing"
  | "emotional-validation"
  | "quick-summary"
  | "deep-analysis"
  | "direction-selector"
  | "tone-selector"
  | "tailored-guidance"
  | "suggested-reply-card"
  | "face-scan-prompt"
  | "face-scan-card"
  | "emotion-scan-result"
  | "tone-modulation-card"
  | "modulated-replies-card"
  | "add-context-button"
  | "inline-context-input"
  | "reflective-understanding"
  | "context-or-direction-choice"
  | "voice-emotion-scan-result"
  | "boundary-detection"
  | "boundary-clarity-summary"
  | "dysfunctional-communication"
  | "red-flags"
  | "rewrite-reply-card"
  | "image-continuation"
  | "deep-search-loading"
  | "deep-search-result"
  | "person-context-card"
  | "deep-search-suggestion"
  | "chat-loading";

export type MessageMode = "rewrite" | "understand";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  imageUrl?: string; // Optional image attachment
  imageBase64?: string; // Base64 encoded image for API calls
  isVoiceMessage?: boolean; // Marks if this message came from voice recording
  mode?: MessageMode; // The mode this message belongs to (Reply or Decode)
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

// New inline analysis message types
export interface TypingMessage extends Message {
  role: "typing";
}

export interface EmotionalValidationMessage extends Message {
  role: "emotional-validation";
  content: string; // The empathetic message
}

export interface QuickSummaryMessage extends Message {
  role: "quick-summary";
  tone: string;
  pattern: string;
  emotionalImpact: string;
  coreIssue: string;
}

export interface DeepAnalysisMessage extends Message {
  role: "deep-analysis";
  content: string; // 2-3 sentence paragraph
}

export interface DirectionSelectorMessage extends Message {
  role: "direction-selector";
  selectedIntention?: "improve" | "distance" | "maintain" | "clarity";
}

export interface ToneSelectorMessage extends Message {
  role: "tone-selector";
  selectedTone?: "calm" | "direct" | "empathetic" | "assertive";
}

export interface TailoredGuidanceMessage extends Message {
  role: "tailored-guidance";
  content: string; // The guidance text
  intention: "improve" | "distance" | "maintain" | "clarity";
}

export interface SuggestedReplyCardMessage extends Message {
  role: "suggested-reply-card";
  replies: Array<{
    id: string;
    text: string;
    guidanceNote: string;
  }>;
  intention: "improve" | "distance" | "maintain" | "clarity";
  tone?: "calm" | "direct" | "empathetic" | "assertive";
}

export interface FaceScanPromptMessage extends Message {
  role: "face-scan-prompt";
  isExpanded?: boolean; // Whether the card is currently expanded
}

export interface FaceScanCardMessage extends Message {
  role: "face-scan-card";
}

export interface EmotionAnalysis {
  primaryEmotion: string;
  emotionalIntensity: number;
  facialCues: string;
  selfAwarenessInsight: string;
  clarityReflection: string;
  suggestedDirection: string;
  fullSummary: string;
}

export interface EmotionScanResultMessage extends Message {
  role: "emotion-scan-result";
  emotionAnalysis: EmotionAnalysis;
}

export interface ToneModulationCardMessage extends Message {
  role: "tone-modulation-card";
}

export interface ModulatedReply {
  id: string;
  text: string;
  guidanceNote: string;
}

export interface ModulatedRepliesCardMessage extends Message {
  role: "modulated-replies-card";
  replies: ModulatedReply[];
  tone: "direct" | "gentle" | "neutral";
}

export interface AddContextButtonMessage extends Message {
  role: "add-context-button";
}

export interface InlineContextInputMessage extends Message {
  role: "inline-context-input";
}

export interface ReflectiveUnderstandingMessage extends Message {
  role: "reflective-understanding";
  reflectiveUnderstanding: string;
  situationClarity: string;
}

export interface ContextOrDirectionChoiceMessage extends Message {
  role: "context-or-direction-choice";
}

export interface VoiceEmotionAnalysis {
  primaryEmotions: string;
  voiceIndicators: string[];
  emotionalMeaningSummary: string;
  contextUnderstanding: string;
  supportiveReflection: string;
}

export interface VoiceEmotionScanResultMessage extends Message {
  role: "voice-emotion-scan-result";
  voiceEmotionAnalysis: VoiceEmotionAnalysis;
}

export interface BoundaryAnalysis {
  primaryMessage: string;
  secondaryContext?: string;
  detectedSignals?: string[];
  supportiveNote?: string;
}

export interface BoundaryDetectionMessage extends Message {
  role: "boundary-detection";
  boundaryAnalysis: BoundaryAnalysis;
}

export interface BoundaryClarity {
  whatBoundaryCrossed: string;
  howItImpactsYou: string;
  howItAffectsRelationship: string;
  transitionLine: string;
}

export interface BoundaryClaritySummaryMessage extends Message {
  role: "boundary-clarity-summary";
  boundaryClarity: BoundaryClarity;
}

export interface DysfunctionalCommunicationMessage extends Message {
  role: "dysfunctional-communication";
  summary: string;
  patterns?: string[];
}

export interface RedFlagsMessage extends Message {
  role: "red-flags";
  introText: string;
  flags: { text: string }[];
}

export interface RewriteReplyCardMessage extends Message {
  role: "rewrite-reply-card";
  rewrittenReply: string;
  originalIntent: string;
}

export interface ImageContinuationMessage extends Message {
  role: "image-continuation";
  continuationSummary: string;
  whatChanged: string;
  approachShift?: string;
}

export interface DeepSearchLoadingMessage extends Message {
  role: "deep-search-loading";
  personName: string;
}

export interface DeepSearchResultMessage extends Message {
  role: "deep-search-result";
  searchResult: {
    id: string;
    timestamp: string;
    personContextId: string;
    searchQuery: string;
    sources: Array<{
      type: "social" | "professional" | "dating" | "legal" | "username" | "images" | "writing" | "location" | "archived" | "other";
      platform: string;
      url?: string;
      summary: string;
      relevantDetails: string[];
      isVerified?: boolean;
    }>;
    summary: string;
    alignmentNotes: string[];
    uncertainties: string[];
    rawResponse: string;
  };
  showSafetyResources?: boolean;
}

export interface PersonContextCardMessage extends Message {
  role: "person-context-card";
}

export type DeepSearchSuggestionState = "collapsed" | "input" | "running" | "results" | "error";

export interface DeepSearchSuggestionMessage extends Message {
  role: "deep-search-suggestion";
  suggestionState: DeepSearchSuggestionState;
  personContextId?: string; // If person context already exists
  searchResult?: DeepSearchResultMessage["searchResult"]; // Results when complete
  errorMessage?: string; // Error message if failed
}

export type ChatLoadingType = "chat" | "deep-search";
export type ChatLoadingState = "loading" | "success" | "error" | "cancelled";

export interface ChatLoadingMessage extends Message {
  role: "chat-loading";
  loadingType: ChatLoadingType;
  loadingState: ChatLoadingState;
  customAction?: string; // Override the action line
  errorMessage?: string; // Error message if failed
}

export type ChatMessage =
  | Message
  | AnalysisMessage
  | SuggestionsMessage
  | ImageAnalysisMessage
  | TypingMessage
  | EmotionalValidationMessage
  | QuickSummaryMessage
  | DeepAnalysisMessage
  | DirectionSelectorMessage
  | ToneSelectorMessage
  | TailoredGuidanceMessage
  | SuggestedReplyCardMessage
  | FaceScanPromptMessage
  | FaceScanCardMessage
  | EmotionScanResultMessage
  | ToneModulationCardMessage
  | ModulatedRepliesCardMessage
  | AddContextButtonMessage
  | InlineContextInputMessage
  | ReflectiveUnderstandingMessage
  | ContextOrDirectionChoiceMessage
  | VoiceEmotionScanResultMessage
  | BoundaryDetectionMessage
  | BoundaryClaritySummaryMessage
  | DysfunctionalCommunicationMessage
  | RedFlagsMessage
  | RewriteReplyCardMessage
  | ImageContinuationMessage
  | DeepSearchLoadingMessage
  | DeepSearchResultMessage
  | PersonContextCardMessage
  | DeepSearchSuggestionMessage
  | ChatLoadingMessage;
