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
  isVerified?: boolean; // Optional, not displayed to user
  category?: "socialPresence" | "professionalFootprint" | "publicWriting" | "datingProfiles" | "legalRecords" | "archived" | "other";
}

// ============================================================================
// PLATFORM TARGETING CONFIGURATION
// ============================================================================

/**
 * Platform configuration for site:-targeted queries
 */
export interface PlatformConfig {
  domain: string;
  name: string;
  category: DeepSearchSource["category"];
  type: DeepSearchSource["type"];
  queryVariants: (name: string, username?: string, location?: string) => string[];
}

/**
 * All platforms to target with site: queries
 */
export const PLATFORM_CONFIGS: PlatformConfig[] = [
  // Social Media Platforms
  {
    domain: "instagram.com",
    name: "Instagram",
    category: "socialPresence",
    type: "social",
    queryVariants: (name, username, location) => {
      const queries = [`"${name}" site:instagram.com`];
      if (username) {
        const clean = username.replace(/^@/, "");
        queries.push(`${clean} site:instagram.com`);
      }
      if (location) {
        queries.push(`"${name}" ${location} site:instagram.com`);
      }
      return queries;
    },
  },
  {
    domain: "facebook.com",
    name: "Facebook",
    category: "socialPresence",
    type: "social",
    queryVariants: (name, username, location) => {
      const queries = [`"${name}" site:facebook.com`];
      if (location) {
        queries.push(`"${name}" ${location} site:facebook.com`);
      }
      return queries;
    },
  },
  {
    domain: "twitter.com",
    name: "Twitter/X",
    category: "socialPresence",
    type: "social",
    queryVariants: (name, username) => {
      const queries = [
        `"${name}" site:twitter.com`,
        `"${name}" site:x.com`,
      ];
      if (username) {
        const clean = username.replace(/^@/, "");
        queries.push(`${clean} site:twitter.com`);
        queries.push(`@${clean} site:x.com`);
      }
      return queries;
    },
  },
  {
    domain: "x.com",
    name: "X (Twitter)",
    category: "socialPresence",
    type: "social",
    queryVariants: (name, username) => {
      const queries = [`"${name}" site:x.com`];
      if (username) {
        const clean = username.replace(/^@/, "");
        queries.push(`@${clean} site:x.com`);
      }
      return queries;
    },
  },
  {
    domain: "tiktok.com",
    name: "TikTok",
    category: "socialPresence",
    type: "social",
    queryVariants: (name, username) => {
      const queries = [`"${name}" site:tiktok.com`];
      if (username) {
        const clean = username.replace(/^@/, "");
        queries.push(`${clean} site:tiktok.com`);
        queries.push(`@${clean} tiktok`);
      }
      return queries;
    },
  },
  {
    domain: "reddit.com",
    name: "Reddit",
    category: "socialPresence",
    type: "social",
    queryVariants: (name, username) => {
      const queries = [`"${name}" site:reddit.com`];
      if (username) {
        const clean = username.replace(/^@/, "");
        queries.push(`${clean} site:reddit.com`);
        queries.push(`u/${clean} site:reddit.com`);
      }
      return queries;
    },
  },
  // Professional Platforms
  {
    domain: "linkedin.com",
    name: "LinkedIn",
    category: "professionalFootprint",
    type: "professional",
    queryVariants: (name, username, location) => {
      const queries = [`"${name}" site:linkedin.com`];
      if (location) {
        queries.push(`"${name}" ${location} site:linkedin.com`);
      }
      queries.push(`"${name}" site:linkedin.com/in`);
      return queries;
    },
  },
  {
    domain: "github.com",
    name: "GitHub",
    category: "professionalFootprint",
    type: "professional",
    queryVariants: (name, username) => {
      const queries = [`"${name}" site:github.com`];
      if (username) {
        const clean = username.replace(/^@/, "");
        queries.push(`${clean} site:github.com`);
      }
      return queries;
    },
  },
  {
    domain: "behance.net",
    name: "Behance",
    category: "professionalFootprint",
    type: "professional",
    queryVariants: (name) => [`"${name}" site:behance.net`],
  },
  {
    domain: "dribbble.com",
    name: "Dribbble",
    category: "professionalFootprint",
    type: "professional",
    queryVariants: (name) => [`"${name}" site:dribbble.com`],
  },
  // Public Writing Platforms
  {
    domain: "medium.com",
    name: "Medium",
    category: "publicWriting",
    type: "writing",
    queryVariants: (name, username) => {
      const queries = [`"${name}" site:medium.com`];
      if (username) {
        const clean = username.replace(/^@/, "");
        queries.push(`${clean} site:medium.com`);
        queries.push(`@${clean} site:medium.com`);
      }
      return queries;
    },
  },
  {
    domain: "substack.com",
    name: "Substack",
    category: "publicWriting",
    type: "writing",
    queryVariants: (name) => [`"${name}" site:substack.com`],
  },
  {
    domain: "quora.com",
    name: "Quora",
    category: "publicWriting",
    type: "writing",
    queryVariants: (name) => [`"${name}" site:quora.com`],
  },
  {
    domain: "wordpress.com",
    name: "WordPress",
    category: "publicWriting",
    type: "writing",
    queryVariants: (name) => [`"${name}" site:wordpress.com`],
  },
  {
    domain: "blogger.com",
    name: "Blogger",
    category: "publicWriting",
    type: "writing",
    queryVariants: (name) => [`"${name}" site:blogger.com`],
  },
];

