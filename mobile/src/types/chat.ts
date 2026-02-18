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
  | "vibe-selector"
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
  | "deep-search-verification"
  | "person-context-card"
  | "deep-search-suggestion"
  | "deep-search-intro"
  | "deep-search-profile"
  | "deep-search-summary"
  | "deep-search-no-results"
  | "deep-dive-evaluation"
  | "deep-dive-follow-up"
  | "chat-loading"
  | "response-prompt"
  | "deep-decode-result"
  | "structured-analysis"
  | "pattern-mirror"
  | "decode-clarification-prompt";

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
  hasAnimated?: boolean; // Whether the typewriter animation has played for this message
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

export interface VibeOption {
  emoji: string;
  label: string;
  description?: string;
}

export interface ImageAnalysis {
  summary: string;
  labels: DysfunctionLabel[];
  emotionalImpact: string;
  suggestedResponse: string;
  guidanceNote?: string; // How the recipient will feel when they receive the suggested reply
  isInvalidInput?: boolean; // True when input is not a valid conversation to analyze
  lastMessage?: string; // The last message from the conversation
  acknowledgment?: string; // Kind acknowledgment of what is in the image
  vibes?: VibeOption[]; // Vibe options for "How do you want to show up in this conversation?"
  responseGuidance?: string; // Gentle explanation of how to respond effectively
  communicationMistake?: {
    // Common mistake to avoid (only present when relevant)
    mistake: string; // What the user might be tempted to do
    whyAvoid: string; // Why this approach doesn't work well
  };
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

export interface VibeSelectorMessage extends Message {
  role: "vibe-selector";
  acknowledgment: string; // The acknowledgment text shown above
  vibes: VibeOption[]; // The vibe options to choose from
  selectedVibe?: VibeOption; // The selected vibe (once chosen)
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
  responseGuidance?: string; // How to approach responding
  communicationMistake?: {
    mistake: string;
    whyAvoid: string;
  };
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

export type DeepSearchVerificationState = "verifying" | "completed" | "deep-diving";

export interface DeepSearchVerificationMessage extends Message {
  role: "deep-search-verification";
  personName: string;
  personContextId: string;
  sources: DeepSearchResultMessage["searchResult"]["sources"];
  verificationState: DeepSearchVerificationState;
  verifiedSources?: DeepSearchResultMessage["searchResult"]["sources"];
  rejectedSources?: DeepSearchResultMessage["searchResult"]["sources"];
}

export type DeepSearchSuggestionState = "collapsed" | "input" | "running" | "results" | "error";

export interface DeepSearchSuggestionMessage extends Message {
  role: "deep-search-suggestion";
  suggestionState: DeepSearchSuggestionState;
  personContextId?: string; // If person context already exists
  searchResult?: DeepSearchResultMessage["searchResult"]; // Results when complete
  errorMessage?: string; // Error message if failed
}

// New chat loop format message types for deep search
export interface DeepSearchIntroMessage extends Message {
  role: "deep-search-intro";
  personName: string;
  totalResults: number;
}

export interface DeepSearchProfileChatMessage extends Message {
  role: "deep-search-profile";
  source: DeepSearchResultMessage["searchResult"]["sources"][0];
  index: number;
  total: number;
  personContextId: string;
  verificationStatus?: "pending" | "verified" | "rejected";
}

export interface DeepSearchSummaryChatMessage extends Message {
  role: "deep-search-summary";
  personName: string;
  personContextId: string;
  verifiedCount: number;
  rejectedCount: number;
  totalCount: number;
  verifiedSources?: DeepSearchResultMessage["searchResult"]["sources"];
}

export interface DeepSearchNoResultsChatMessage extends Message {
  role: "deep-search-no-results";
  personName: string;
}

// Deep Dive Collaborative Flow Types
export type DeepDiveResultQuality = "strong" | "moderate" | "weak" | "no_results";

export interface DeepDiveEvaluationMessage extends Message {
  role: "deep-dive-evaluation";
  personName: string;
  personContextId: string;
  resultQuality: DeepDiveResultQuality;
  sourcesCount: number;
  acknowledgmentText: string;
  suggestFollowUp: boolean;
  followUpReason?: string;
  missingDataTypes?: string[]; // e.g., ["location", "username", "workplace"]
}

export interface DeepDiveFollowUpMessage extends Message {
  role: "deep-dive-follow-up";
  personName: string;
  personContextId: string;
  question: string;
  dataType: string; // e.g., "username", "location", "workplace"
  placeholder?: string;
  isOptional?: boolean;
  isSearchAgain?: boolean; // true if this is a "search again" flow (no verified sources)
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

export interface ResponsePromptMessage extends Message {
  role: "response-prompt";
  promptText: string; // The question to ask the user, e.g., "How do you want to respond?"
}

export interface DeepDecodeResultMessage extends Message {
  role: "deep-decode-result";
  decodeResult: {
    overview: string;
    healthScore: number;
    healthLabel: "Healthy" | "Mostly Healthy" | "Mixed Signals" | "Concerning" | "Toxic";
    tone: string;
    whatStandsOut: string;
    hiddenUndertones: {
      undertone: string;
      explanation: string;
    }[];
    suggestedResponses: {
      tone: string;
      response: string;
    }[];
    somethingToConsider: string;
  };
}

// ============================================
// STRUCTURED ANALYSIS TYPES
// ============================================

// Signal strength levels for clarity indicator
export type SignalStrength = "green" | "yellow" | "red";

// Reply style options for power move
export type ReplyStyle = "calm" | "direct" | "detached";

// Attachment style classifications
export type AttachmentStyle = "secure" | "anxious" | "avoidant" | "disorganized" | "unclear";

// Intent probability levels
export type IntentProbability = "genuine" | "uncertain" | "likely_avoidant" | "testing";

// Risk level for pattern tracking
export type PatternRisk = "low" | "moderate" | "high";

// Hidden subtext item
export interface HiddenSubtextItem {
  meaning: string;
  explanation: string;
}

// Power move reply option
export interface PowerMoveReply {
  style: ReplyStyle;
  message: string;
}

// Deeper pattern analysis (premium feature)
export interface DeeperPatternAnalysis {
  attachmentStyle: AttachmentStyle;
  attachmentExplanation: string;
  intentProbability: IntentProbability;
  intentExplanation: string;
  patternRisk: PatternRisk;
  patternRiskExplanation: string;
}

// Main structured analysis result
export interface StructuredAnalysisResult {
  // Section 1: Surface Meaning
  surfaceMeaning: string;

