/**
 * Decode Chat Loop - Subtle Emoji Integration
 *
 * Purpose: Add minimal, intentional emoji usage to the decode chat loop
 * to increase warmth, clarity, and engagement while maintaining a premium, professional tone.
 *
 * Rules:
 * - Emojis appear only in the decode chat loop
 * - Never in headers, buttons, navigation, or input placeholders
 * - Emojis are never decorative — they must add meaning
 * - Never more than one emoji per message block
 * - Emojis appear at start of section or end of short insight, never mid-sentence
 */

/**
 * Approved emoji set - Professional, Neutral
 */
export const DECODE_EMOJIS = {
  INSIGHT: "🧠", // Insight / understanding
  BALANCE: "⚖️", // Balance / nuance / fairness
  RED_FLAG: "🚩", // Red flags (only inside Red Flags card)
  COMMUNICATION: "💬", // Communication / conversation
  CLARITY: "🔍", // Clarity / noticing something subtle
  GUIDANCE: "🧭", // Direction / guidance
  COOPERATION: "🤝", // Mutual respect / cooperation
} as const;

type EmojiType = keyof typeof DECODE_EMOJIS;

/**
 * Patterns that indicate where an emoji might be appropriate
 */
const EMOJI_PATTERNS: Record<EmojiType, RegExp[]> = {
  INSIGHT: [
    /^(there['']?s a pattern|what stands out|i['']?m noticing|what i['']?m hearing|something interesting)/i,
    /pattern.*(here|emerging|showing|shifting)/i,
    /responsibility.*(being shifted|deflected)/i,
  ],
  BALANCE: [
    /^(it could be|on one hand|both|there may be)/i,
    /nuance|balance|perspective|consider.*both/i,
  ],
  RED_FLAG: [], // Only used explicitly in RedFlagsCard header
  COMMUNICATION: [
    /conversation|communicat|dialogue|talking|discussing/i,
    /what.*said|message|text|response/i,
  ],
  CLARITY: [
    /^(this new message|looking at this|noticing)/i,
    /adds.*pressure|subtle|underlying|beneath the surface/i,
  ],
  GUIDANCE: [
    /^(if your goal|one approach|moving forward|a way to)/i,
    /calm consistency|matter more|direction|next step/i,
  ],
  COOPERATION: [
    /mutual|respect|together|cooperation|understanding each other/i,
  ],
};

/**
 * Determines if a text block should have an emoji prefix
 * Returns the appropriate emoji or null if none should be added
 *
 * @param text - The text to analyze
 * @param context - Optional context about the message type
 */
export function getDecodeEmoji(
  text: string,
  context?: "insight" | "guidance" | "red-flag" | "clarity" | "balance"
): string | null {
  // If explicit context is provided, use the appropriate emoji
  if (context) {
    switch (context) {
      case "insight":
        return DECODE_EMOJIS.INSIGHT;
      case "guidance":
        return DECODE_EMOJIS.GUIDANCE;
      case "red-flag":
        return DECODE_EMOJIS.RED_FLAG;
      case "clarity":
        return DECODE_EMOJIS.CLARITY;
      case "balance":
        return DECODE_EMOJIS.BALANCE;
    }
  }

  // Check text against patterns
  const firstSentence = text.split(/[.!?]/)[0] || text;

  // Check for insight patterns
  if (EMOJI_PATTERNS.INSIGHT.some((pattern) => pattern.test(firstSentence))) {
    return DECODE_EMOJIS.INSIGHT;
  }

  // Check for guidance patterns
  if (EMOJI_PATTERNS.GUIDANCE.some((pattern) => pattern.test(firstSentence))) {
    return DECODE_EMOJIS.GUIDANCE;
  }

  // Check for clarity patterns
  if (EMOJI_PATTERNS.CLARITY.some((pattern) => pattern.test(firstSentence))) {
    return DECODE_EMOJIS.CLARITY;
  }

  // Check for balance patterns
  if (EMOJI_PATTERNS.BALANCE.some((pattern) => pattern.test(firstSentence))) {
    return DECODE_EMOJIS.BALANCE;
  }

  return null;
}

/**
 * Adds a subtle emoji to the beginning of a decode response if appropriate
 * Only adds one emoji, and only if the text matches specific patterns
 *
 * @param text - The response text
 * @param forceEmoji - Optional emoji type to force
 */
export function addDecodeEmoji(
  text: string,
  forceEmoji?: "insight" | "guidance" | "red-flag" | "clarity" | "balance"
): string {
  // Don't add emoji if text already starts with an emoji
  const startsWithEmoji = /^[\u{1F300}-\u{1F9FF}]/u.test(text.trim());
  if (startsWithEmoji) {
    return text;
  }

  const emoji = getDecodeEmoji(text, forceEmoji);

  if (emoji) {
    return `${emoji} ${text}`;
  }

  return text;
}

/**
 * Checks if a response text should receive an insight emoji based on content
 * Used for Communication Pattern Insights
 */
export function isInsightText(text: string): boolean {
  const insightIndicators = [
    /pattern/i,
    /responsibility.*(shift|deflect)/i,
    /what.*happening/i,
    /dynamic/i,
    /notice|noticing/i,
    /stands out/i,
  ];

  return insightIndicators.some((pattern) => pattern.test(text));
}

/**
 * Checks if a response text is guidance-oriented
 * Used for End-of-Loop Guidance in Decode mode
 */
export function isGuidanceText(text: string): boolean {
  const guidanceIndicators = [
    /if your goal/i,
    /one approach/i,
    /moving forward/i,
    /consistency.*matter/i,
    /might help/i,
    /consider.*approach/i,
  ];

  return guidanceIndicators.some((pattern) => pattern.test(text));
}

/**
 * Checks if text is acknowledging new context
 * Used for Context Acknowledgment
 */
export function isContextAcknowledgment(text: string): boolean {
  const contextIndicators = [
    /this new message/i,
    /adds.*pressure/i,
    /wasn['']?t present earlier/i,
    /new information/i,
    /context.*changed/i,
  ];

  return contextIndicators.some((pattern) => pattern.test(text));
}

/**
 * Processes a decode response to add appropriate emojis
 * Only adds emojis to specific parts of the response:
 * - First paragraph if it's an insight
 * - Last paragraph if it's guidance
 *
 * @param response - The full response text
 */
export function processDecodeResponseWithEmoji(response: string): string {
  const paragraphs = response.split(/\n\n+/);

  if (paragraphs.length === 0) {
    return response;
  }

  // Check if the first paragraph is an insight
  const firstParagraph = paragraphs[0].trim();
  if (isInsightText(firstParagraph)) {
    paragraphs[0] = addDecodeEmoji(firstParagraph, "insight");
    return paragraphs.join("\n\n");
  }

  // Check if this is context acknowledgment
  if (isContextAcknowledgment(firstParagraph)) {
    paragraphs[0] = addDecodeEmoji(firstParagraph, "clarity");
    return paragraphs.join("\n\n");
  }

  // Check if the last paragraph is guidance
  if (paragraphs.length > 1) {
    const lastParagraph = paragraphs[paragraphs.length - 1].trim();
    if (isGuidanceText(lastParagraph)) {
      paragraphs[paragraphs.length - 1] = addDecodeEmoji(lastParagraph, "guidance");
      return paragraphs.join("\n\n");
    }
  }

  // No emoji added if nothing matches
  return response;
}
