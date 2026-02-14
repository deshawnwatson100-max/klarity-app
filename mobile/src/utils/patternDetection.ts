import { BehavioralSignalType } from "../types/chat";

interface DetectedSignal {
  type: BehavioralSignalType;
  severity: "low" | "medium" | "high";
  context: string;
}

// Analyze user message for behavioral patterns
export function detectBehavioralSignals(
  userMessage: string,
  conversationHistory: { role: "user" | "assistant"; content: string }[]
): DetectedSignal[] {
  const signals: DetectedSignal[] = [];
  const lowerMessage = userMessage.toLowerCase();

  // Get recent user messages
  const recentUserMessages = conversationHistory
    .filter((m) => m.role === "user")
    .slice(-5);

  // 1. Double texting detection
  // Check if last message was also from user (double text pattern)
  if (conversationHistory.length > 0) {
    const lastMessage = conversationHistory[conversationHistory.length - 1];
    if (lastMessage.role === "user") {
      signals.push({
        type: "double_texting",
        severity: "medium",
        context: "Sent another message before receiving a response",
      });
    }
  }

  // 2. Apology frequency detection
  const apologyPatterns = [
    /\b(i'?m sorry|sorry|apologize|my bad|my fault)\b/i,
    /\b(didn'?t mean to|hope i didn'?t|if i did something)\b/i,
  ];

  for (const pattern of apologyPatterns) {
    if (pattern.test(lowerMessage)) {
      // Check if they've apologized recently
      const recentApologies = recentUserMessages.filter((m) =>
        apologyPatterns.some((p) => p.test(m.content.toLowerCase()))
      ).length;

      signals.push({
        type: "apology_frequency",
        severity: recentApologies >= 2 ? "high" : "medium",
        context: "Apologized in message",
      });
      break;
    }
  }

  // 3. Emotional intensity detection
  const emotionalPatterns = [
    /\b(they don'?t care|they'?re ignoring|clearly|obviously|definitely|always|never)\b/i,
    /\b(hate|can'?t stand|so frustrated|so angry|so upset|sick of)\b/i,
    /!{2,}|\?{2,}/,
    /\b(wtf|omg|seriously)\b/i,
  ];

  const emotionalMatches = emotionalPatterns.filter((p) => p.test(lowerMessage));
  if (emotionalMatches.length >= 2) {
    signals.push({
      type: "emotional_intensity",
      severity: "high",
      context: "High emotional language detected",
    });
  } else if (emotionalMatches.length === 1) {
    signals.push({
      type: "emotional_intensity",
      severity: "medium",
      context: "Elevated emotional tone",
    });
  }

  // 4. Reassurance seeking detection
  const reassurancePatterns = [
    /\b(are we okay|is everything okay|do you still|are you mad)\b/i,
    /\b(need to know|just tell me|please tell me|i need them to)\b/i,
    /\b(worried that|scared that|afraid that|anxious about)\b/i,
  ];

  for (const pattern of reassurancePatterns) {
    if (pattern.test(lowerMessage)) {
      signals.push({
        type: "follow_up_timing",
        severity: "medium",
        context: "Seeking reassurance or confirmation",
      });
      break;
    }
  }

  // 5. Effort ratio detection (message length comparison)
  // This is a simplified version - in production you'd compare against their messages
  if (userMessage.length > 300) {
    const mentionedShortResponse =
      /\b(they (just )?said|they (only )?replied|their (message|text|response))\b/i.test(
        lowerMessage
      ) && /\b(short|brief|one word|just|only)\b/i.test(lowerMessage);

    if (mentionedShortResponse) {
      signals.push({
        type: "effort_ratio",
        severity: "medium",
        context: "Long message discussing their short response",
      });
    }
  }

  // 6. Monitoring/checking behavior
  const monitoringPatterns = [
    /\b(keep(s)? checking|checked (again|multiple)|seen my message|read receipt)\b/i,
    /\b(online but|active but|was online|last seen)\b/i,
    /\b(waiting for|still waiting|haven'?t heard|no response)\b/i,
  ];

  for (const pattern of monitoringPatterns) {
    if (pattern.test(lowerMessage)) {
      signals.push({
        type: "response_speed",
        severity: "medium",
        context: "Monitoring response behavior",
      });
      break;
    }
  }

  return signals;
}

// Check if the user's message shows over-investment patterns
export function detectOverInvestment(
  userMessage: string,
  conversationHistory: { role: "user" | "assistant"; content: string }[]
): boolean {
  const signals = detectBehavioralSignals(userMessage, conversationHistory);

  // Count high-severity signals
  const highSeverityCount = signals.filter((s) => s.severity === "high").length;
  const totalSignals = signals.length;

  return highSeverityCount >= 1 || totalSignals >= 2;
}