/**
 * Generate platform-targeted queries for all configured platforms
 */
export function generatePlatformTargetedQueries(
  name: string,
  username?: string,
  location?: string,
  categories?: Array<"socialPresence" | "professionalFootprint" | "publicWriting">
): string[] {
  const queries: string[] = [];

  // Filter platforms by category if specified
  const platforms = categories
    ? PLATFORM_CONFIGS.filter(p => categories.includes(p.category as typeof categories[number]))
    : PLATFORM_CONFIGS;

  for (const platform of platforms) {
    const platformQueries = platform.queryVariants(name, username, location);
    queries.push(...platformQueries);
  }

  // De-duplicate
  return [...new Set(queries)];
}

/**
 * Generate social-only platform queries
 */
export function generateSocialPlatformQueries(name: string, username?: string, location?: string): string[] {
  return generatePlatformTargetedQueries(name, username, location, ["socialPresence"]);
}

/**
 * Generate professional-only platform queries
 */
export function generateProfessionalPlatformQueries(name: string, username?: string, location?: string): string[] {
  return generatePlatformTargetedQueries(name, username, location, ["professionalFootprint"]);
}

/**
 * Generate public writing platform queries
 */
export function generateWritingPlatformQueries(name: string, username?: string): string[] {
  return generatePlatformTargetedQueries(name, username, undefined, ["publicWriting"]);
}

// ============================================================================
// USERNAME VARIATION GENERATOR
// ============================================================================

export interface UsernameVariation {
  username: string;
  source: "original" | "case_change" | "special_char_removed" | "prefix_variant" | "suffix_variant";
}

/**
 * Generates variations of a username for comprehensive searching.
 *
 * Variations include:
 * - Original (cleaned of @ prefix)
 * - Case changes (lowercase, uppercase, title case)
 * - Special character removal (underscores, dots, dashes)
 * - Common prefix/suffix variants (numbers, years, common patterns)
 *
 * Example for "katie.j_23":
 * - katie.j_23 (original)
 * - katiej23 (special chars removed)
 * - katie_j_23, katie.j.23 (char swaps)
 * - katiej, katie_j (without numbers)
 * - katie.j_2023 (year variant)
 */
