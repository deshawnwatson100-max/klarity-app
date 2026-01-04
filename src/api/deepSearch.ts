/**
 * Deep Search Module for Person Context
 *
 * Searches publicly available information to help users gain clearer context
 * about a person they are dealing with. Results are presented in the chat loop
 * with a ChatGPT-style interface.
 */

import { PersonContext, DeepSearchExtendedContext } from "../types/personContext";

// ============================================================================
// SEARCH CATEGORIES - All 9 areas that must be covered
// ============================================================================

export const SEARCH_CATEGORIES = {
  DATING: "dating",
  SOCIAL_MEDIA: "social_media",
  LEGAL_PUBLIC_RECORDS: "legal_public_records",
  PROFESSIONAL: "professional",
  USERNAME_ALIAS: "username_alias",
  IMAGES_VISUAL: "images_visual",
  PUBLIC_WRITING: "public_writing",
  LOCATION_HISTORY: "location_history",
  ARCHIVED_CACHED: "archived_cached",
} as const;

export type SearchCategory = typeof SEARCH_CATEGORIES[keyof typeof SEARCH_CATEGORIES];

// ============================================================================
// SYSTEM PROMPT - Deep Search Identity
// ============================================================================

export const DEEP_SEARCH_SYSTEM_PROMPT = `You are Klarity Deep Search.

Your job is to help the user explore what exists publicly about a person using a calm, simple tone — not a report, not an investigation.

WHAT THE USER PROVIDES:
- Name (or common name)
- Approximate location
- One contextual anchor if available (dating app, workplace, school, or username)
- Any optional details like county, middle name, previous locations, professional info, or aliases

HOW TO SEARCH - BE THOROUGH:
You MUST search ALL of the following 9 categories. Do not stop after finding something in one category. Complete a thorough search across all areas:

1. DATING SITES AND APPS
   - Search for publicly indexed dating profiles
   - Look for SEO mirrors, cached pages, archived snapshots of dating profiles
   - Check for reused usernames or photos associated with dating platforms
   - Search: Tinder, Bumble, Hinge, OkCupid, Match, POF, and lesser-known apps

2. SOCIAL MEDIA PRESENCE
   - Major platforms: Instagram, Facebook, X/Twitter, TikTok, LinkedIn
   - Secondary platforms: Reddit, Snapchat public stories, Pinterest, Threads
   - Look for username reuse across platforms
   - Search public bios, posts, images, and comments

3. LEGAL AND PUBLIC RECORDS
   - Court case portals (civil and criminal)
   - Jail or booking records where publicly posted
   - State or federal inmate/DOC lookup pages
   - Publicly available press releases or news articles
   - Official .gov sources when available
   - If county/region provided, search that specific jurisdiction

4. PROFESSIONAL AND BUSINESS FOOTPRINT
   - Company websites and staff bios
   - LinkedIn and professional directories
   - Business registrations and public filings
   - Professional licenses where searchable
   - Industry-specific directories

5. USERNAME AND ALIAS REUSE
   - Search each known username across multiple sites
   - Look for variations of usernames that appear connected
   - Check old or secondary usernames that remain publicly indexed
   - Use tools like searching "username site:twitter.com" or similar

6. IMAGES AND VISUAL FOOTPRINT
   - Public profile photos reused across platforms
   - Image search results and thumbnails
   - Archived or cached image pages

7. PUBLIC WRITING AND COMMENTS
   - Blog posts, Medium articles, guest posts
   - Forum posts, Reddit comments, Quora answers
   - Any publicly indexed written content tied to the name or username

8. LOCATION HISTORY SIGNALS
   - Locations mentioned in bios, profiles, or posts
   - Changes in listed cities over time
   - Public check-ins or tagged locations

9. ARCHIVED AND CACHED PAGES
   - Wayback Machine snapshots
   - Cached search results
   - Deleted but still indexed pages

PRESENT RESULTS IN A GOOGLE-STYLE FORMAT:
- Clean sections for each category where something was found
- Simple cards with source links
- Links and previews where available
- State clearly when nothing was found in a category

DO NOT:
- Summarize meaning
- Label the person as good, bad, safe, or unsafe
- Rank importance
- Tell the user what to think
- Interpret results
- Collapse uncertainty into certainty

DO:
- Surface what exists publicly
- Group results by category
- Link directly to the web so the user can explore
- Use neutral, human language
- State clearly if identity is unclear (treat as possible matches)
- State clearly if nothing meaningful was found in a category

LANGUAGE:
Use everyday phrasing. Keep it simple and calm.
Avoid clinical or investigative language.

End by asking: "How does this sit with you?"
• Feels fine
• I am unsure
• This feels like a lot

If the user wants help after exploring, assist only then.`;

