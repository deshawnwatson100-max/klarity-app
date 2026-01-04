/**
 * Deep Search Module for Person Context
 *
 * Searches publicly available information to help users gain clearer context
 * about a person they are dealing with. Results are presented in the chat loop
 * with a ChatGPT-style interface.
 */

import { PersonContext } from "../types/personContext";

// ============================================================================
// SYSTEM PROMPT - Deep Search Identity
// ============================================================================

export const DEEP_SEARCH_SYSTEM_PROMPT = `You are Klarity Deep Search.

Your job is to help the user explore what exists publicly about a person using a calm, simple tone — not a report, not an investigation.

WHAT THE USER PROVIDES:
- Name (or common name)
- Approximate location
- One contextual anchor if available (dating app, workplace, school, or username)
- Any optional usernames or details

HOW TO SEARCH:
Do a thorough web search like a careful human would:
- Try name variations and spellings
- Look across dating apps/websites and social platforms
- Check for reused usernames and public profiles
- Look for cached, archived, or indexed pages if relevant

PRESENT RESULTS IN A GOOGLE-STYLE FORMAT:
- Clean sections
- Simple cards
- Links and previews
- No conclusions or interpretations

DO NOT:
- Summarize meaning
- Label the person
- Rank importance
- Tell the user what to think

DO:
- Surface what exists publicly
- Group results by type (dating, social, other mentions)
- Link directly to the web so the user can explore
- Use neutral, human language

LANGUAGE:
Use everyday phrasing. Keep it simple and calm.
Avoid clinical or investigative language.

End by asking: "How does this sit with you?"
• Feels fine
• I'm unsure
• This feels like a lot

If the user wants help after exploring, assist only then.`;

// ============================================================================
// DEVELOPER PROMPT - Search Guidance
// ============================================================================

export const DEEP_SEARCH_DEVELOPER_PROMPT = `SEARCH EXECUTION:

Be thorough and methodical. Search like a careful human would.

SEARCH SEQUENCE:
1. Start with exact name in quotes: "First Last"
2. Add location if known: "First Last" + city/state
3. Search each major platform:
   - LinkedIn: "First Last" site:linkedin.com
   - Instagram: "First Last" OR @username site:instagram.com
   - Facebook: "First Last" site:facebook.com
   - Twitter/X: "First Last" site:twitter.com OR site:x.com
   - TikTok: "First Last" site:tiktok.com
4. Dating platforms:
   - Look for: Tinder, Bumble, Hinge, OkCupid, Match, POF
   - Search forums that discuss or screenshot dating profiles
5. If username provided:
   - Search that username across platforms
   - Look for reused usernames

OUTPUT FORMAT:
Group results by type:

**Dating**
- Platform name + direct link
- Brief description (1-2 lines max)

**Social**
- Platform name + direct link
- Brief description (1-2 lines max)

**Other Mentions**
- Source + direct link
- Brief description (1-2 lines max)

RULES:
- Always include the profile URL
- Keep descriptions brief and factual
- No interpretations or conclusions
- No labeling or judgment
- Let the user explore and decide

TONE:
Calm, neutral, helpful. Like showing someone search results.`;

// ============================================================================
// USER PROMPT BUILDER
// ============================================================================

export interface DeepSearchInput {
  personContext: PersonContext;
  additionalSearchTerms?: string[];
  focusAreas?: ("social" | "professional" | "dating" | "news" | "general")[];
}