export function generateUsernameVariations(username: string): UsernameVariation[] {
  if (!username?.trim()) return [];

  const variations: UsernameVariation[] = [];
  const seen = new Set<string>();

  // Clean the username (remove @ prefix if present)
  const clean = username.trim().replace(/^@/, "");

  // Helper to add unique variations
  const addVariation = (u: string, source: UsernameVariation["source"]) => {
    const normalized = u.toLowerCase();
    if (normalized && !seen.has(normalized) && normalized.length >= 2) {
      seen.add(normalized);
      variations.push({ username: u, source });
    }
  };

  // 1. Original
  addVariation(clean, "original");

  // 2. Case changes
  addVariation(clean.toLowerCase(), "case_change");
  addVariation(clean.toUpperCase(), "case_change");
  // Title case (first letter caps)
  const titleCase = clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
  addVariation(titleCase, "case_change");

  // 3. Special character removal (underscores, dots, dashes, numbers at end)
  const noSpecialChars = clean.replace(/[._\-]/g, "");
  addVariation(noSpecialChars, "special_char_removed");

  // Remove trailing numbers
  const noTrailingNums = clean.replace(/\d+$/, "");
  if (noTrailingNums !== clean) {
    addVariation(noTrailingNums, "special_char_removed");
    // Also without special chars AND trailing nums
    const cleanNoNums = noTrailingNums.replace(/[._\-]/g, "");
    addVariation(cleanNoNums, "special_char_removed");
  }

  // Replace underscores with dots and vice versa
  if (clean.includes("_")) {
    addVariation(clean.replace(/_/g, "."), "special_char_removed");
    addVariation(clean.replace(/_/g, ""), "special_char_removed");
  }
  if (clean.includes(".")) {
    addVariation(clean.replace(/\./g, "_"), "special_char_removed");
    addVariation(clean.replace(/\./g, ""), "special_char_removed");
  }

  // 4. Prefix variants (only if username doesn't already have these)
  const baseWithoutPrefixes = clean.replace(/^(the|real|official|its|im|i_am|iam|iamthe)/i, "");
  if (baseWithoutPrefixes !== clean && baseWithoutPrefixes.length >= 2) {
    addVariation(baseWithoutPrefixes, "prefix_variant");
  }

  // Add common prefixes if not present
  if (!clean.match(/^(the|real|official)/i)) {
    // Only add prefix variants for short usernames to avoid too many variations
    if (clean.length <= 12) {
      addVariation(`the${noSpecialChars}`, "prefix_variant");
      addVariation(`real${noSpecialChars}`, "prefix_variant");
    }
  }

  // 5. Suffix variants
  // Extract trailing numbers
  const trailingNumMatch = clean.match(/(\d+)$/);
  if (trailingNumMatch) {
    const num = trailingNumMatch[1];
    const base = clean.slice(0, -num.length);

    // Try different number formats
    if (num.length === 2) {
      // Could be year (23 -> 2023, 1923), or just digits
      addVariation(`${base}20${num}`, "suffix_variant");
      addVariation(`${base}19${num}`, "suffix_variant");
    } else if (num.length === 4 && (num.startsWith("19") || num.startsWith("20"))) {
      // Full year, try short version
      addVariation(`${base}${num.slice(2)}`, "suffix_variant");
    }

    // Without any numbers
    if (base.length >= 2) {
      addVariation(base.replace(/[._\-]$/, ""), "suffix_variant");
    }
  } else {
    // No trailing numbers - try adding common ones
    if (clean.length <= 12) {
      addVariation(`${clean}1`, "suffix_variant");
      addVariation(`${clean}_`, "suffix_variant");
    }
  }

  return variations;
}

/**
 * Generate platform-specific queries for username variations
 */
export function generateUsernameFirstQueries(
  username: string,
  includeVariations: boolean = true
): string[] {
  const queries: string[] = [];

  // Get variations or just use the original
  const variations = includeVariations
    ? generateUsernameVariations(username)
    : [{ username: username.replace(/^@/, ""), source: "original" as const }];

  // Major platforms to search for each variation
  const platforms = [
    { domain: "instagram.com", prefix: "" },
    { domain: "twitter.com", prefix: "" },
    { domain: "x.com", prefix: "@" },
    { domain: "tiktok.com", prefix: "@" },
    { domain: "reddit.com", prefix: "u/" },
    { domain: "linkedin.com", prefix: "" },
    { domain: "facebook.com", prefix: "" },
    { domain: "github.com", prefix: "" },
    { domain: "youtube.com", prefix: "@" },
    { domain: "pinterest.com", prefix: "" },
    { domain: "snapchat.com", prefix: "" },
    { domain: "twitch.tv", prefix: "" },
  ];

  // For original and key variations, do full platform sweep
  const priorityVariations = variations.filter(
    v => v.source === "original" || v.source === "special_char_removed"
  ).slice(0, 4); // Limit to 4 priority variations

  for (const variation of priorityVariations) {
    const u = variation.username;

    // General username searches
    queries.push(`@${u}`);
    queries.push(`"${u}" profile`);
    queries.push(`"${u}" social media`);

    // Platform-specific searches
    for (const platform of platforms) {
      queries.push(`${platform.prefix}${u} site:${platform.domain}`);
    }
  }

  // For other variations, just do generic searches
  const otherVariations = variations.filter(
    v => v.source !== "original" && v.source !== "special_char_removed"
  ).slice(0, 3); // Limit other variations

  for (const variation of otherVariations) {
    const u = variation.username;
    queries.push(`@${u}`);
    queries.push(`"${u}" profile`);
    queries.push(`${u} site:instagram.com`);
    queries.push(`${u} site:twitter.com`);
  }

  // De-duplicate
  return [...new Set(queries)];
}