// ============================================================================
// DEVELOPER PROMPT - Search Guidance
// ============================================================================

export const DEEP_SEARCH_DEVELOPER_PROMPT = `SEARCH EXECUTION:

Be thorough and methodical. Search like a careful human would. Do NOT stop after one pass.

MULTI-PASS SEARCH STRATEGY:
You must perform multiple search passes using different query variations. For each category:
- Try exact name in quotes: "First Last"
- Try name + location: "First Last" + city/state
- Try name + county if provided
- Try name variations (with/without middle name/initial)
- Try each known username independently
- Try aliases if provided

SEARCH SEQUENCE BY CATEGORY:

1. DATING SITES AND APPS:
   - "First Last" dating profile
   - "First Last" tinder OR bumble OR hinge OR okcupid OR match
   - Search dating profile screenshot forums
   - Check cached dating profile pages

2. SOCIAL MEDIA:
   - "First Last" site:linkedin.com
   - "First Last" OR @username site:instagram.com
   - "First Last" site:facebook.com
   - "First Last" site:twitter.com OR site:x.com
   - "First Last" site:tiktok.com
   - "First Last" site:reddit.com
   - Check each username variation across all platforms

3. LEGAL AND PUBLIC RECORDS:
   - "First Last" court case
   - "First Last" arrest OR booking
   - "First Last" + county + court records
   - "First Last" site:*.gov
   - "First Last" inmate OR jail
   - "First Last" lawsuit OR defendant OR plaintiff

4. PROFESSIONAL:
   - "First Last" site:linkedin.com
   - "First Last" + company name or role if provided
   - "First Last" business license
   - "First Last" professional directory

5. USERNAME/ALIAS:
   - Search each known username/alias independently
   - "@username" across multiple platform searches
   - "username" site:twitter.com, site:instagram.com, site:reddit.com, etc.

6. IMAGES:
   - Search profile images if URLs known
   - "First Last" photo OR image OR profile picture

7. PUBLIC WRITING:
   - "First Last" site:medium.com
   - "First Last" site:quora.com
   - "First Last" blog OR article OR post
   - "First Last" site:reddit.com comment

8. LOCATION HISTORY:
   - "First Last" lives in [city]
   - Check for location changes in profiles
   - "First Last" moved from [previous location] if provided

9. ARCHIVED/CACHED:
   - "First Last" site:web.archive.org
   - Search for deleted profiles or posts

OUTPUT FORMAT:
Group results by category:

**Dating**
- Platform name + direct link
- Brief description (1-2 lines max)
- Note if this is a possible match vs confirmed

**Social Media**
- Platform name + direct link
- Brief description (1-2 lines max)

**Legal & Public Records**
- Source + direct link
- Brief description (1-2 lines max)

**Professional**
- Source + direct link
- Brief description (1-2 lines max)

**Username/Alias Matches**
- Platform + link
- Brief description

**Images**
- Source + link
- Brief description

**Public Writing**
- Source + link
- Brief description

**Location Signals**
- What was found and where

**Archived/Cached**
- Source + link
- Brief description

**Nothing Found**
- List categories where nothing was found

RULES:
- Always include the profile URL when available
- Keep descriptions brief and factual
- No interpretations or conclusions
- No labeling or judgment
- Let the user explore and decide
- If identity is unclear, say "possible match" not "confirmed"

TONE:
Calm, neutral, helpful. Like showing someone search results.`;

// ============================================================================
// USER PROMPT BUILDER
// ============================================================================

export interface DeepSearchInput {
  personContext: PersonContext;
  additionalSearchTerms?: string[];
  focusAreas?: SearchCategory[];
}