export function buildDeepSearchUserPrompt(input: DeepSearchInput): string {
  const { personContext, additionalSearchTerms = [] } = input;

  // Safely build notes text - handle undefined or empty notes
  const notes = (personContext.notes || [])
    .map((n) => n?.content || "")
    .filter((content) => content.trim().length > 0)
    .join("\n- ");

  const additionalInfo = additionalSearchTerms.length > 0
    ? `\nAdditional details: ${additionalSearchTerms.join(", ")}`
    : "";

  return `Search for this person and show me what exists publicly.

NAME: ${personContext.name}
RELATIONSHIP: ${personContext.relationshipContext}
${personContext.userIntent ? `CONTEXT: ${personContext.userIntent}` : ""}

WHAT I KNOW:
${notes ? `- ${notes}` : "- No specific details provided"}
${additionalInfo}

Search dating apps, social media, and any other public sources. Group results by type (Dating, Social, Other). Include direct links to each profile found.

Keep it simple. Just show me what you find.`;
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
  confidence?: "high" | "medium" | "low";
}

// ============================================================================
// SEARCH QUERIES BUILDER
// ============================================================================

export function buildSearchQueries(personContext: PersonContext): string[] {
  const queries: string[] = [];
  const name = personContext.name || "";

  // Guard against empty name
  if (!name.trim()) {
    return ["person search"];
  }

  const nameParts = name.split(" ");

  // Exact name search
  queries.push(`"${name}"`);

  // First name only (if multi-part name)
  if (nameParts.length > 1) {
    queries.push(`"${nameParts[0]}"`);
  }

  // Platform-specific searches
  queries.push(`"${name}" site:linkedin.com`);
  queries.push(`"${name}" site:instagram.com`);
  queries.push(`"${name}" site:facebook.com`);

  // Dating-focused if relationship is dating/romantic
  if (personContext.relationshipContext === "dating" ||
      personContext.relationshipContext === "romantic") {
    queries.push(`"${name}" dating profile`);
    queries.push(`"${name}" tinder OR bumble OR hinge`);
  }

  // Extract locations and context from notes - safely handle undefined
  const notesText = (personContext.notes || [])
    .map((n) => n?.content || "")
    .join(" ");

  // Extract potential location mentions
  const locationPatterns = /(?:in|from|lives in|based in|works at|at|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g;
  let match;
  const locations: string[] = [];
  while ((match = locationPatterns.exec(notesText)) !== null) {
    locations.push(match[1]);
  }

  // Add location-based queries
  for (const location of locations.slice(0, 2)) {
    queries.push(`"${name}" ${location}`);
  }

  // Extract potential usernames (@ mentions or quoted names)
  const usernamePatterns = /@([a-zA-Z0-9_]+)|"([^"]+)"|username[:\s]+([a-zA-Z0-9_]+)/gi;
  while ((match = usernamePatterns.exec(notesText)) !== null) {
    const username = match[1] || match[2] || match[3];
    if (username && username !== name) {
      queries.push(`"${username}" OR @${username}`);
    }
  }

  // Remove duplicates and limit
  return [...new Set(queries)].slice(0, 8);
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

  const sources: DeepSearchSource[] = [];

  // Enhanced platform detection
  const platformPatterns = [
    { regex: /LinkedIn[:\s]+([\s\S]*?)(?=\n(?:Instagram|Facebook|Twitter|TikTok|Dating|Tinder|Bumble|Hinge|Reddit|[A-Z][a-z]+:)|$)/gi, type: "professional" as const, platform: "LinkedIn" },
    { regex: /Instagram[:\s]+([\s\S]*?)(?=\n(?:LinkedIn|Facebook|Twitter|TikTok|Dating|Tinder|Bumble|Hinge|Reddit|[A-Z][a-z]+:)|$)/gi, type: "social" as const, platform: "Instagram" },
    { regex: /Facebook[:\s]+([\s\S]*?)(?=\n(?:LinkedIn|Instagram|Twitter|TikTok|Dating|Tinder|Bumble|Hinge|Reddit|[A-Z][a-z]+:)|$)/gi, type: "social" as const, platform: "Facebook" },
    { regex: /(?:Twitter|X\.com|X)[:\s]+([\s\S]*?)(?=\n(?:LinkedIn|Instagram|Facebook|TikTok|Dating|Tinder|Bumble|Hinge|Reddit|[A-Z][a-z]+:)|$)/gi, type: "social" as const, platform: "Twitter/X" },
    { regex: /TikTok[:\s]+([\s\S]*?)(?=\n(?:LinkedIn|Instagram|Facebook|Twitter|Dating|Tinder|Bumble|Hinge|Reddit|[A-Z][a-z]+:)|$)/gi, type: "social" as const, platform: "TikTok" },
    { regex: /(?:Tinder|Bumble|Hinge|OkCupid|Match\.com|POF|Dating)[:\s]+([\s\S]*?)(?=\n(?:LinkedIn|Instagram|Facebook|Twitter|TikTok|Reddit|[A-Z][a-z]+:)|$)/gi, type: "dating" as const, platform: "Dating Profile" },
    { regex: /Reddit[:\s]+([\s\S]*?)(?=\n(?:LinkedIn|Instagram|Facebook|Twitter|TikTok|Dating|[A-Z][a-z]+:)|$)/gi, type: "social" as const, platform: "Reddit" },
  ];

  for (const pattern of platformPatterns) {
    const matches = response.matchAll(pattern.regex);
    for (const match of matches) {
      const content = match[1]?.trim();
      if (content && content.length > 10) {
        // Extract URL from content if present
        const urlMatch = content.match(/https?:\/\/[^\s)]+/);
        const url = urlMatch ? urlMatch[0] : undefined;

        sources.push({
          type: pattern.type,
          platform: pattern.platform,
          url,
          summary: content.slice(0, 300),
          relevantDetails: extractBulletPoints(content),
          isVerified: true,
        });
      }
    }
  }

  // Extract alignment notes
  const alignmentNotes: string[] = [];

  // Extract uncertainties
  const uncertainties: string[] = [];

  // Generate summary (first paragraph or first 2-3 sentences)
  const paragraphs = response.split("\n\n");
  let summary = paragraphs[0] || "Search completed.";
  if (summary.length > 400) {
    // Find a good cutoff point
    const sentences = summary.match(/[^.!?]+[.!?]+/g) || [];
    summary = sentences.slice(0, 3).join(" ");
  }

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