// ============================================================================
// EXAMPLE: Username Variations for "katie.j_23"
// ============================================================================
/*
Input: "katie.j_23"

Generated Variations:
1. katie.j_23 (original)
2. KATIE.J_23 (uppercase)
3. Katie.j_23 (title case)
4. katiej23 (special chars removed)
5. katie.j_ (trailing numbers removed)
6. katiej (special chars + numbers removed)
7. katie_j_23 (dots to underscores)
8. katiej_23 (dots removed)
9. katie.j.23 (underscores to dots)
10. katie.j23 (underscores removed)
11. thekatiej23 (prefix variant)
12. realkatiej23 (prefix variant)
13. katie.j_2023 (year variant: 23 -> 2023)
14. katie.j_1923 (year variant: 23 -> 1923)
15. katie.j (base without numbers)

Example Query List for "katie.j_23":
Pass 1 (USERNAME_FIRST) generates ~60 queries:

General searches:
- @katie.j_23
- "katie.j_23" profile
- "katie.j_23" social media
- @katiej23
- "katiej23" profile
- "katiej23" social media

Platform-specific (for each priority variation):
- katie.j_23 site:instagram.com
- katie.j_23 site:twitter.com
- @katie.j_23 site:x.com
- @katie.j_23 site:tiktok.com
- u/katie.j_23 site:reddit.com
- katie.j_23 site:linkedin.com
- katie.j_23 site:facebook.com
- katie.j_23 site:github.com
- @katie.j_23 site:youtube.com
- katie.j_23 site:pinterest.com
- katie.j_23 site:snapchat.com
- katie.j_23 site:twitch.tv
(repeated for katiej23, katie_j_23, katiej variations)

Other variations (limited searches):
- @katie.j_2023
- "katie.j_2023" profile
- katie.j_2023 site:instagram.com
- katie.j_2023 site:twitter.com
*/

// ============================================================================
// SEARCH QUERIES BUILDER - Generates 10+ query variations automatically
// ============================================================================

export interface QueryGeneratorInput {
  name: string;
  location?: string;
  username?: string;
  anchor?: {
    type: "workplace" | "school" | "dating_app" | "username";
    value: string;
  };
  ageRange?: string;
  middleInitial?: string;
  aliases?: string[];
  county?: string;
  previousLocation?: string;
}

/**
 * Generates at least 10 search query variations for Deep Search.
 *
 * Priority order:
 * 1. Username-only queries (if username exists)
 * 2. Name + location queries
 * 3. Platform-targeted queries (site: filters)
 * 4. Dating-focused queries
 * 5. Archive/cached queries
 *
 * Queries are de-duplicated and kept short/human-like.
 */
