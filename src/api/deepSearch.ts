/**
 * Deep Search Module for Person Context
 *
 * Searches publicly available information to help users gain clearer context
 * about a person they are dealing with. Results are presented in the chat loop
 * similar to Perplexity-style search results.
 */

import { PersonContext } from "../types/personContext";

// ============================================================================
// SYSTEM PROMPT - Deep Search Identity
// ============================================================================

export const DEEP_SEARCH_SYSTEM_PROMPT = `You are Klarity Deep Search.

Your role is to help the user gain clearer context about a person by reviewing:
- What the user has provided
- What appears publicly across the web including:
  • Social media platforms (LinkedIn, Instagram, Facebook, Twitter/X, TikTok)
  • Dating websites and apps (if profiles are public)
  • Professional directories and company pages
  • News articles and public records
  • Secondary or alternative online identities

CORE PRINCIPLES:
- You only use publicly accessible information
- You do NOT access private accounts, private databases, or hidden content
- You do NOT bypass privacy settings or provide instructions to do so
- You must be honest, calm, and non-judgmental
- You must not label someone's character or intent
- You must not diagnose, moralize, or speculate beyond what is supported

LANGUAGE RULES:
Avoid serious or analytical wording unless the user uses it first.
Do NOT use these words by default: tracking, pattern, signals, escalation, frequency, timeline, data points, analysis, diagnosis, red flags, toxic, suspicious.

Prefer everyday phrasing: keep in mind, taken together, this adds context, this helps explain, worth noticing, from what I found, publicly available, based on what's out there.

KEY FRAMING RULES:
- Finding something does not mean it is bad
- Not finding something does not mean it does not exist
- Your job is to surface alignment or misalignment with what the person has said or implied
- Multiple people might match - say so clearly if uncertain
- If nothing meaningful is found, say that plainly

OUTPUT STRUCTURE:
Present findings in a clear, organized way:
1. What was searched
2. What was found (organized by source type)
3. How it connects to what the user shared
4. What remains unclear or unverified

Always end by asking: "How does this sit with you?"`;

// ============================================================================
// DEVELOPER PROMPT - Search Guidance
// ============================================================================

export const DEEP_SEARCH_DEVELOPER_PROMPT = `SEARCH STRATEGY:
1. Start with the name + location/context if provided
2. Search professional networks (LinkedIn) for work-related context
3. Search social platforms for personal context
4. Look for consistency or inconsistency with what user shared
5. Note any secondary profiles or alternative names found

PRESENTATION FORMAT:
- Use clear headers for each source type
- Include relevant quotes or details sparingly
- Always note the source (e.g., "On LinkedIn..." or "A public Instagram shows...")
- Distinguish between verified and unverified information
- If profiles are private or not found, say so directly

SAFETY GUARDRAILS:
- Never encourage the user to create fake accounts to view private content
- Never suggest hacking, social engineering, or deception
- If the search reveals potentially dangerous information (criminal records, etc.), present factually without dramatizing
- If user seems to be in danger, prioritize safety resources over search results

TONE:
- Calm and matter-of-fact
- Like a thoughtful friend who looked something up for you
- Not like a private investigator or surveillance report`;

// ============================================================================
// USER PROMPT BUILDER
// ============================================================================

export interface DeepSearchInput {
  personContext: PersonContext;
  additionalSearchTerms?: string[];
  focusAreas?: ("social" | "professional" | "dating" | "news" | "general")[];
}

export function buildDeepSearchUserPrompt(input: DeepSearchInput): string {
  const { personContext, additionalSearchTerms = [], focusAreas = ["general"] } = input;

  const notes = personContext.notes.map((n) => n.content).join("\n- ");
  const searchTerms = additionalSearchTerms.length > 0
    ? `\nAdditional search terms: ${additionalSearchTerms.join(", ")}`
    : "";
  const focus = focusAreas.length > 0
    ? `\nFocus areas: ${focusAreas.join(", ")}`
    : "";

  return `Please search for publicly available information about this person:

NAME: ${personContext.name}
RELATIONSHIP TO USER: ${personContext.relationshipContext}

WHAT THE USER HAS SHARED:
- ${notes || "No specific notes provided"}

USER'S GOAL: ${personContext.userIntent || "Gain clarity"}
${searchTerms}
${focus}

Search for this person across public sources and help me understand:
1. Does what I find align with what the user has shared?
2. Is there anything worth noticing that adds context?
3. Are there any gaps or things that could not be verified?

Present findings clearly, note sources, and end by asking how this sits with the user.`;
}

// ============================================================================
// SEARCH RESULT TYPES
// ============================================================================

export interface DeepSearchResult {
  id: string;
  timestamp: string;
  personContextId: string;
  searchQuery: string;
  sources: DeepSearchSource[];
  summary: string;
  alignmentNotes: string[];
  uncertainties: string[];
  rawResponse: string;
}

export interface DeepSearchSource {
  type: "social" | "professional" | "dating" | "news" | "other";
  platform: string;
  url?: string;
  summary: string;
  relevantDetails: string[];
  isVerified: boolean;
}

// ============================================================================
// SEARCH QUERIES BUILDER
// ============================================================================