// Helper to extract bullet points from text
function extractBulletPoints(text: string): string[] {
  const bullets: string[] = [];
  const bulletPattern = /[-•]\s*(.+?)(?=\n[-•]|\n\n|$)/g;
  let match;
  while ((match = bulletPattern.exec(text)) !== null) {
    const point = match[1]?.trim();
    if (point && point.length > 5 && point.length < 200) {
      bullets.push(point);
    }
  }
  return bullets.slice(0, 5);
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
  // Safely get notes text - handle undefined or empty notes
  const notesText = (personContext.notes || [])
    .map((n) => n?.content || "")
    .join(" ")
    .toLowerCase();

  // Check for immediate danger keywords
  const dangerKeywords = [
    "hit me", "hurting me", "threatened", "scared for my life",
    "stalking me", "following me", "weapon", "kill", "violence",
    "abuse", "hurt my kids", "restrained", "choked", "punched",
    "afraid of him", "afraid of her", "scared of him", "scared of her"
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
    "without them knowing", "hack", "password", "break into",
    "access their account", "get into their"
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

export const NO_RESULTS_RESPONSE = `I did a thorough search for publicly available information about this person, but I was not able to find anything definitive.

What I searched:
- Their name (exact and variations) across major platforms
- LinkedIn, Instagram, Facebook, Twitter/X, TikTok
- Dating platforms and forums
- General web search with location details you provided

This could mean:
- They have a common name and it is hard to identify the right person without more details
- They keep a low online presence intentionally
- Their profiles are set to private
- They may use a different name or username online
- They might be newer to social media or have deleted old accounts

Not finding something does not mean there is nothing to find - it just means it is not easily accessible through public searches right now.

What might help narrow things down (only if you have this info):
- A username they use
- Their workplace or school
- The city they live in
- An approximate age range

How does this sit with you?`;