export function generateSearchQueries(input: QueryGeneratorInput): string[] {
  const queries: string[] = [];
  const { name, location, username, anchor, ageRange, middleInitial, aliases, county, previousLocation } = input;

  // Guard against empty name
  if (!name?.trim()) {
    return ["person search"];
  }

  const nameParts = name.trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
  const cleanUsername = username?.replace(/^@/, "");

  // Build name with middle initial if available
  const fullNameWithMiddle = middleInitial && nameParts.length >= 2
    ? `${firstName} ${middleInitial} ${lastName}`
    : null;

  // ==========================================================================
  // PRIORITY 1: Username-only queries (highest priority if username exists)
  // ==========================================================================
  if (cleanUsername) {
    // Username across major platforms
    queries.push(`@${cleanUsername}`);
    queries.push(`"${cleanUsername}" profile`);
    queries.push(`${cleanUsername} site:instagram.com`);
    queries.push(`${cleanUsername} site:twitter.com`);
    queries.push(`${cleanUsername} site:tiktok.com`);
    queries.push(`${cleanUsername} site:reddit.com`);
    queries.push(`${cleanUsername} site:linkedin.com`);
    queries.push(`${cleanUsername} dating`);
  }

  // Also search any known aliases
  if (aliases?.length) {
    for (const alias of aliases.slice(0, 3)) {
      const cleanAlias = alias.replace(/^@/, "");
      queries.push(`@${cleanAlias}`);
      queries.push(`"${cleanAlias}" profile`);
    }
  }

  // ==========================================================================
  // PRIORITY 2: Name + location queries
  // ==========================================================================
  if (location) {
    queries.push(`"${name}" ${location}`);
    queries.push(`${firstName} ${lastName} ${location}`);
  }

  if (county) {
    queries.push(`"${name}" ${county}`);
  }

  if (previousLocation) {
    queries.push(`"${name}" ${previousLocation}`);
  }

  // Name with middle initial + location
  if (fullNameWithMiddle && location) {
    queries.push(`"${fullNameWithMiddle}" ${location}`);
  }

  // ==========================================================================
  // PRIORITY 3: Platform-targeted queries (site: filters)
  // ==========================================================================
  // Social media
  queries.push(`"${name}" site:linkedin.com`);
  queries.push(`"${name}" site:facebook.com`);
  queries.push(`"${name}" site:instagram.com`);
  queries.push(`"${name}" site:twitter.com`);
  queries.push(`"${name}" site:tiktok.com`);

  // With location for better targeting
  if (location) {
    queries.push(`"${name}" ${location} site:linkedin.com`);
    queries.push(`"${name}" ${location} site:facebook.com`);
  }

  // Professional
  if (anchor?.type === "workplace" && anchor.value) {
    queries.push(`"${name}" ${anchor.value}`);
    queries.push(`"${name}" ${anchor.value} site:linkedin.com`);
  }

  // School
  if (anchor?.type === "school" && anchor.value) {
    queries.push(`"${name}" ${anchor.value}`);
    queries.push(`"${name}" ${anchor.value} alumni`);
  }

  // Username anchor (different from known username - this is contextual)
  if (anchor?.type === "username" && anchor.value) {
    const anchorUsername = anchor.value.replace(/^@/, "");
    queries.push(`@${anchorUsername}`);
    queries.push(`"${anchorUsername}" profile`);
    queries.push(`${anchorUsername} site:instagram.com`);
    queries.push(`${anchorUsername} site:twitter.com`);
  }

  // Public records
  queries.push(`"${name}" site:courtlistener.com`);
  if (county) {
    queries.push(`"${name}" ${county} court`);
    queries.push(`"${name}" ${county} arrest`);
  }

  // ==========================================================================
  // PRIORITY 4: Dating-focused queries
  // ==========================================================================
  queries.push(`"${name}" tinder`);
  queries.push(`"${name}" bumble`);
  queries.push(`"${name}" hinge`);
  queries.push(`"${name}" dating profile`);

  // If met on specific dating app
  if (anchor?.type === "dating_app" && anchor.value) {
    queries.push(`"${name}" ${anchor.value}`);
    queries.push(`"${name}" ${anchor.value} profile`);
  }

  // Dating + location (more specific)
  if (location) {
    queries.push(`"${name}" ${location} dating`);
  }

  // Age-based dating search
  if (ageRange) {
    queries.push(`"${name}" ${ageRange} dating`);
  }

  // ==========================================================================
  // PRIORITY 5: Archive/cached queries
  // ==========================================================================
  queries.push(`"${name}" site:web.archive.org`);
  if (cleanUsername) {
    queries.push(`${cleanUsername} site:web.archive.org`);
  }
  queries.push(`"${name}" cached`);

  // ==========================================================================
  // BONUS: Additional useful queries
  // ==========================================================================
  // Basic name search
  queries.push(`"${name}"`);
  if (fullNameWithMiddle) {
    queries.push(`"${fullNameWithMiddle}"`);
  }

  // Reddit/forums
  queries.push(`"${name}" site:reddit.com`);

  // Public writing
  queries.push(`"${name}" site:medium.com`);

  // Images
  queries.push(`"${name}" profile photo`);

  // ==========================================================================
  // De-duplicate and return
  // ==========================================================================
  const uniqueQueries = [...new Set(queries)]
    .map(q => q.trim())
    .filter(q => q.length > 0);

  // Ensure we have at least 10 queries
  if (uniqueQueries.length < 10) {
    // Add fallback queries
    const fallbacks = [
      `${firstName} ${lastName}`,
      `"${name}" social media`,
      `"${name}" online`,
      `"${name}" profile`,
      `${name}`,
    ];
    for (const fb of fallbacks) {
      if (!uniqueQueries.includes(fb)) {
        uniqueQueries.push(fb);
      }
      if (uniqueQueries.length >= 10) break;
    }
  }

  return uniqueQueries;
}

/**
 * Wrapper that extracts QueryGeneratorInput from PersonContext
 * and calls generateSearchQueries
 */
