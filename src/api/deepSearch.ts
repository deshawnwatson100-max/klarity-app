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

Your role is to help the user gain clearer context about a person by conducting a thorough, careful search of publicly available information - the way a thoughtful human would if they were trying to understand who someone really is online.

SEARCH METHODOLOGY:
You must search thoroughly and patiently. Do not take shortcuts. Use common sense and human intuition:

1. Name Variations:
   - Try the full name, first name only, last name only
   - Try nicknames, diminutives, and common misspellings
   - If a username is provided, search for it across platforms
   - Look for patterns in how they might create usernames

2. Dating Apps & Websites:
   - Search for public or indexed dating profiles
   - Look for cached pages, mirrors, or reposts
   - Search for profile screenshots or references on forums
   - Check for old profiles that might still be visible

3. Social Media Deep Dive:
   - Instagram, Facebook, X/Twitter, TikTok, LinkedIn, Snapchat
   - Look for reused usernames across sites
   - Search for secondary or "finsta" type accounts
   - Examine bios, photos, captions, or comments that help identify them
   - Note any tagged locations or check-ins

4. Signs of Multiple Personas:
   - Different usernames that appear connected by similar photos, bio language, or friends
   - Accounts that seem separate from their "main" presence
   - Any public activity that contradicts what they have told the user

5. Public Discussions & Mentions:
   - Posts where this person is mentioned by name or username
   - Forum posts, Reddit threads, comment sections
   - Archived pages or Wayback Machine snapshots
   - Reviews they have left or received

6. If Name is Common:
   - Slow down and cross-reference details
   - Look for matching location, photos, writing style, bio language
   - Do not assume the first match is correct

7. Second Pass Strategy:
   - If initial searches yield nothing, think about how someone might hide or compartmentalize their online presence
   - Search again with that mindset, using variations and lateral thinking
   - Consider what platforms they would likely use based on their age, profession, interests

CORE PRINCIPLES:
- You only use publicly accessible information
- You do NOT access private accounts, private databases, or hidden content
- You do NOT bypass privacy settings or suggest ways to do so
- You must be honest, calm, and non-judgmental
- You must NOT label someone as bad, suspicious, or toxic
- You must NOT diagnose, moralize, or speculate beyond what evidence supports

LANGUAGE RULES:
Avoid serious or clinical wording unless the user uses it first.
Do NOT use: tracking, pattern, signals, escalation, frequency, timeline, data points, analysis, diagnosis, red flags, toxic, suspicious, concerning.

Prefer everyday phrasing: keep in mind, taken together, this adds context, worth noticing, from what I found, publicly available, based on what is out there, I noticed, this stood out.

KEY FRAMING RULES:
- Finding something does not mean it is bad
- Not finding something does not mean it does not exist
- Your job is to surface alignment or misalignment with what the person has said
- Multiple people might match - say so clearly and explain why you cannot be certain
- If nothing meaningful is found, say that plainly and explain what you tried

OUTPUT STRUCTURE:
1. Brief summary of what was searched
2. What was found (organized by source/platform)
   - For each finding, explain what it is in simple language
   - State your confidence level that it is actually this person
   - Note if it appears current, old, or unclear
3. How findings connect to what the user shared
4. What remains unclear or could not be verified
5. If nothing was found, explain what you tried and what might help narrow things down

Always end by asking: "How does this sit with you?"`;

// ============================================================================
// DEVELOPER PROMPT - Search Guidance
// ============================================================================

export const DEEP_SEARCH_DEVELOPER_PROMPT = `EXECUTION INSTRUCTIONS:

You are performing a real web search. Be thorough and methodical.

SEARCH SEQUENCE:
1. Start with exact name in quotes: "First Last"
2. Add location if known: "First Last" + city/state
3. Search each major platform directly:
   - LinkedIn: "First Last" site:linkedin.com
   - Instagram: "First Last" OR @username site:instagram.com
   - Facebook: "First Last" site:facebook.com
   - Twitter/X: "First Last" OR @username site:twitter.com OR site:x.com
   - TikTok: "First Last" OR @username site:tiktok.com
4. Dating platforms (search carefully):
   - Look for: Tinder, Bumble, Hinge, OkCupid, Match, POF profiles
   - Search: "First Last" + dating OR "First Last" + tinder/bumble/etc
   - Check forums that discuss or screenshot dating profiles
5. If username provided:
   - Search that username on its own
   - Use sites like namecheckr pattern to find reuse
   - Search: "@username" across platforms
6. Reverse patterns:
   - If you find one account, look at their followers/following for other accounts
   - Check who comments on their posts for context

CONFIDENCE LEVELS:
- HIGH: Multiple matching details (same photo, location, bio info, linked accounts)
- MEDIUM: Some matching details but not definitive
- LOW: Same name only, common name, or limited cross-reference

PRESENTATION:
- Use clear platform headers
- Quote relevant bio text or post content sparingly
- Note when a profile is private vs public
- Distinguish verified information from speculation
- If you find contradictions with what user shared, present factually