  // Section 2: Hidden Subtext (3-4 bullet points)
  hiddenSubtext: HiddenSubtextItem[];

  // Section 3: Signal Strength Indicator
  signalStrength: SignalStrength;
  signalLabel: string; // "Low Concern" | "Mixed Signals" | "Potential Red Flag"

  // Section 4: Power Move Recommendation
  powerMoveExplanation: string;
  powerMoveReplies: PowerMoveReply[];

  // Section 5: Deeper Pattern Analysis (optional/expandable)
  deeperPattern?: DeeperPatternAnalysis;

  // Contact name extracted from conversation (for personalization)
  contactName?: string;

  // Future scalability fields
  clarityScore?: number; // 1-100 for future implementation
  contactId?: string; // For tracking patterns per contact
}

// Message type for structured analysis
export interface StructuredAnalysisMessage extends Message {
  role: "structured-analysis";
  analysis: StructuredAnalysisResult;
}

// ============================================
// PATTERN MIRROR TYPES (DUAL-LAYER)
// ============================================

// Tracking scope for patterns
export type PatternScope = "contact" | "global";

// Behavioral signal types tracked across conversations
export type BehavioralSignalType =
  | "effort_ratio"           // Message length vs theirs
  | "double_texting"         // Sending multiple messages before response
  | "emotional_intensity"    // Escalation in emotional tone
  | "apology_frequency"      // Over-apologizing pattern
  | "follow_up_timing"       // How quickly they follow up
  | "response_speed"         // Response time imbalance
  // Positive signals
  | "consistent_pacing"      // Balanced response timing
  | "emotional_restraint"    // Controlled emotional expression
  | "balanced_effort"        // Proportional message investment
  | "boundary_maintenance"   // Clear limits preserved
  | "reduced_overexplaining" // Concise without over-justifying
  | "controlled_tone";       // Stable tone across exchanges

// Positive signal types for classification
export const POSITIVE_SIGNAL_TYPES: BehavioralSignalType[] = [
  "consistent_pacing",
  "emotional_restraint",
  "balanced_effort",
  "boundary_maintenance",
  "reduced_overexplaining",
  "controlled_tone",
];

// Individual signal occurrence
export interface BehavioralSignal {
  type: BehavioralSignalType;
  timestamp: number;
  context?: string;          // Brief context of when it occurred
  severity: "low" | "medium" | "high";
  contactId?: string;        // Optional: ties signal to specific contact
  contactName?: string;      // Optional: display name for contact
}

// Aggregated pattern from multiple signals
export interface BehavioralPattern {
  type: BehavioralSignalType;
  occurrences: number;
  lastSeen: number;
  avgSeverity: "low" | "medium" | "high";
  contexts: string[];        // Recent contexts where this appeared
  contactId?: string;        // If set, this is a contact-specific pattern
  contactName?: string;      // Display name for contact-specific patterns
}

// Pattern Mirror insight output
export interface PatternMirrorInsight {
  patternType: BehavioralSignalType;
  scope: PatternScope;                // "contact" or "global"
  behavioralInsight: string;          // "Across recent exchanges with [Name]..." or "Across multiple conversations..."
  strategicInterpretation: string;    // How this affects dynamics
  growthAdjustment: string;           // Calm strategic advice
  occurrenceCount: number;
  impactLevel: "moderate" | "significant";
  contactName?: string;               // For contact-specific insights
  globalReinforcement?: string;       // Optional: if global pattern also exists
}

// Message type for pattern mirror insights
export interface PatternMirrorMessage extends Message {
  role: "pattern-mirror";
  insight: PatternMirrorInsight;
}

// ============================================
// DECODE CLARIFICATION TYPES
// ============================================

// Decode clarification conversation prompt
export interface DecodeClarificationPromptMessage extends Message {
  role: "decode-clarification-prompt";
  promptQuestion: string;           // The clarifying question Klarity asks
  toneContext: string;              // Main tone detected from the conversation (e.g., "confusing", "frustrating")
  topicContext?: string;            // What part of the text is being referenced
  turnsRemaining: number;           // How many turns left in the clarification (max 3)
  clarificationId: string;          // Links messages in the same clarification session
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
  | VibeSelectorMessage
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
  | DeepSearchVerificationMessage
  | PersonContextCardMessage
  | DeepSearchSuggestionMessage
  | DeepSearchIntroMessage
  | DeepSearchProfileChatMessage
  | DeepSearchSummaryChatMessage
  | DeepSearchNoResultsChatMessage
  | DeepDiveEvaluationMessage
  | DeepDiveFollowUpMessage
  | ChatLoadingMessage
  | ResponsePromptMessage
  | DeepDecodeResultMessage
  | StructuredAnalysisMessage
  | PatternMirrorMessage
  | DecodeClarificationPromptMessage;