export function buildSearchQueries(personContext: PersonContext): string[] {
  const input: QueryGeneratorInput = {
    name: personContext.name || "",
    location: personContext.location,
    username: personContext.knownUsername,
    anchor: personContext.contextAnchor,
    ageRange: personContext.approximateAge,
    middleInitial: personContext.extendedContext?.middleNameOrInitial,
    aliases: personContext.extendedContext?.knownAliases,
    county: personContext.extendedContext?.countyOrRegion,
    previousLocation: personContext.extendedContext?.previousLocation,
  };

  // Start with the generator
  const queries = generateSearchQueries(input);

  // Extract additional context from notes
  const notesText = (personContext.notes || [])
    .map((n) => n?.content || "")
    .join(" ");

  // Extract potential location mentions from notes
  const locationPatterns = /(?:in|from|lives in|based in|works at|at|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g;
  let match;
  while ((match = locationPatterns.exec(notesText)) !== null) {
    const extractedLocation = match[1];
    const query = `"${personContext.name}" ${extractedLocation}`;
    if (!queries.includes(query)) {
      queries.push(query);
    }
  }

  // Extract potential usernames from notes
  const usernamePatterns = /@([a-zA-Z0-9_]+)|username[:\s]+([a-zA-Z0-9_]+)/gi;
  while ((match = usernamePatterns.exec(notesText)) !== null) {
    const extractedUsername = match[1] || match[2];
    if (extractedUsername && extractedUsername !== personContext.name && extractedUsername.length > 2) {
      const query = `@${extractedUsername}`;
      if (!queries.includes(query)) {
        queries.push(query);
      }
    }
  }

  return queries;
}

// ============================================================================
// EXAMPLE OUTPUTS (for documentation)
// ============================================================================
/*
EXAMPLE 1: Username exists
Input: {
  name: "Sarah Johnson",
  location: "Austin, TX",
  username: "sarahj_92"
}

Generated queries (17):
1.  @sarahj_92
2.  "sarahj_92" profile
3.  sarahj_92 site:instagram.com
4.  sarahj_92 site:twitter.com
5.  sarahj_92 site:tiktok.com
6.  sarahj_92 site:reddit.com
7.  sarahj_92 site:linkedin.com
8.  sarahj_92 dating
9.  "Sarah Johnson" Austin, TX
10. Sarah Johnson Austin, TX
11. "Sarah Johnson" site:linkedin.com
12. "Sarah Johnson" site:facebook.com
13. "Sarah Johnson" site:instagram.com
14. "Sarah Johnson" site:twitter.com
15. "Sarah Johnson" site:tiktok.com
16. "Sarah Johnson" Austin, TX site:linkedin.com
17. "Sarah Johnson" Austin, TX site:facebook.com
... (plus dating, archive, etc.)

---

EXAMPLE 2: No username, dating context
Input: {
  name: "Mike Chen",
  location: "Seattle",
  anchor: { type: "dating_app", value: "Hinge" },
  county: "King County"
}

Generated queries (18):
1.  "Mike Chen" Seattle
2.  Mike Chen Seattle
3.  "Mike Chen" King County
4.  "Mike Chen" site:linkedin.com
5.  "Mike Chen" site:facebook.com
6.  "Mike Chen" site:instagram.com
7.  "Mike Chen" site:twitter.com
8.  "Mike Chen" site:tiktok.com
9.  "Mike Chen" Seattle site:linkedin.com
10. "Mike Chen" Seattle site:facebook.com
11. "Mike Chen" site:courtlistener.com
12. "Mike Chen" King County court
13. "Mike Chen" King County arrest
14. "Mike Chen" tinder
15. "Mike Chen" bumble
16. "Mike Chen" hinge
17. "Mike Chen" dating profile
18. "Mike Chen" Hinge
... (plus archive queries, etc.)
*/

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

  console.log("[DeepSearch Parser] Raw response length:", response.length);
  console.log("[DeepSearch Parser] Raw response preview:", response.slice(0, 500));

  const sources: DeepSearchSource[] = [];

  // Extract ALL URLs from the response with their surrounding context
  const urlPattern = /(?:^|\n)([^\n]*)(https?:\/\/[^\s\)\]\>]+)([^\n]*)/g;
  let urlMatch;
  const seenUrls = new Set<string>();

  while ((urlMatch = urlPattern.exec(response)) !== null) {
    const beforeUrl = urlMatch[1] || "";
    const url = urlMatch[2];
    const afterUrl = urlMatch[3] || "";
    const fullLine = `${beforeUrl}${url}${afterUrl}`.trim();

    // Skip duplicate URLs
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);

    // Determine platform from URL
    const platform = getPlatformFromUrl(url);
    const type = getTypeFromPlatform(platform);

    // Get context around the URL (look for description in surrounding lines)
    const urlIndex = response.indexOf(url);
    const contextStart = Math.max(0, urlIndex - 200);
    const contextEnd = Math.min(response.length, urlIndex + 200);
    const context = response.slice(contextStart, contextEnd);

    // Extract a summary from context
    const summary = extractSummaryFromContext(context, url);

    sources.push({
      type,
      platform,
      url,
      summary,
      relevantDetails: [],
      isVerified: true,
    });
  }

  // If no URLs found, try to extract markdown links [text](url)
  if (sources.length === 0) {
    const markdownLinkPattern = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
    let mdMatch;
    while ((mdMatch = markdownLinkPattern.exec(response)) !== null) {
      const linkText = mdMatch[1];
      const url = mdMatch[2];

      if (seenUrls.has(url)) continue;
      seenUrls.add(url);

      const platform = getPlatformFromUrl(url);
      const type = getTypeFromPlatform(platform);

      sources.push({
        type,
        platform: linkText || platform,
        url,
        summary: linkText,
        relevantDetails: [],
        isVerified: true,
      });
    }
  }

  // If still no sources, parse the response as general findings
  if (sources.length === 0) {
    // Look for platform mentions even without URLs
    const platformMentions = [
      { pattern: /linkedin/i, platform: "LinkedIn", type: "professional" as const },
      { pattern: /instagram/i, platform: "Instagram", type: "social" as const },
      { pattern: /facebook/i, platform: "Facebook", type: "social" as const },
      { pattern: /twitter|x\.com/i, platform: "Twitter/X", type: "social" as const },
      { pattern: /tiktok/i, platform: "TikTok", type: "social" as const },
      { pattern: /tinder|bumble|hinge|okcupid|match\.com/i, platform: "Dating Profile", type: "dating" as const },
    ];

    for (const { pattern, platform, type } of platformMentions) {
      if (pattern.test(response)) {
        // Extract the section about this platform
        const sectionPattern = new RegExp(`(${pattern.source}[^\\n]*(?:\\n[^\\n]*){0,3})`, "i");
        const sectionMatch = response.match(sectionPattern);
        if (sectionMatch) {
          sources.push({
            type,
            platform,
            summary: sectionMatch[1].slice(0, 200),
            relevantDetails: [],
            isVerified: true,
          });
        }
      }
    }
  }

  console.log("[DeepSearch Parser] Found sources:", sources.length);

  // Generate summary (first paragraph or first 2-3 sentences)
  const paragraphs = response.split("\n\n").filter(p => p.trim());
  let summary = paragraphs[0] || "Search completed.";
  if (summary.length > 400) {
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
    alignmentNotes: [],
    uncertainties: [],
    rawResponse: response,
  };
}