export function buildDeepSearchUserPrompt(input: DeepSearchInput): string {
  const { personContext, additionalSearchTerms = [] } = input;

  // Safely build notes text - handle undefined or empty notes
  const notes = (personContext.notes || [])
    .map((n) => n?.content || "")
    .filter((content) => content.trim().length > 0)
    .join("\n- ");

  const additionalInfo = additionalSearchTerms.length > 0
    ? `\nAdditional search terms: ${additionalSearchTerms.join(", ")}`
    : "";

  // Build extended context section
  let extendedContextSection = "";
  const ext = personContext.extendedContext;
  if (ext) {
    const extParts: string[] = [];
    if (ext.countyOrRegion) {
      extParts.push(`County/Region: ${ext.countyOrRegion}`);
    }
    if (ext.middleNameOrInitial) {
      extParts.push(`Middle name/initial: ${ext.middleNameOrInitial}`);
    }
    if (ext.previousLocation) {
      extParts.push(`Previous location: ${ext.previousLocation}`);
    }
    if (ext.professionalInfo) {
      extParts.push(`Professional info: ${ext.professionalInfo}`);
    }
    if (ext.knownAliases && ext.knownAliases.length > 0) {
      extParts.push(`Known aliases/usernames: ${ext.knownAliases.join(", ")}`);
    }
    if (extParts.length > 0) {
      extendedContextSection = `\n\nEXTENDED DETAILS:\n${extParts.join("\n")}`;
    }
  }

  // Build location section
  let locationSection = "";
  if (personContext.location) {
    locationSection = `\nLOCATION: ${personContext.location}`;
  }

  // Build context anchor section
  let anchorSection = "";
  if (personContext.contextAnchor) {
    const anchorLabels: Record<string, string> = {
      workplace: "Workplace",
      school: "School",
      dating_app: "Dating app",
      username: "Known username",
    };
    anchorSection = `\n${anchorLabels[personContext.contextAnchor.type] || "Context"}: ${personContext.contextAnchor.value}`;
  }

  // Build boost section
  let boostSection = "";
  const boostParts: string[] = [];
  if (personContext.knownUsername) {
    boostParts.push(`Known username: ${personContext.knownUsername}`);
  }
  if (personContext.approximateAge) {
    boostParts.push(`Approximate age: ${personContext.approximateAge}`);
  }
  if (boostParts.length > 0) {
    boostSection = `\n\nADDITIONAL DETAILS:\n${boostParts.join("\n")}`;
  }

  return `Search for this person and show me what exists publicly. Be thorough - search ALL 9 categories.

NAME: ${personContext.name}
RELATIONSHIP: ${personContext.relationshipContext}
${personContext.userIntent ? `CONTEXT: ${personContext.userIntent}` : ""}${locationSection}${anchorSection}${boostSection}${extendedContextSection}

WHAT I KNOW:
${notes ? `- ${notes}` : "- No specific details provided"}
${additionalInfo}

Search ALL categories:
1. Dating sites and apps
2. Social media presence
3. Legal and public records
4. Professional and business footprint
5. Username and alias reuse
6. Images and visual footprint
7. Public writing and comments
8. Location history signals
9. Archived and cached pages

Use multiple query variations (name, location, username, platform-specific queries). Do not stop after a single pass.

If identity is unclear, treat results as possible matches rather than confirmed.
If nothing meaningful is found in any category, state this clearly.

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
  type: "social" | "professional" | "dating" | "legal" | "username" | "images" | "writing" | "location" | "archived" | "other";
  platform: string;
  url?: string;
  summary: string;
  relevantDetails: string[];
  isVerified: boolean;
  confidence?: "high" | "medium" | "low";
}

// ============================================================================
// SEARCH QUERIES BUILDER - Multi-pass strategy for all 9 categories
// ============================================================================

export function buildSearchQueries(personContext: PersonContext): string[] {
  const queries: string[] = [];
  const name = personContext.name || "";

  // Guard against empty name
  if (!name.trim()) {
    return ["person search"];
  }

  const nameParts = name.split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

  // Build name with middle name/initial if available
  let fullNameWithMiddle = name;
  if (personContext.extendedContext?.middleNameOrInitial) {
    const middle = personContext.extendedContext.middleNameOrInitial;
    if (nameParts.length >= 2) {
      fullNameWithMiddle = `${firstName} ${middle} ${lastName}`;
    }
  }

  // === PASS 1: Basic name queries ===
  queries.push(`"${name}"`);
  if (fullNameWithMiddle !== name) {
    queries.push(`"${fullNameWithMiddle}"`);
  }

  // === PASS 2: Name + Location combinations ===
  if (personContext.location) {
    queries.push(`"${name}" ${personContext.location}`);
  }
  if (personContext.extendedContext?.countyOrRegion) {
    queries.push(`"${name}" ${personContext.extendedContext.countyOrRegion}`);
  }
  if (personContext.extendedContext?.previousLocation) {
    queries.push(`"${name}" ${personContext.extendedContext.previousLocation}`);
  }

  // === PASS 3: Social Media Platform searches ===
  queries.push(`"${name}" site:linkedin.com`);
  queries.push(`"${name}" site:instagram.com`);
  queries.push(`"${name}" site:facebook.com`);
  queries.push(`"${name}" site:twitter.com OR site:x.com`);
  queries.push(`"${name}" site:tiktok.com`);
  queries.push(`"${name}" site:reddit.com`);

  // === PASS 4: Dating platforms ===
  queries.push(`"${name}" dating profile`);
  queries.push(`"${name}" tinder OR bumble OR hinge OR okcupid OR match`);
  if (personContext.contextAnchor?.type === "dating_app" && personContext.contextAnchor.value) {
    queries.push(`"${name}" ${personContext.contextAnchor.value}`);
  }

  // === PASS 5: Legal and public records ===
  queries.push(`"${name}" court case OR lawsuit`);
  queries.push(`"${name}" arrest OR booking record`);
  if (personContext.extendedContext?.countyOrRegion) {
    queries.push(`"${name}" ${personContext.extendedContext.countyOrRegion} court records`);
  }
  queries.push(`"${name}" site:*.gov`);

  // === PASS 6: Professional searches ===
  if (personContext.extendedContext?.professionalInfo) {
    queries.push(`"${name}" ${personContext.extendedContext.professionalInfo}`);
  }
  if (personContext.contextAnchor?.type === "workplace" && personContext.contextAnchor.value) {
    queries.push(`"${name}" ${personContext.contextAnchor.value}`);
  }
  queries.push(`"${name}" business license OR professional directory`);

  // === PASS 7: Username/Alias searches ===
  if (personContext.knownUsername) {
    const username = personContext.knownUsername.replace("@", "");
    queries.push(`"${username}" OR @${username}`);
    queries.push(`${username} site:instagram.com`);
    queries.push(`${username} site:twitter.com OR site:x.com`);
    queries.push(`${username} site:reddit.com`);
  }
  if (personContext.extendedContext?.knownAliases) {
    for (const alias of personContext.extendedContext.knownAliases.slice(0, 3)) {
      const cleanAlias = alias.replace("@", "");
      queries.push(`"${cleanAlias}" OR @${cleanAlias}`);
    }
  }

  // === PASS 8: Public writing ===
  queries.push(`"${name}" site:medium.com`);
  queries.push(`"${name}" site:quora.com`);
  queries.push(`"${name}" blog OR article`);

  // === PASS 9: Archived/cached pages ===
  queries.push(`"${name}" site:web.archive.org`);

  // Extract additional context from notes
  const notesText = (personContext.notes || [])
    .map((n) => n?.content || "")
    .join(" ");

  // Extract potential location mentions from notes
  const locationPatterns = /(?:in|from|lives in|based in|works at|at|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g;
  let match;
  const locations: string[] = [];
  while ((match = locationPatterns.exec(notesText)) !== null) {
    locations.push(match[1]);
  }
  for (const location of locations.slice(0, 2)) {
    queries.push(`"${name}" ${location}`);
  }

  // Extract potential usernames from notes
  const usernamePatterns = /@([a-zA-Z0-9_]+)|username[:\s]+([a-zA-Z0-9_]+)/gi;
  while ((match = usernamePatterns.exec(notesText)) !== null) {
    const username = match[1] || match[2];
    if (username && username !== name && username.length > 2) {
      queries.push(`"${username}" OR @${username}`);
    }
  }

  // Remove duplicates and return
  return [...new Set(queries)];
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

  // Enhanced platform detection for all 9 categories
  const platformPatterns: Array<{
    regex: RegExp;
    type: DeepSearchSource["type"];
    platform: string;
  }> = [
    // Dating
    { regex: /\*\*Dating\*\*[:\s]*([\s\S]*?)(?=\n\*\*|$)/gi, type: "dating", platform: "Dating" },
    { regex: /(?:Tinder|Bumble|Hinge|OkCupid|Match\.com|POF)[:\s]+([\s\S]*?)(?=\n(?:[A-Z][a-z]+:|$))/gi, type: "dating", platform: "Dating Profile" },

    // Social Media
    { regex: /\*\*Social Media\*\*[:\s]*([\s\S]*?)(?=\n\*\*|$)/gi, type: "social", platform: "Social Media" },
    { regex: /LinkedIn[:\s]+([\s\S]*?)(?=\n(?:[A-Z][a-z]+:|$))/gi, type: "professional", platform: "LinkedIn" },
    { regex: /Instagram[:\s]+([\s\S]*?)(?=\n(?:[A-Z][a-z]+:|$))/gi, type: "social", platform: "Instagram" },
    { regex: /Facebook[:\s]+([\s\S]*?)(?=\n(?:[A-Z][a-z]+:|$))/gi, type: "social", platform: "Facebook" },
    { regex: /(?:Twitter|X\.com|X)[:\s]+([\s\S]*?)(?=\n(?:[A-Z][a-z]+:|$))/gi, type: "social", platform: "Twitter/X" },
    { regex: /TikTok[:\s]+([\s\S]*?)(?=\n(?:[A-Z][a-z]+:|$))/gi, type: "social", platform: "TikTok" },
    { regex: /Reddit[:\s]+([\s\S]*?)(?=\n(?:[A-Z][a-z]+:|$))/gi, type: "social", platform: "Reddit" },

    // Legal & Public Records
    { regex: /\*\*Legal.*Public Records?\*\*[:\s]*([\s\S]*?)(?=\n\*\*|$)/gi, type: "legal", platform: "Legal Records" },
    { regex: /(?:Court|Lawsuit|Arrest|Booking|Criminal|Civil)[:\s]+([\s\S]*?)(?=\n(?:[A-Z][a-z]+:|$))/gi, type: "legal", platform: "Public Records" },

    // Professional
    { regex: /\*\*Professional\*\*[:\s]*([\s\S]*?)(?=\n\*\*|$)/gi, type: "professional", platform: "Professional" },
    { regex: /(?:Business|Company|License)[:\s]+([\s\S]*?)(?=\n(?:[A-Z][a-z]+:|$))/gi, type: "professional", platform: "Business Records" },

    // Username/Alias
    { regex: /\*\*Username.*Alias.*\*\*[:\s]*([\s\S]*?)(?=\n\*\*|$)/gi, type: "username", platform: "Username Matches" },

    // Images
    { regex: /\*\*Images?\*\*[:\s]*([\s\S]*?)(?=\n\*\*|$)/gi, type: "images", platform: "Images" },

    // Public Writing
    { regex: /\*\*Public Writing\*\*[:\s]*([\s\S]*?)(?=\n\*\*|$)/gi, type: "writing", platform: "Public Writing" },
    { regex: /Medium[:\s]+([\s\S]*?)(?=\n(?:[A-Z][a-z]+:|$))/gi, type: "writing", platform: "Medium" },
    { regex: /Quora[:\s]+([\s\S]*?)(?=\n(?:[A-Z][a-z]+:|$))/gi, type: "writing", platform: "Quora" },

    // Location
    { regex: /\*\*Location.*\*\*[:\s]*([\s\S]*?)(?=\n\*\*|$)/gi, type: "location", platform: "Location Signals" },

    // Archived
    { regex: /\*\*Archived.*Cached?\*\*[:\s]*([\s\S]*?)(?=\n\*\*|$)/gi, type: "archived", platform: "Archived Pages" },
    { regex: /(?:Wayback|Archive\.org|Cached)[:\s]+([\s\S]*?)(?=\n(?:[A-Z][a-z]+:|$))/gi, type: "archived", platform: "Web Archive" },
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
          isVerified: false,
          confidence: "medium",
        });
      }
    }
  }

  // Extract alignment notes
  const alignmentNotes: string[] = [];

  // Extract uncertainties - look for "possible match" or "could not verify" phrases
  const uncertainties: string[] = [];
  const uncertaintyPattern = /(?:possible match|could not verify|unclear|uncertain|may be|might be)[^.]*\./gi;
  let uncertaintyMatch;
  while ((uncertaintyMatch = uncertaintyPattern.exec(response)) !== null) {
    uncertainties.push(uncertaintyMatch[0].trim());
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

export const NO_RESULTS_RESPONSE = `I did a thorough search for publicly available information about this person across all 9 search categories, but I was not able to find anything definitive.

**What I searched:**

**Dating Sites & Apps**
- Tinder, Bumble, Hinge, OkCupid, Match, and other dating platforms
- Dating profile mirrors and cached pages

**Social Media**
- LinkedIn, Instagram, Facebook, Twitter/X, TikTok, Reddit
- Public bios, posts, and comments

**Legal & Public Records**
- Court case portals (civil and criminal)
- Arrest and booking records
- Government (.gov) sources

**Professional & Business**
- Company websites and staff directories
- Business registrations and licenses

**Username & Alias**
- Cross-platform username searches
- Known alias variations

**Images & Visual**
- Profile photo searches
- Image archives

**Public Writing**
- Medium, Quora, blogs, forums
- Reddit comments

**Location History**
- Location mentions in public profiles

**Archived & Cached**
- Wayback Machine and cached pages

---

**This could mean:**
- They have a common name and more details would help identify the right person
- They keep a low online presence intentionally
- Their profiles are set to private
- They may use a different name or username online
- They might be newer to social media or have deleted old accounts

Not finding something does not mean there is nothing to find - it just means it is not easily accessible through public searches right now.

**What might help narrow things down (only if you have this info):**
- County or region (for court records)
- Middle name or initial
- Previous city or state
- Company, business, or role
- Known usernames or aliases

How does this sit with you?`;