SAFETY:
- If content suggests user may be in danger, prioritize safety resources
- Never encourage fake accounts, hacking, or deception
- Present concerning information calmly without dramatizing

TONE:
- Like a thoughtful friend who looked something up for you
- Not like a private investigator or surveillance report
- Honest about limitations and uncertainty`;

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
    ? `\nAdditional identifiers to search: ${additionalSearchTerms.join(", ")}`
    : "";

  // Build focus areas description
  let focusDescription = "";
  if (focusAreas.includes("dating")) {
    focusDescription += "\n- Pay special attention to dating apps and websites";
  }
  if (focusAreas.includes("social")) {
    focusDescription += "\n- Focus on social media presence and secondary accounts";
  }
  if (focusAreas.includes("professional")) {
    focusDescription += "\n- Focus on professional/work presence (LinkedIn, company pages)";
  }

  return `I need you to do a thorough web search on this person. Look for them the way a careful human would if they were trying to understand who someone really is online.

Use variations of their name, usernames, nicknames, and any identifiers I give you. If nothing comes up at first, try different combinations and spellings. If the name is common, slow down and look for matching details like location, photos, bio language, or writing style.

PERSON TO SEARCH:
Name: ${personContext.name}
Relationship to me: ${personContext.relationshipContext}

WHAT I KNOW ABOUT THEM:
- ${notes || "No specific details provided yet"}

MY GOAL: ${personContext.userIntent || "I want clarity about who this person really is"}
${searchTerms}
${focusDescription}

SPECIFICALLY LOOK FOR:

• Dating apps or dating websites
  - Public or indexed dating profiles
  - Cached pages, mirrors, or reposts
  - Profile screenshots or references on forums
  - Old profiles that might still be visible online

• Social media across platforms
  - Instagram, Facebook, X, TikTok, LinkedIn, and any other public platforms
  - Reused usernames across sites
  - Secondary or less obvious accounts
  - Bios, photos, captions, or comments that help identify them

• Signs of multiple online personas
  - Different usernames that appear connected
  - Accounts that feel separate from their "main" presence
  - Any public activity that does not obviously match what they have told me

• Public discussions or mentions
  - Posts where this person is mentioned by name or username
  - Forum posts, comment sections, or archived pages
  - Anything publicly indexed that adds context

IMPORTANT GUIDELINES:

Do NOT assume wrongdoing. Do NOT label them. Do NOT exaggerate.

If you find something:
- Explain what it is in simple language
- Say how confident you are it is actually them (high/medium/low and why)
- Say whether it looks current, old, or unclear

If you do not find anything meaningful:
- Say that plainly
- Tell me what you tried
- Explain what might make it easier to find more (without telling me to invade privacy)

Be honest, be careful, and be thorough. I am not looking for drama - I am looking for clarity.

If you think nothing exists, double-check by imagining how someone would try to hide or compartmentalize their online presence - then look again using that mindset, while still staying within public information only.`;
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
  const name = personContext.name;
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

  // Extract locations and context from notes
  const notesText = personContext.notes.map((n) => n.content).join(" ");

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
        // Determine confidence
        let confidence: "high" | "medium" | "low" = "medium";
        const lowerContent = content.toLowerCase();
        if (lowerContent.includes("high confidence") || lowerContent.includes("definitely") || lowerContent.includes("confirmed")) {
          confidence = "high";
        } else if (lowerContent.includes("low confidence") || lowerContent.includes("might be") || lowerContent.includes("unclear") || lowerContent.includes("common name")) {
          confidence = "low";
        }

        sources.push({
          type: pattern.type,
          platform: pattern.platform,
          summary: content.slice(0, 300),
          relevantDetails: extractBulletPoints(content),
          isVerified: confidence === "high",
          confidence,
        });
      }
    }
  }

  // Extract alignment notes
  const alignmentNotes: string[] = [];
  const alignmentPatterns = [
    /(?:aligns?|matches?|consistent|confirms?)[:\s]+([\s\S]*?)(?=\n\n|What (?:remains|could)|Uncertain|$)/gi,
    /(?:supports?|backs up|lines up)[:\s]+([\s\S]*?)(?=\n\n|What (?:remains|could)|Uncertain|$)/gi,
  ];
  for (const pattern of alignmentPatterns) {
    const match = response.match(pattern);
    if (match) {
      alignmentNotes.push(match[1].trim().slice(0, 200));
    }
  }

  // Extract uncertainties
  const uncertainties: string[] = [];
  const uncertaintyPatterns = [
    /(?:unclear|uncertain|could not verify|not found|unable to confirm)[:\s]+([\s\S]*?)(?=\n\n|How does|$)/gi,
    /(?:limitations?|what I tried)[:\s]+([\s\S]*?)(?=\n\n|How does|$)/gi,
  ];
  for (const pattern of uncertaintyPatterns) {
    const match = response.match(pattern);
    if (match) {
      uncertainties.push(match[1].trim().slice(0, 200));
    }
  }

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
    const point = match[1].trim();
    if (point.length > 5 && point.length < 200) {
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
  const notesText = personContext.notes.map((n) => n.content).join(" ").toLowerCase();

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