// Helper to determine platform from URL
function getPlatformFromUrl(url: string): string {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes("linkedin.com")) return "LinkedIn";
  if (lowerUrl.includes("instagram.com")) return "Instagram";
  if (lowerUrl.includes("facebook.com")) return "Facebook";
  if (lowerUrl.includes("twitter.com") || lowerUrl.includes("x.com")) return "Twitter/X";
  if (lowerUrl.includes("tiktok.com")) return "TikTok";
  if (lowerUrl.includes("reddit.com")) return "Reddit";
  if (lowerUrl.includes("youtube.com")) return "YouTube";
  if (lowerUrl.includes("github.com")) return "GitHub";
  if (lowerUrl.includes("behance.net")) return "Behance";
  if (lowerUrl.includes("dribbble.com")) return "Dribbble";
  if (lowerUrl.includes("medium.com")) return "Medium";
  if (lowerUrl.includes("substack.com")) return "Substack";
  if (lowerUrl.includes("quora.com")) return "Quora";
  if (lowerUrl.includes("wordpress.com")) return "WordPress";
  if (lowerUrl.includes("blogger.com")) return "Blogger";
  if (lowerUrl.includes("tinder.com")) return "Tinder";
  if (lowerUrl.includes("bumble.com")) return "Bumble";
  if (lowerUrl.includes("hinge.co")) return "Hinge";
  if (lowerUrl.includes("okcupid.com")) return "OkCupid";
  if (lowerUrl.includes("match.com")) return "Match.com";
  if (lowerUrl.includes("court") || lowerUrl.includes(".gov")) return "Public Records";
  if (lowerUrl.includes("archive.org") || lowerUrl.includes("archive.is") || lowerUrl.includes("archive.ph")) return "Web Archive";

  // Extract domain name as platform
  try {
    const domain = new URL(url).hostname.replace("www.", "");
    return domain;
  } catch {
    return "Web";
  }
}

// Helper to determine type from platform
function getTypeFromPlatform(platform: string): DeepSearchSource["type"] {
  const lower = platform.toLowerCase();
  if (["linkedin", "github", "behance", "dribbble"].some(p => lower.includes(p))) return "professional";
  if (["instagram", "facebook", "twitter", "x", "tiktok", "reddit", "youtube"].some(p => lower.includes(p))) return "social";
  if (["tinder", "bumble", "hinge", "okcupid", "match"].some(p => lower.includes(p))) return "dating";
  if (["court", "gov", "public records", "arrest", "jail"].some(p => lower.includes(p))) return "legal";
  if (["medium", "substack", "quora", "wordpress", "blogger", "blog"].some(p => lower.includes(p))) return "writing";
  if (["archive"].some(p => lower.includes(p))) return "archived";
  return "other";
}