export function buildSearchQueries(personContext: PersonContext): string[] {
  const queries: string[] = [];
  const name = personContext.name;

  // Basic name search
  queries.push(`"${name}"`);

  // Add relationship context for better targeting
  if (personContext.relationshipContext === "work") {
    queries.push(`"${name}" LinkedIn professional`);
    queries.push(`"${name}" company employee`);
  } else if (personContext.relationshipContext === "dating") {
    queries.push(`"${name}" social media profile`);
  }

  // Search for name + any locations or companies mentioned in notes
  const notesText = personContext.notes.map((n) => n.content).join(" ");

  // Extract potential location mentions
  const locationPatterns = /(?:in|from|lives in|based in|works at|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g;
  let match;
  while ((match = locationPatterns.exec(notesText)) !== null) {
    queries.push(`"${name}" ${match[1]}`);
  }

  return queries.slice(0, 5); // Limit to 5 queries
}

// ============================================================================
// RESULT PARSER
// ============================================================================

export function parseDeepSearchResponse(
  response: string,
  personContextId: string,
  searchQuery: string
): DeepSearchResult {
  // Generate unique ID
  const id = `ds_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Basic parsing - in production this would be more sophisticated
  const sources: DeepSearchSource[] = [];

  // Check for platform mentions and extract
  const platformPatterns = [
    { regex: /LinkedIn[:\s]+(.*?)(?=\n\n|On [A-Z]|$)/gis, type: "professional" as const, platform: "LinkedIn" },
    { regex: /Instagram[:\s]+(.*?)(?=\n\n|On [A-Z]|$)/gis, type: "social" as const, platform: "Instagram" },
    { regex: /Facebook[:\s]+(.*?)(?=\n\n|On [A-Z]|$)/gis, type: "social" as const, platform: "Facebook" },
    { regex: /Twitter|X[:\s]+(.*?)(?=\n\n|On [A-Z]|$)/gis, type: "social" as const, platform: "Twitter/X" },
  ];

  for (const pattern of platformPatterns) {
    const matches = response.matchAll(pattern.regex);
    for (const match of matches) {
      sources.push({
        type: pattern.type,
        platform: pattern.platform,
        summary: match[1]?.trim().slice(0, 200) || "",
        relevantDetails: [],
        isVerified: false,
      });
    }
  }

  // Extract alignment notes (things that match what user shared)
  const alignmentNotes: string[] = [];
  const alignmentMatch = response.match(/align[s]?.*?:(.+?)(?=\n\n|What remains|$)/is);
  if (alignmentMatch) {
    alignmentNotes.push(alignmentMatch[1].trim());
  }

  // Extract uncertainties
  const uncertainties: string[] = [];
  const uncertaintyMatch = response.match(/(?:unclear|uncertain|could not verify|not found).*?:?(.+?)(?=\n\n|How does|$)/is);
  if (uncertaintyMatch) {
    uncertainties.push(uncertaintyMatch[1].trim());
  }

  // Generate summary
  const summaryMatch = response.match(/^(.+?)(?=\n\n)/);
  const summary = summaryMatch ? summaryMatch[1] : "Search completed.";

  return {
    id,
    timestamp: new Date().toISOString(),
    personContextId,
    searchQuery,
    sources,
    summary,
    alignmentNotes,
    uncertainties,
    rawResponse: response,
  };
}

// ============================================================================
// SAFETY CHECK
// ============================================================================

export interface SafetyCheckResult {
  isSafe: boolean;
  reason?: string;
  shouldShowResources?: boolean;
}

export function checkDeepSearchSafety(personContext: PersonContext): SafetyCheckResult {
  const notesText = personContext.notes.map((n) => n.content).join(" ").toLowerCase();

  // Check for immediate danger keywords
  const dangerKeywords = [
    "hit me", "hurting me", "threatened", "scared for my life",
    "stalking me", "following me", "weapon", "kill", "violence",
    "abuse", "hurt my kids", "restrained"
  ];

  const hasDangerKeywords = dangerKeywords.some((kw) => notesText.includes(kw));

  if (hasDangerKeywords) {
    return {
      isSafe: false,
      reason: "safety_concern",
      shouldShowResources: true,
    };
  }

  // Check for surveillance intent from user
  const surveillanceKeywords = [
    "track where", "follow them", "monitor their", "spy on",
    "without them knowing", "hack", "password", "break into"
  ];

  const hasSurveillanceIntent = surveillanceKeywords.some((kw) => notesText.includes(kw));

  if (hasSurveillanceIntent) {
    return {
      isSafe: false,
      reason: "surveillance_intent",
      shouldShowResources: false,
    };
  }

  return { isSafe: true };
}

// ============================================================================
// SAFETY RESOURCES
// ============================================================================

export const SAFETY_RESOURCES = {
  domesticViolence: {
    name: "National Domestic Violence Hotline",
    phone: "1-800-799-7233",
    text: "Text START to 88788",
    website: "thehotline.org",
  },
  crisis: {
    name: "988 Suicide & Crisis Lifeline",
    phone: "988",
    website: "988lifeline.org",
  },
  stalking: {
    name: "Stalking Prevention, Awareness, and Resource Center",
    website: "stalkingawareness.org",
  },
};

// ============================================================================
// NO RESULTS RESPONSE
// ============================================================================

export const NO_RESULTS_RESPONSE = `I searched for publicly available information about this person, but I was not able to find anything definitive.

This could mean:
- They have a common name and it is hard to identify the right person
- They keep a low online presence
- Their profiles may be set to private
- They may use a different name online

Not finding something does not mean there is nothing to find - it just means it is not easily accessible through public searches.

If you have more details that might help narrow things down (workplace, city, username), I can try again with more specific searches.

How does this sit with you?`;