// Helper to determine category from platform (more detailed than type)
function getCategoryFromPlatform(platform: string): DeepSearchSource["category"] {
  const lower = platform.toLowerCase();

  // Social Presence
  if (["instagram", "facebook", "twitter", "x", "tiktok", "reddit", "youtube", "snapchat", "threads"].some(p => lower.includes(p))) {
    return "socialPresence";
  }

  // Professional Footprint
  if (["linkedin", "github", "behance", "dribbble", "gitlab", "stackoverflow", "angel", "crunchbase"].some(p => lower.includes(p))) {
    return "professionalFootprint";
  }

  // Public Writing
  if (["medium", "substack", "quora", "wordpress", "blogger", "blog", "tumblr", "dev.to"].some(p => lower.includes(p))) {
    return "publicWriting";
  }

  // Dating Profiles
  if (["tinder", "bumble", "hinge", "okcupid", "match", "plenty", "pof", "eharmony", "coffee meets bagel"].some(p => lower.includes(p))) {
    return "datingProfiles";
  }

  // Legal Records
  if (["court", "gov", "public records", "arrest", "jail", "inmate", "case", "docket"].some(p => lower.includes(p))) {
    return "legalRecords";
  }

  // Archived
  if (["archive", "wayback", "cached"].some(p => lower.includes(p))) {
    return "archived";
  }

  return "other";
}

// ============================================================================
// CATEGORIZED RESULTS
// ============================================================================

export interface CategorizedResults {
  socialPresence: DeepSearchSource[];
  professionalFootprint: DeepSearchSource[];
  publicWriting: DeepSearchSource[];
  datingProfiles: DeepSearchSource[];
  legalRecords: DeepSearchSource[];
  archived: DeepSearchSource[];
  other: DeepSearchSource[];
}

/**
 * Categorize sources into distinct buckets with URL de-duplication
 */
export function categorizeResults(sources: DeepSearchSource[]): CategorizedResults {
  const seenUrls = new Set<string>();
  const results: CategorizedResults = {
    socialPresence: [],
    professionalFootprint: [],
    publicWriting: [],
    datingProfiles: [],
    legalRecords: [],
    archived: [],
    other: [],
  };

  for (const source of sources) {
    // De-duplicate by URL
    if (source.url) {
      if (seenUrls.has(source.url)) continue;
      seenUrls.add(source.url);
    }

    // Determine category (use existing or compute from platform)
    const category = source.category || getCategoryFromPlatform(source.platform);

    // Add to appropriate bucket
    const enrichedSource = { ...source, category };
    switch (category) {
      case "socialPresence":
        results.socialPresence.push(enrichedSource);
        break;
      case "professionalFootprint":
        results.professionalFootprint.push(enrichedSource);
        break;
      case "publicWriting":
        results.publicWriting.push(enrichedSource);
        break;
      case "datingProfiles":
        results.datingProfiles.push(enrichedSource);
        break;
      case "legalRecords":
        results.legalRecords.push(enrichedSource);
        break;
      case "archived":
        results.archived.push(enrichedSource);
        break;
      default:
        results.other.push(enrichedSource);
    }
  }

  return results;
}

/**
 * Get summary stats for categorized results
 */
export function getCategorizedResultsStats(categorized: CategorizedResults): {
  total: number;
  byCategory: Record<string, number>;
  categoriesWithResults: string[];
} {
  const byCategory: Record<string, number> = {
    socialPresence: categorized.socialPresence.length,
    professionalFootprint: categorized.professionalFootprint.length,
    publicWriting: categorized.publicWriting.length,
    datingProfiles: categorized.datingProfiles.length,
    legalRecords: categorized.legalRecords.length,
    archived: categorized.archived.length,
    other: categorized.other.length,
  };

  const total = Object.values(byCategory).reduce((sum, count) => sum + count, 0);
  const categoriesWithResults = Object.entries(byCategory)
    .filter(([_, count]) => count > 0)
    .map(([category]) => category);

  return { total, byCategory, categoriesWithResults };
}

// Helper to extract summary from context around URL
function extractSummaryFromContext(context: string, url: string): string {
  // Try to find a description near the URL
  const lines = context.split("\n").filter(l => l.trim());

  // Find the line with the URL
  const urlLineIndex = lines.findIndex(l => l.includes(url));

  // Get surrounding lines for context
  const relevantLines: string[] = [];
  for (let i = Math.max(0, urlLineIndex - 1); i <= Math.min(lines.length - 1, urlLineIndex + 1); i++) {
    const line = lines[i]?.replace(url, "").trim();
    if (line && line.length > 5) {
      relevantLines.push(line);
    }
  }

  return relevantLines.join(" ").slice(0, 200) || "Found profile";
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
