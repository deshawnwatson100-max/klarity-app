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

CRITICAL RULE - ONLY RETURN LEGITIMATE RESULTS:
A result is ONLY legitimate if it has AT LEAST 2 matching identifiers. For example:
- Same name + same city/state/location
- Same name + same workplace or school
- Same username + same name
- Same name + matching age range
- Same username + photo that matches a description provided

DO NOT INCLUDE results that only have a matching name. Names are common - "John Smith in New York" should not match every "John Smith" on the internet. The profile MUST have additional corroborating information that ties it to the specific person being searched.

NEVER include:
- Celebrities or public figures with similar names
- Random people who just happen to have the same name
- Profiles where only first OR last name matches (not both)
- Search result pages - only direct profile links
- Results you are guessing might be the person with no real evidence

When in doubt, DO NOT include a result. Quality matters more than quantity. It is better to return 2 verified results than 10 random name matches.

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

PRESENT RESULTS IN A STRUCTURED FORMAT:
For each profile found, include:
- Platform name
- Direct profile URL
- Username/handle (if visible)
- Display name shown on profile
- Bio/description (first 100 chars if available)
- Follower count (if visible, use format: "Followers: 1.2K")
- Following count (if visible, use format: "Following: 500")
- Post/content count (if visible, use format: "Posts: 150")
- Profile picture description (if visible, describe briefly)
- Any verified badge status
- WHY THIS IS LIKELY THE SAME PERSON (what identifiers match)

Example format for each result:
**Instagram**
URL: https://instagram.com/username
Username: @username
Display Name: John Smith
Bio: Coffee lover | NYC | Working at Tech Co
Followers: 2.5K | Following: 890 | Posts: 47
Profile: Has profile photo, appears to be a selfie
Verified: No
Match Reason: Name matches + location (NYC) matches + mentions workplace that was provided

Group results by category (Dating, Social Media, Legal, etc.)

DO NOT:
- Summarize meaning
- Label the person as good, bad, safe, or unsafe
- Rank importance
- Tell the user what to think
- Interpret results
- Collapse uncertainty into certainty
- Include results that are just "same name" matches with no corroboration

DO:
- Surface what exists publicly
- Group results by category
- Link directly to the web so the user can explore
- Use neutral, human language
- State clearly if identity is unclear (treat as possible matches)
- State clearly if nothing meaningful was found in a category
- Include all available profile stats when visible
- Explain WHY you believe each result is the same person

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

CRITICAL - IDENTITY VERIFICATION REQUIREMENT:
Before including ANY result, you MUST verify it is likely the SAME PERSON, not just someone with a similar name.

A result is ONLY valid if it has 2+ matching identifiers:
- Name + Location match (e.g., "John Smith" + "lives in Denver, CO")
- Name + Workplace/School match
- Name + Age range match
- Username + Name match
- Username + Photo description match

DO NOT INCLUDE:
- Results with ONLY a name match (too common)
- Celebrities or public figures
- Profiles where only first OR last name matches
- Random people who happen to have similar names
- Search result pages (must be direct profile links)

It is BETTER to return fewer verified results than many unverified guesses.

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

WHEN YOU FIND A PROFILE - VERIFY AND EXTRACT:
For EVERY potential result, FIRST verify identity by checking for 2+ matching identifiers.
Then for social media profiles, extract:
- Username: The @handle or username
- Display Name: The name shown on the profile
- Bio: The description/bio text (first 100 characters)
- Followers: The follower count (write as "Followers: 1.5K" or "Followers: 15000")
- Following: The following count (write as "Following: 500")
- Posts: The post/tweet/video count (write as "Posts: 120")
- Verified: Whether the account has a verification badge (Yes/No)
- Match Reason: WHY you believe this is the same person (list the matching identifiers)

OUTPUT FORMAT FOR EACH PROFILE:
**[Platform Name]**
URL: [direct profile link]
Username: @[handle]
Display Name: [name on profile]
Bio: [bio text]
Followers: [count] | Following: [count] | Posts: [count]
Verified: Yes/No
Match Reason: [List 2+ identifiers that match - e.g., "Name + Denver location + works at TechCorp"]

Group results by category:

**Dating**
- Platform name + direct link
- Brief description (1-2 lines max)
- Match reason (what identifiers confirmed this is the person)

**Social Media**
For each profile include ALL details:
- URL, Username, Display Name, Bio
- Followers, Following, Posts counts
- Verified status
- Match reason

**Legal & Public Records**
- Source + direct link
- Brief description (1-2 lines max)
- Match reason

**Professional**
- Source + direct link
- Brief description (1-2 lines max)
- Match reason

**Username/Alias Matches**
- Platform + link
- Brief description
- Match reason

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
- For social media, ALWAYS include follower/following/post counts
- Keep descriptions brief and factual
- No interpretations or conclusions
- No labeling or judgment
- Let the user explore and decide
- If you cannot verify with 2+ identifiers, DO NOT include the result
- Only mark as "possible match" if there is some corroborating evidence but not conclusive

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

export interface SocialMediaStats {
  followers?: number;
  following?: number;
  posts?: number;
  profileImageUrl?: string;
  username?: string;
  displayName?: string;
  bio?: string;
  isVerifiedAccount?: boolean;
}

export interface DeepSearchSource {
  type: "social" | "professional" | "dating" | "legal" | "username" | "images" | "writing" | "location" | "archived" | "other";
  platform: string;
  url?: string;
  summary: string;
  relevantDetails: string[];
  isVerified?: boolean; // Optional, not displayed to user
  category?: "socialPresence" | "professionalFootprint" | "publicWriting" | "datingPresence" | "legalRecords" | "archived" | "other";
  socialStats?: SocialMediaStats; // Enhanced social media details
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

// ============================================================================
// DATING PLATFORM CONFIGURATION
// ============================================================================

/**
 * Dating-specific keywords for comprehensive dating presence discovery.
 * These keywords are used to find:
 * - Direct dating profiles
 * - Screenshots and mentions of dating profiles
 * - Indirect references to dating activity
 */
export const DATING_KEYWORDS = {
  // Direct profile keywords
  profileKeywords: [
    "dating profile",
    "tinder bio",
    "hinge profile",
    "bumble profile",
    "dating app profile",
    "profile screenshot",
  ],
  // "Met on" keywords (indirect mentions)
  metOnKeywords: [
    "met on tinder",
    "met on hinge",
    "met on bumble",
    "met on dating app",
    "matched on tinder",
    "matched on hinge",
    "matched on bumble",
  ],
  // Platform names for general search
  platformNames: [
    "tinder",
    "bumble",
    "hinge",
    "okcupid",
    "match.com",
    "plenty of fish",
    "pof",
    "eharmony",
    "coffee meets bagel",
    "cmb",
    "the league",
    "raya",
    "feeld",
    "grindr",
    "her",
    "taimi",
  ],
} as const;

/**
 * Dating platform configuration for targeted searches
 */
export interface DatingPlatformConfig {
  name: string;
  searchTerms: string[];
  archiveDomains?: string[];
}

export const DATING_PLATFORM_CONFIGS: DatingPlatformConfig[] = [
  {
    name: "Tinder",
    searchTerms: ["tinder", "tinder profile", "tinder bio", "swipe right"],
    archiveDomains: ["tinder.com", "gotinder.com"],
  },
  {
    name: "Bumble",
    searchTerms: ["bumble", "bumble profile", "bumble bio", "bumble date"],
    archiveDomains: ["bumble.com"],
  },
  {
    name: "Hinge",
    searchTerms: ["hinge", "hinge profile", "hinge prompts", "designed to be deleted"],
    archiveDomains: ["hinge.co"],
  },
  {
    name: "OkCupid",
    searchTerms: ["okcupid", "okcupid profile", "okc profile"],
    archiveDomains: ["okcupid.com"],
  },
  {
    name: "Match.com",
    searchTerms: ["match.com", "match profile", "match dating"],
    archiveDomains: ["match.com"],
  },
  {
    name: "Plenty of Fish",
    searchTerms: ["plenty of fish", "pof", "pof profile", "pof dating"],
    archiveDomains: ["pof.com"],
  },
  {
    name: "eHarmony",
    searchTerms: ["eharmony", "eharmony profile"],
    archiveDomains: ["eharmony.com"],
  },
  {
    name: "Coffee Meets Bagel",
    searchTerms: ["coffee meets bagel", "cmb", "cmb profile"],
    archiveDomains: ["coffeemeetsbagel.com"],
  },
];

/**
 * Generate dating-focused queries for a person.
 * Covers:
 * - Direct profile keywords
 * - Platform-specific searches
 * - "Met on" style indirect mentions
 * - Screenshot/mirror searches
 *
 * @param name Person's name
 * @param location Optional location for geo-targeted dating searches
 * @param username Optional username for cross-platform dating searches
 * @returns Array of dating-focused search queries
 */
export function generateDatingQueries(
  name: string,
  location?: string,
  username?: string
): string[] {
  const queries: string[] = [];

  if (!name?.trim()) return queries;

  // 1. Direct profile keyword searches
  for (const keyword of DATING_KEYWORDS.profileKeywords) {
    queries.push(`"${name}" ${keyword}`);
  }

  // 2. Platform-specific searches
  for (const platform of DATING_KEYWORDS.platformNames) {
    queries.push(`"${name}" ${platform}`);
  }

  // 3. "Met on" style indirect mentions
  for (const keyword of DATING_KEYWORDS.metOnKeywords) {
    queries.push(`"${name}" ${keyword}`);
  }

  // 4. Location + dating (more targeted)
  if (location) {
    queries.push(`"${name}" ${location} dating`);
    queries.push(`"${name}" ${location} tinder`);
    queries.push(`"${name}" ${location} bumble`);
    queries.push(`"${name}" ${location} hinge`);
    queries.push(`"${name}" dating ${location}`);
  }

  // 5. Username on dating platforms
  if (username) {
    const cleanUsername = username.replace(/^@/, "");
    queries.push(`${cleanUsername} dating profile`);
    queries.push(`${cleanUsername} tinder`);
    queries.push(`${cleanUsername} bumble`);
    queries.push(`${cleanUsername} hinge`);
    queries.push(`${cleanUsername} dating app`);
  }

  // 6. Screenshot and mirror searches
  queries.push(`"${name}" dating profile screenshot`);
  queries.push(`"${name}" tinder screenshot`);
  queries.push(`"${name}" dating app screenshot`);

  // De-duplicate
  return [...new Set(queries)];
}

/**
 * Generate cache/archive queries specifically for dating pages.
 * Searches:
 * - web.archive.org (Wayback Machine)
 * - Google cached pages
 * - Archive.is / Archive.ph mirrors
 *
 * @param name Person's name
 * @param username Optional username
 * @returns Array of archive-focused dating queries
 */
export function generateDatingArchiveQueries(
  name: string,
  username?: string
): string[] {
  const queries: string[] = [];

  if (!name?.trim()) return queries;

  // 1. Wayback Machine searches for dating content
  queries.push(`"${name}" dating site:web.archive.org`);
  queries.push(`"${name}" tinder site:web.archive.org`);
  queries.push(`"${name}" dating profile site:web.archive.org`);

  // 2. Archive.is / Archive.ph searches
  queries.push(`"${name}" dating site:archive.is`);
  queries.push(`"${name}" dating site:archive.ph`);
  queries.push(`"${name}" tinder site:archive.is`);

  // 3. Cached page style queries
  queries.push(`"${name}" dating profile cached`);
  queries.push(`"${name}" tinder cached`);
  queries.push(`cache:"${name}" dating`);

  // 4. Dating platform archive searches
  for (const platform of DATING_PLATFORM_CONFIGS) {
    for (const domain of platform.archiveDomains || []) {
      queries.push(`"${name}" site:web.archive.org/${domain}`);
    }
  }

  // 5. Username archive searches
  if (username) {
    const cleanUsername = username.replace(/^@/, "");
    queries.push(`${cleanUsername} site:web.archive.org dating`);
    queries.push(`${cleanUsername} tinder site:web.archive.org`);
    queries.push(`${cleanUsername} dating cached`);
  }

  // 6. Deleted/old profile searches
  queries.push(`"${name}" deleted tinder`);
  queries.push(`"${name}" old dating profile`);
  queries.push(`"${name}" previous dating profile`);

  // De-duplicate
  return [...new Set(queries)];
}

// ============================================================================
// LEGAL & PUBLIC RECORDS PORTAL CONFIGURATION
// ============================================================================

/**
 * Legal portal types for different record categories
 */
export type LegalPortalType =
  | "county_clerk"
  | "circuit_court"
  | "district_court"
  | "state_judiciary"
  | "jail_roster"
  | "inmate_search"
  | "state_doc"
  | "federal_court"
  | "aggregator";

/**
 * A legal/public records portal result
 * These are returned as links the user can open
 */
export interface LegalPortalResult {
  portalType: LegalPortalType;
  portalName: string;
  url: string;
  jurisdiction: string; // e.g., "Harris County, TX" or "State of California"
  description: string;
  isGovDomain: boolean; // True for .gov domains
  note?: string; // e.g., "This is the official search portal for Harris County."
  searchable: boolean; // True if portal allows name search, false if index-only
}

/**
 * US State abbreviations for legal portal queries
 */
export const US_STATES: Record<string, string> = {
  "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR",
  "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE",
  "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID",
  "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS",
  "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
  "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS",
  "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", "ohio": "OH", "oklahoma": "OK",
  "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT",
  "vermont": "VT", "virginia": "VA", "washington": "WA", "west virginia": "WV",
  "wisconsin": "WI", "wyoming": "WY", "district of columbia": "DC",
};

/**
 * Legal portal query templates for different portal types
 */
export const LEGAL_PORTAL_QUERY_TEMPLATES = {
  // County-level court searches
  countyClerk: [
    "{county} county clerk court records",
    "{county} county clerk case search",
    "{county} county civil court records search",
    "{county} county criminal court records",
  ],
  // Circuit/District court searches
  circuitCourt: [
    "{county} circuit court case lookup",
    "{county} district court records search",
    "{county} court case search portal",
  ],
  // State judiciary searches
  stateJudiciary: [
    "{state} judiciary case search",
    "{state} court case lookup",
    "{state} state courts case search",
    "{state} judicial branch case search site:*.gov",
  ],
  // Jail roster / booking searches
  jailRoster: [
    "{county} jail roster",
    "{county} county jail inmate search",
    "{county} sheriff inmate lookup",
    "{county} booking records",
    "{county} who is in jail",
  ],
  // State DOC / prison searches
  stateDOC: [
    "{state} department of corrections inmate search",
    "{state} DOC inmate lookup",
    "{state} prison inmate search",
    "{state} offender search site:*.gov",
  ],
  // Federal court searches
  federalCourt: [
    "PACER {state} federal court",
    "{state} federal district court case search",
    "federal court {state} case lookup",
  ],
} as const;

/**
 * Known legal record aggregator sites
 * These are useful fallbacks but user should verify
 */
export const LEGAL_AGGREGATOR_SITES = [
  { name: "CourtListener", domain: "courtlistener.com", type: "federal_state_appeals" },
  { name: "UniCourt", domain: "unicourt.com", type: "multi_state" },
  { name: "Judyrecords", domain: "judyrecords.com", type: "multi_state" },
  { name: "CaseText", domain: "casetext.com", type: "case_law" },
  { name: "RECAP Archive", domain: "free.law", type: "federal" },
] as const;

/**
 * Extract state from location string
 * @param location Location string like "Austin, TX" or "California"
 * @returns State name in lowercase or undefined
 */
export function extractStateFromLocation(location?: string): string | undefined {
  if (!location) return undefined;

  const normalized = location.toLowerCase().trim();

  // Check if it's a full state name
  if (US_STATES[normalized]) {
    return normalized;
  }

  // Check for state abbreviation (e.g., "Austin, TX")
  const abbrevMatch = location.match(/,\s*([A-Z]{2})\s*$/i);
  if (abbrevMatch) {
    const abbrev = abbrevMatch[1].toUpperCase();
    const stateName = Object.entries(US_STATES).find(([_, ab]) => ab === abbrev)?.[0];
    if (stateName) return stateName;
  }

  // Check if location contains a state name
  for (const stateName of Object.keys(US_STATES)) {
    if (normalized.includes(stateName)) {
      return stateName;
    }
  }

  return undefined;
}

/**
 * Extract county from location or county field
 * @param county Direct county input
 * @param location Location string that might contain county
 * @returns County name or undefined
 */
export function extractCounty(county?: string, location?: string): string | undefined {
  // Use direct county if provided
  if (county) {
    // Remove "county" suffix if present for normalization
    return county.replace(/\s+county$/i, "").trim();
  }

  // Try to extract from location (e.g., "Harris County, TX")
  if (location) {
    const countyMatch = location.match(/([A-Za-z\s]+)\s+county/i);
    if (countyMatch) {
      return countyMatch[1].trim();
    }
  }

  return undefined;
}

/**
 * Generate legal portal discovery queries
 * These queries help find official court/records portals
 *
 * @param input Query generator input with optional state/county/age
 * @returns Array of search queries focused on finding legal portals
 */
export function generateLegalPortalQueries(input: {
  name: string;
  location?: string;
  county?: string;
  state?: string;
  middleInitial?: string;
  ageRange?: string;
  birthYear?: string;
}): string[] {
  const queries: string[] = [];
  const { name, location, county, middleInitial, ageRange, birthYear } = input;

  // Extract state and county from inputs
  const stateFromLocation = extractStateFromLocation(location);
  const state = input.state?.toLowerCase() || stateFromLocation;
  const countyName = extractCounty(county, location);

  // Build name variations
  const nameParts = name.split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
  const fullNameWithMiddle = middleInitial && nameParts.length >= 2
    ? `${firstName} ${middleInitial} ${lastName}`
    : null;

  // ========================================================================
  // PASS 1: Portal Discovery Queries (find the official search portals)
  // ========================================================================

  // County-level portal discovery
  if (countyName) {
    for (const template of LEGAL_PORTAL_QUERY_TEMPLATES.countyClerk) {
      queries.push(template.replace("{county}", countyName));
    }
    for (const template of LEGAL_PORTAL_QUERY_TEMPLATES.circuitCourt) {
      queries.push(template.replace("{county}", countyName));
    }
    for (const template of LEGAL_PORTAL_QUERY_TEMPLATES.jailRoster) {
      queries.push(template.replace("{county}", countyName));
    }
  }

  // State-level portal discovery
  if (state) {
    for (const template of LEGAL_PORTAL_QUERY_TEMPLATES.stateJudiciary) {
      queries.push(template.replace("{state}", state));
    }
    for (const template of LEGAL_PORTAL_QUERY_TEMPLATES.stateDOC) {
      queries.push(template.replace("{state}", state));
    }
    for (const template of LEGAL_PORTAL_QUERY_TEMPLATES.federalCourt) {
      queries.push(template.replace("{state}", state));
    }
  }

  // ========================================================================
  // PASS 2: Direct Name Searches on Common Aggregators
  // ========================================================================

  // Person-specific searches on known aggregator sites
  queries.push(`"${name}" site:courtlistener.com`);
  queries.push(`"${name}" site:unicourt.com`);
  queries.push(`"${name}" site:judyrecords.com`);

  // With location for better targeting
  if (state) {
    queries.push(`"${name}" ${state} court records`);
    queries.push(`"${name}" ${state} case search`);
  }
  if (countyName) {
    queries.push(`"${name}" ${countyName} county court`);
    queries.push(`"${name}" ${countyName} county case`);
  }

  // ========================================================================
  // PASS 3: Government Domain Preference Queries
  // ========================================================================

  // .gov domain searches (highest trust)
  queries.push(`"${name}" site:*.gov court`);
  queries.push(`"${name}" site:*.gov case`);

  if (state) {
    queries.push(`"${name}" site:*.${US_STATES[state]?.toLowerCase() || state}.gov`);
    queries.push(`"${name}" ${state} site:*.gov`);
  }

  // ========================================================================
  // PASS 4: Specific Record Type Searches
  // ========================================================================

  // Court case searches
  queries.push(`"${name}" court case`);
  queries.push(`"${name}" lawsuit`);
  queries.push(`"${name}" defendant`);
  queries.push(`"${name}" plaintiff`);

  // Criminal/arrest searches
  queries.push(`"${name}" arrest record`);
  queries.push(`"${name}" mugshot`);
  queries.push(`"${name}" criminal record`);
  queries.push(`"${name}" booking`);

  // Inmate/jail searches
  queries.push(`"${name}" inmate`);
  queries.push(`"${name}" jail`);
  queries.push(`"${name}" prison`);

  // With middle initial for disambiguation
  if (fullNameWithMiddle) {
    queries.push(`"${fullNameWithMiddle}" court case`);
    queries.push(`"${fullNameWithMiddle}" arrest`);
    if (state) {
      queries.push(`"${fullNameWithMiddle}" ${state} court`);
    }
    if (countyName) {
      queries.push(`"${fullNameWithMiddle}" ${countyName} county`);
    }
  }

  // ========================================================================
  // PASS 5: Age/Birth Year Disambiguation (if available)
  // ========================================================================

  if (birthYear) {
    queries.push(`"${name}" ${birthYear} court`);
    queries.push(`"${name}" DOB ${birthYear}`);
    if (state) {
      queries.push(`"${name}" ${birthYear} ${state}`);
    }
  } else if (ageRange) {
    // Try to derive approximate birth year from age range
    const currentYear = new Date().getFullYear();
    const ageMatch = ageRange.match(/(\d+)/);
    if (ageMatch) {
      const approxBirthYear = currentYear - parseInt(ageMatch[1]);
      queries.push(`"${name}" ${approxBirthYear} court`);
      queries.push(`"${name}" born ${approxBirthYear}`);
    }
  }

  // De-duplicate
  return [...new Set(queries)];
}

/**
 * Parse legal portal results from search response
 * Identifies .gov domains and categorizes portal types
 *
 * @param responseText Raw response from search
 * @param jurisdiction Default jurisdiction context
 * @returns Array of parsed legal portal results
 */
export function parseLegalPortalResults(
  responseText: string,
  jurisdiction?: string
): LegalPortalResult[] {
  const results: LegalPortalResult[] = [];
  const seenUrls = new Set<string>();

  // URL extraction pattern
  const urlPattern = /(https?:\/\/[^\s\)\]\>]+)/g;
  let match;

  while ((match = urlPattern.exec(responseText)) !== null) {
    const url = match[1];
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);

    const lowerUrl = url.toLowerCase();

    // Determine if this is a legal/court-related URL
    const isLegalUrl = (
      lowerUrl.includes("court") ||
      lowerUrl.includes("judiciary") ||
      lowerUrl.includes("case") ||
      lowerUrl.includes("inmate") ||
      lowerUrl.includes("jail") ||
      lowerUrl.includes("sheriff") ||
      lowerUrl.includes("corrections") ||
      lowerUrl.includes("doc.") ||
      lowerUrl.includes("pacer") ||
      lowerUrl.includes("clerk") ||
      lowerUrl.includes("docket") ||
      LEGAL_AGGREGATOR_SITES.some(agg => lowerUrl.includes(agg.domain))
    );

    if (!isLegalUrl) continue;

    // Determine portal type
    let portalType: LegalPortalType = "aggregator";
    if (lowerUrl.includes("clerk")) {
      portalType = "county_clerk";
    } else if (lowerUrl.includes("circuit")) {
      portalType = "circuit_court";
    } else if (lowerUrl.includes("district") && !lowerUrl.includes("fed")) {
      portalType = "district_court";
    } else if (lowerUrl.includes("judiciary") || lowerUrl.includes("courts.")) {
      portalType = "state_judiciary";
    } else if (lowerUrl.includes("jail") || lowerUrl.includes("roster") || lowerUrl.includes("booking")) {
      portalType = "jail_roster";
    } else if (lowerUrl.includes("inmate")) {
      portalType = "inmate_search";
    } else if (lowerUrl.includes("corrections") || lowerUrl.includes("doc.")) {
      portalType = "state_doc";
    } else if (lowerUrl.includes("pacer") || lowerUrl.includes("uscourts")) {
      portalType = "federal_court";
    }

    // Check if .gov domain
    const isGovDomain = lowerUrl.includes(".gov");

    // Extract portal name from URL
    let portalName = "Court Records Portal";
    try {
      const domain = new URL(url).hostname.replace("www.", "");
      portalName = domain;
    } catch {
      // Keep default
    }

    // Get context around URL for description
    const urlIndex = responseText.indexOf(url);
    const contextStart = Math.max(0, urlIndex - 100);
    const contextEnd = Math.min(responseText.length, urlIndex + url.length + 100);
    const context = responseText.slice(contextStart, contextEnd);

    // Extract description from context
    const description = context
      .replace(url, "")
      .replace(/[\n\r]+/g, " ")
      .trim()
      .slice(0, 150) || `${portalType.replace(/_/g, " ")} portal`;

    results.push({
      portalType,
      portalName,
      url,
      jurisdiction: jurisdiction || "Unknown",
      description,
      isGovDomain,
      note: isGovDomain
        ? "Official government search portal"
        : "Third-party records aggregator",
      searchable: true, // Assume searchable unless we know otherwise
    });
  }

  // Sort by priority: .gov domains first, then by portal type
  results.sort((a, b) => {
    if (a.isGovDomain && !b.isGovDomain) return -1;
    if (!a.isGovDomain && b.isGovDomain) return 1;
    return 0;
  });

  return results;
}

// ============================================================================
// IMAGES & VISUAL FOOTPRINT CONFIGURATION
// ============================================================================

/**
 * Image source types for categorizing where images were found
 */
export type ImageSourceType =
  | "profile_photo"
  | "social_media"
  | "news_article"
  | "professional"
  | "dating_platform"
  | "public_directory"
  | "reverse_image"
  | "cached_archive"
  | "other";

/**
 * An image search result card
 * Link-first output so user can open sources
 */
export interface ImageSearchResult {
  thumbnailUrl: string; // URL to thumbnail/preview image
  sourcePageUrl: string; // URL to the page where image was found
  title?: string; // Page title or image alt text
  snippet?: string; // Context snippet around the image
  sourceType: ImageSourceType; // Category of image source
  sourceDomain: string; // Domain where image was found
  dimensions?: { width: number; height: number }; // If available
  similarity?: number; // 0-1 score for dedup (1 = identical)
  isVerified: boolean; // True if confirmed to match the person
}

/**
 * Image search query templates
 */
export const IMAGE_SEARCH_QUERY_TEMPLATES = {
  // Direct name + image searches
  nameImage: [
    '"{name}" photo',
    '"{name}" profile photo',
    '"{name}" profile picture',
    '"{name}" headshot',
    '"{name}" picture',
  ],
  // Name + location image searches
  nameLocationImage: [
    '"{name}" {location} photo',
    '"{name}" {location} profile',
    '"{name}" {location} picture',
  ],
  // Username image searches
  usernameImage: [
    "{username} profile photo",
    "{username} profile picture",
    "{username} avatar",
    "{username} photo",
  ],
  // Platform-specific image searches
  platformImage: [
    '"{name}" linkedin photo',
    '"{name}" facebook profile picture',
    '"{name}" instagram photo',
    '"{name}" twitter profile',
    '"{name}" tiktok profile',
  ],
  // Professional/news image searches
  professionalImage: [
    '"{name}" speaker photo',
    '"{name}" company photo',
    '"{name}" team photo',
    '"{name}" staff photo',
    '"{name}" press photo',
  ],
  // Dating platform image searches
  datingImage: [
    '"{name}" dating profile photo',
    '"{name}" tinder photo',
    '"{name}" bumble profile',
    '"{name}" hinge photo',
  ],
} as const;

/**
 * Known image hosting domains for source type detection
 */
export const IMAGE_SOURCE_DOMAINS: Record<string, ImageSourceType> = {
  // Social media
  "instagram.com": "social_media",
  "fbcdn.net": "social_media",
  "facebook.com": "social_media",
  "twitter.com": "social_media",
  "twimg.com": "social_media",
  "tiktok.com": "social_media",
  // Professional
  "linkedin.com": "professional",
  "licdn.com": "professional",
  "glassdoor.com": "professional",
  // Dating
  "tinder.com": "dating_platform",
  "bumble.com": "dating_platform",
  "hinge.co": "dating_platform",
  "okcupid.com": "dating_platform",
  "match.com": "dating_platform",
  // News/media
  "getty": "news_article",
  "reuters": "news_article",
  "ap.org": "news_article",
  // Archives
  "archive.org": "cached_archive",
  "web.archive.org": "cached_archive",
  "archive.is": "cached_archive",
  "archive.ph": "cached_archive",
};

/**
 * Generate image search queries
 * Uses name, location, and username for comprehensive image discovery
 *
 * @param input Query generator input
 * @returns Array of image-focused search queries
 */
export function generateImageSearchQueries(input: {
  name: string;
  location?: string;
  username?: string;
  workplace?: string;
}): string[] {
  const queries: string[] = [];
  const { name, location, username, workplace } = input;

  // ========================================================================
  // PASS 1: Direct Name + Image Searches
  // ========================================================================

  for (const template of IMAGE_SEARCH_QUERY_TEMPLATES.nameImage) {
    queries.push(template.replace("{name}", name));
  }

  // ========================================================================
  // PASS 2: Name + Location Image Searches
  // ========================================================================

  if (location) {
    for (const template of IMAGE_SEARCH_QUERY_TEMPLATES.nameLocationImage) {
      queries.push(
        template.replace("{name}", name).replace("{location}", location)
      );
    }
  }

  // ========================================================================
  // PASS 3: Username Image Searches
  // ========================================================================

  if (username) {
    for (const template of IMAGE_SEARCH_QUERY_TEMPLATES.usernameImage) {
      queries.push(template.replace("{username}", username));
    }

    // Username variations
    const variations = generateUsernameVariations(username);
    for (const variation of variations.slice(0, 3)) {
      queries.push(`${variation} profile photo`);
      queries.push(`${variation} avatar`);
    }
  }

  // ========================================================================
  // PASS 4: Platform-Specific Image Searches
  // ========================================================================

  for (const template of IMAGE_SEARCH_QUERY_TEMPLATES.platformImage) {
    queries.push(template.replace("{name}", name));
  }

  // ========================================================================
  // PASS 5: Professional/News Image Searches
  // ========================================================================

  for (const template of IMAGE_SEARCH_QUERY_TEMPLATES.professionalImage) {
    queries.push(template.replace("{name}", name));
  }

  // Workplace-specific searches
  if (workplace) {
    queries.push(`"${name}" ${workplace} photo`);
    queries.push(`"${name}" ${workplace} headshot`);
    queries.push(`"${name}" ${workplace} team`);
  }

  // ========================================================================
  // PASS 6: Dating Platform Image Searches
  // ========================================================================

  for (const template of IMAGE_SEARCH_QUERY_TEMPLATES.datingImage) {
    queries.push(template.replace("{name}", name));
  }

  // ========================================================================
  // PASS 7: Archive/Cached Image Searches
  // ========================================================================

  queries.push(`"${name}" photo site:web.archive.org`);
  queries.push(`"${name}" profile picture cached`);
  if (username) {
    queries.push(`${username} photo site:web.archive.org`);
    queries.push(`${username} profile cached`);
  }

  // ========================================================================
  // PASS 8: Reverse Image Search Pointers
  // ========================================================================

  // These won't directly do reverse image search but can find discussions about it
  queries.push(`"${name}" reverse image`);
  queries.push(`"${name}" image search results`);

  // De-duplicate
  return [...new Set(queries)];
}

/**
 * Detect image source type from URL
 */
export function detectImageSourceType(url: string): ImageSourceType {
  const lowerUrl = url.toLowerCase();

  // Check known domains
  for (const [domain, sourceType] of Object.entries(IMAGE_SOURCE_DOMAINS)) {
    if (lowerUrl.includes(domain)) {
      return sourceType;
    }
  }

  // Heuristic detection
  if (lowerUrl.includes("profile") || lowerUrl.includes("avatar")) {
    return "profile_photo";
  }
  if (lowerUrl.includes("news") || lowerUrl.includes("article")) {
    return "news_article";
  }
  if (lowerUrl.includes("dating") || lowerUrl.includes("tinder") || lowerUrl.includes("bumble")) {
    return "dating_platform";
  }
  if (lowerUrl.includes("linkedin") || lowerUrl.includes("company") || lowerUrl.includes("corporate")) {
    return "professional";
  }

  return "other";
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch {
    // Try to extract domain from malformed URL
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/\s]+)/i);
    return match ? match[1] : "unknown";
  }
}

/**
 * Simple image URL similarity check based on URL structure
 * Returns a similarity score 0-1
 */
function calculateImageSimilarity(url1: string, url2: string): number {
  const lower1 = url1.toLowerCase();
  const lower2 = url2.toLowerCase();

  // Exact match
  if (lower1 === lower2) return 1.0;

  // Same domain + similar path
  const domain1 = extractDomain(url1);
  const domain2 = extractDomain(url2);

  if (domain1 !== domain2) return 0;

  // Extract image filename
  const filename1 = url1.split("/").pop()?.split("?")[0] || "";
  const filename2 = url2.split("/").pop()?.split("?")[0] || "";

  if (filename1 === filename2) return 0.95;

  // Check for resized versions (common patterns)
  const baseFilename1 = filename1.replace(/[-_]\d+x\d+/g, "").replace(/[-_](small|medium|large|thumb)/gi, "");
  const baseFilename2 = filename2.replace(/[-_]\d+x\d+/g, "").replace(/[-_](small|medium|large|thumb)/gi, "");

  if (baseFilename1 === baseFilename2) return 0.9;

  return 0;
}

/**
 * Parse image search results from search response
 * Extracts image URLs, source pages, and metadata
 * De-duplicates near-identical images
 *
 * @param responseText Raw response from search
 * @param personName Name being searched for context
 * @returns Array of parsed image results
 */
export function parseImageSearchResults(
  responseText: string,
  personName: string
): ImageSearchResult[] {
  const results: ImageSearchResult[] = [];
  const seenImageUrls = new Set<string>();

  // Pattern to find image URLs (common image extensions and CDN patterns)
  const imageUrlPattern = /(https?:\/\/[^\s\)\]\>]+\.(?:jpg|jpeg|png|gif|webp|bmp)(?:\?[^\s\)\]\>]*)?)/gi;

  // Pattern to find page URLs that might contain images
  const pageUrlPattern = /(https?:\/\/[^\s\)\]\>]+)/g;

  // Extract direct image URLs
  let match;
  while ((match = imageUrlPattern.exec(responseText)) !== null) {
    const imageUrl = match[1];
    if (seenImageUrls.has(imageUrl.toLowerCase())) continue;

    // Check similarity with existing results
    let isDuplicate = false;
    for (const existing of results) {
      const similarity = calculateImageSimilarity(imageUrl, existing.thumbnailUrl);
      if (similarity > 0.85) {
        isDuplicate = true;
        break;
      }
    }

    if (isDuplicate) continue;
    seenImageUrls.add(imageUrl.toLowerCase());

    // Get context around the URL
    const urlIndex = responseText.indexOf(imageUrl);
    const contextStart = Math.max(0, urlIndex - 150);
    const contextEnd = Math.min(responseText.length, urlIndex + imageUrl.length + 150);
    const context = responseText.slice(contextStart, contextEnd);

    // Try to extract title from context
    const titleMatch = context.match(/(?:title|alt|caption)[:\s]*["']?([^"'\n]+)["']?/i);
    const title = titleMatch ? titleMatch[1].trim().slice(0, 100) : undefined;

    // Extract snippet (text around the URL)
    const snippet = context
      .replace(imageUrl, "")
      .replace(/[\n\r]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200) || undefined;

    const sourceDomain = extractDomain(imageUrl);
    const sourceType = detectImageSourceType(imageUrl);

    // Check if image appears to be verified (name mentioned in context)
    const nameParts = personName.toLowerCase().split(/\s+/);
    const contextLower = context.toLowerCase();
    const isVerified = nameParts.some(part => part.length > 2 && contextLower.includes(part));

    results.push({
      thumbnailUrl: imageUrl,
      sourcePageUrl: imageUrl, // Will be updated if we find the page URL
      title,
      snippet,
      sourceType,
      sourceDomain,
      isVerified,
    });
  }

  // Also look for page URLs that might be image sources
  const pageUrls: string[] = [];
  while ((match = pageUrlPattern.exec(responseText)) !== null) {
    const url = match[1];
    // Skip if it's already an image URL
    if (/\.(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i.test(url)) continue;

    // Check if this looks like an image source page
    const lowerUrl = url.toLowerCase();
    const isImagePage = (
      lowerUrl.includes("photo") ||
      lowerUrl.includes("image") ||
      lowerUrl.includes("picture") ||
      lowerUrl.includes("profile") ||
      lowerUrl.includes("gallery") ||
      lowerUrl.includes("/p/") || // Instagram pattern
      lowerUrl.includes("/status/") // Twitter pattern
    );

    if (isImagePage && !seenImageUrls.has(url.toLowerCase())) {
      pageUrls.push(url);
    }
  }

  // Add page URLs as potential image sources (without direct thumbnail)
  for (const pageUrl of pageUrls.slice(0, 10)) {
    const sourceDomain = extractDomain(pageUrl);
    const sourceType = detectImageSourceType(pageUrl);

    // Get context
    const urlIndex = responseText.indexOf(pageUrl);
    const contextStart = Math.max(0, urlIndex - 100);
    const contextEnd = Math.min(responseText.length, urlIndex + pageUrl.length + 100);
    const context = responseText.slice(contextStart, contextEnd);

    const snippet = context
      .replace(pageUrl, "")
      .replace(/[\n\r]+/g, " ")
      .trim()
      .slice(0, 150) || undefined;

    const nameParts = personName.toLowerCase().split(/\s+/);
    const contextLower = context.toLowerCase();
    const isVerified = nameParts.some(part => part.length > 2 && contextLower.includes(part));

    results.push({
      thumbnailUrl: "", // No direct thumbnail available
      sourcePageUrl: pageUrl,
      title: `Image source on ${sourceDomain}`,
      snippet,
      sourceType,
      sourceDomain,
      isVerified,
    });
  }

  // Sort results: verified first, then by source type priority
  const sourceTypePriority: Record<ImageSourceType, number> = {
    profile_photo: 1,
    professional: 2,
    social_media: 3,
    dating_platform: 4,
    news_article: 5,
    public_directory: 6,
    reverse_image: 7,
    cached_archive: 8,
    other: 9,
  };

  results.sort((a, b) => {
    // Verified images first
    if (a.isVerified && !b.isVerified) return -1;
    if (!a.isVerified && b.isVerified) return 1;

    // Then by source type priority
    return (sourceTypePriority[a.sourceType] || 10) - (sourceTypePriority[b.sourceType] || 10);
  });

  // Limit to top results
  return results.slice(0, 20);
}

// ============================================================================
// ARCHIVED PAGE TYPES
// ============================================================================

/**
 * Archive source type - which archive service provided the snapshot
 */
export type ArchiveSourceType =
  | "wayback_machine" // web.archive.org
  | "archive_is" // archive.is / archive.ph
  | "google_cache" // webcache.googleusercontent.com
  | "cached_page" // generic cached/mirror
  | "other";

/**
 * An archived/cached page result card
 * Link-first output - provides direct links to archived snapshots
 * Results are labeled as "archived snapshots" to distinguish from live pages
 */
export interface ArchivedPageResult {
  archiveUrl: string; // Direct link to the archived page (Wayback, archive.is, etc.)
  originalUrl: string; // The original URL that was archived
  snapshotDate?: string; // When the snapshot was taken (ISO date if available)
  snapshotLabel: string; // Human-readable label, e.g., "Archived snapshot from March 2023"
  title?: string; // Page title if available
  description?: string; // Brief description of what was found
  archiveSource: ArchiveSourceType; // Which archive service
  contentType?: "profile" | "post" | "article" | "page" | "image" | "other"; // What kind of content
  isVerified: boolean; // True if content appears to match the search subject
}

/**
 * Archive-focused query templates
 */
export const ARCHIVE_SEARCH_QUERY_TEMPLATES = {
  // Wayback Machine searches
  waybackMachine: [
    '"{name}" site:web.archive.org',
    '"{name}" {location} site:web.archive.org',
    "{username} site:web.archive.org",
  ],
  // Archive.is / Archive.ph searches
  archiveIs: [
    '"{name}" site:archive.is',
    '"{name}" site:archive.ph',
    "{username} site:archive.is",
    "{username} site:archive.ph",
  ],
  // General cached/archive searches
  cachedSearches: [
    '"{name}" cached profile',
    '"{name}" archived profile',
    '"{name}" deleted profile',
    "{username} cached",
    "{username} archived",
    "{username} deleted",
  ],
  // Profile URL archive searches (when known URLs are discovered)
  profileArchive: [
    "site:web.archive.org/{profileUrl}",
    "site:archive.is/{profileUrl}",
  ],
} as const;

/**
 * Known archive service domains for source detection
 */
export const ARCHIVE_SERVICE_DOMAINS: Record<string, ArchiveSourceType> = {
  "web.archive.org": "wayback_machine",
  "archive.org": "wayback_machine",
  "archive.is": "archive_is",
  "archive.ph": "archive_is",
  "archive.today": "archive_is",
  "archive.li": "archive_is",
  "archive.vn": "archive_is",
  "archive.md": "archive_is",
  "webcache.googleusercontent.com": "google_cache",
  "cachedview.com": "cached_page",
  "cachedpages.com": "cached_page",
};

/**
 * Generate archive search queries
 * Searches web.archive.org, archive.is, and other archive services
 * for snapshots of pages related to the person
 *
 * @param input Query generator input with name, location, username, and optional discovered URLs
 * @returns Array of archive-focused search queries
 */
export function generateArchiveSearchQueries(input: {
  name: string;
  location?: string;
  username?: string;
  discoveredProfileUrls?: string[]; // URLs discovered in earlier passes
}): string[] {
  const queries: string[] = [];
  const { name, location, username, discoveredProfileUrls } = input;

  // ========================================================================
  // PASS 1: Wayback Machine Searches
  // ========================================================================

  // Name + site:web.archive.org
  queries.push(`"${name}" site:web.archive.org`);

  // Name + location + Wayback
  if (location) {
    queries.push(`"${name}" ${location} site:web.archive.org`);
  }

  // Username + Wayback
  if (username) {
    const cleanUsername = username.replace(/^@/, "");
    queries.push(`${cleanUsername} site:web.archive.org`);
    queries.push(`"${cleanUsername}" profile site:web.archive.org`);
  }

  // ========================================================================
  // PASS 2: Archive.is / Archive.ph Searches
  // ========================================================================

  queries.push(`"${name}" site:archive.is`);
  queries.push(`"${name}" site:archive.ph`);

  if (username) {
    const cleanUsername = username.replace(/^@/, "");
    queries.push(`${cleanUsername} site:archive.is`);
    queries.push(`${cleanUsername} site:archive.ph`);
  }

  // ========================================================================
  // PASS 3: General Cached/Archived Page Searches
  // ========================================================================

  queries.push(`"${name}" cached profile`);
  queries.push(`"${name}" archived profile`);
  queries.push(`"${name}" deleted profile`);
  queries.push(`"${name}" old profile`);

  if (username) {
    const cleanUsername = username.replace(/^@/, "");
    queries.push(`${cleanUsername} cached`);
    queries.push(`${cleanUsername} archived`);
    queries.push(`${cleanUsername} deleted account`);
  }

  // ========================================================================
  // PASS 4: Discovered Profile URL Archive Searches
  // ========================================================================

  if (discoveredProfileUrls && discoveredProfileUrls.length > 0) {
    // For each discovered URL, search for archived versions
    for (const url of discoveredProfileUrls.slice(0, 5)) {
      // Limit to first 5
      // Extract domain and path for archive searches
      try {
        const urlObj = new URL(url);
        const pathForSearch = urlObj.hostname + urlObj.pathname;

        // Search Wayback Machine for this specific URL
        queries.push(`site:web.archive.org "${pathForSearch}"`);
        queries.push(`site:web.archive.org/${urlObj.hostname}${urlObj.pathname}`);

        // Search archive.is for this URL
        queries.push(`site:archive.is "${pathForSearch}"`);
      } catch {
        // If URL parsing fails, use as-is
        queries.push(`"${url}" site:web.archive.org`);
      }
    }
  }

  // ========================================================================
  // PASS 5: Platform-Specific Archive Searches
  // ========================================================================

  // Social media archives
  const socialPlatforms = [
    "instagram.com",
    "facebook.com",
    "twitter.com",
    "linkedin.com",
    "tiktok.com",
  ];

  for (const platform of socialPlatforms) {
    queries.push(`"${name}" site:web.archive.org/${platform}`);
  }

  // Dating platform archives
  const datingPlatforms = [
    "tinder.com",
    "bumble.com",
    "hinge.co",
    "okcupid.com",
    "match.com",
  ];

  for (const platform of datingPlatforms) {
    queries.push(`"${name}" site:web.archive.org/${platform}`);
  }

  if (username) {
    const cleanUsername = username.replace(/^@/, "");
    for (const platform of [...socialPlatforms, ...datingPlatforms].slice(0, 5)) {
      queries.push(`${cleanUsername} site:web.archive.org/${platform}`);
    }
  }

  // De-duplicate
  return [...new Set(queries)];
}

/**
 * Detect archive source type from URL
 */
function detectArchiveSourceType(url: string): ArchiveSourceType {
  const lowerUrl = url.toLowerCase();

  for (const [domain, sourceType] of Object.entries(ARCHIVE_SERVICE_DOMAINS)) {
    if (lowerUrl.includes(domain)) {
      return sourceType;
    }
  }

  // Check for other archive indicators
  if (lowerUrl.includes("cache") || lowerUrl.includes("cached")) {
    return "cached_page";
  }

  return "other";
}

/**
 * Extract original URL from an archive URL
 * e.g., "https://web.archive.org/web/20230315/https://example.com/profile" -> "https://example.com/profile"
 */
function extractOriginalUrlFromArchive(archiveUrl: string): string {
  // Wayback Machine format: web.archive.org/web/TIMESTAMP/ORIGINAL_URL
  const waybackMatch = archiveUrl.match(
    /web\.archive\.org\/web\/\d+\/(.+)/i
  );
  if (waybackMatch) {
    return waybackMatch[1];
  }

  // Archive.is format varies - try to extract
  const archiveIsMatch = archiveUrl.match(
    /archive\.(is|ph|today|li|vn|md)\/[^\/]+\/(.+)/i
  );
  if (archiveIsMatch) {
    return archiveIsMatch[2];
  }

  // Google cache format
  const googleCacheMatch = archiveUrl.match(
    /webcache\.googleusercontent\.com\/search\?q=cache:[^:]+:([^&+]+)/i
  );
  if (googleCacheMatch) {
    return decodeURIComponent(googleCacheMatch[1]);
  }

  return archiveUrl;
}

/**
 * Extract snapshot date from archive URL
 * e.g., "https://web.archive.org/web/20230315120000/..." -> "2023-03-15"
 */
function extractSnapshotDate(archiveUrl: string): string | undefined {
  // Wayback Machine timestamp format: YYYYMMDDHHMMSS
  const waybackMatch = archiveUrl.match(
    /web\.archive\.org\/web\/(\d{4})(\d{2})(\d{2})/i
  );
  if (waybackMatch) {
    return `${waybackMatch[1]}-${waybackMatch[2]}-${waybackMatch[3]}`;
  }

  return undefined;
}

/**
 * Format a snapshot date into a human-readable label
 */
function formatSnapshotLabel(
  snapshotDate: string | undefined,
  archiveSource: ArchiveSourceType
): string {
  const sourceLabels: Record<ArchiveSourceType, string> = {
    wayback_machine: "Wayback Machine",
    archive_is: "Archive.is",
    google_cache: "Google Cache",
    cached_page: "Cached page",
    other: "Archived page",
  };

  const sourceLabel = sourceLabels[archiveSource];

  if (snapshotDate) {
    try {
      const date = new Date(snapshotDate);
      const monthYear = date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      return `Archived snapshot from ${monthYear} (${sourceLabel})`;
    } catch {
      return `Archived snapshot (${sourceLabel})`;
    }
  }

  return `Archived snapshot (${sourceLabel})`;
}

/**
 * Detect content type from URL patterns
 */
function detectArchiveContentType(
  url: string
): ArchivedPageResult["contentType"] {
  const lowerUrl = url.toLowerCase();

  if (
    lowerUrl.includes("/profile") ||
    lowerUrl.includes("/user/") ||
    lowerUrl.includes("/u/") ||
    lowerUrl.includes("/people/") ||
    lowerUrl.includes("/in/")
  ) {
    return "profile";
  }

  if (
    lowerUrl.includes("/post") ||
    lowerUrl.includes("/status/") ||
    lowerUrl.includes("/p/")
  ) {
    return "post";
  }

  if (
    lowerUrl.includes("/article") ||
    lowerUrl.includes("/news/") ||
    lowerUrl.includes("/blog/")
  ) {
    return "article";
  }

  if (
    lowerUrl.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i) ||
    lowerUrl.includes("/photo") ||
    lowerUrl.includes("/image")
  ) {
    return "image";
  }

  return "page";
}

/**
 * Parse archived page results from raw response text
 * Extracts archive URLs, original URLs, snapshot dates, and labels results
 *
 * @param responseText Raw response text containing archive URLs
 * @param personName Name of the person being searched (for verification)
 * @returns Array of parsed ArchivedPageResult objects
 */
export function parseArchivedPageResults(
  responseText: string,
  personName: string
): ArchivedPageResult[] {
  const results: ArchivedPageResult[] = [];
  const seenArchiveUrls = new Set<string>();

  // Pattern to find archive URLs
  const archiveUrlPattern =
    /(https?:\/\/(?:web\.archive\.org|archive\.(?:is|ph|today|li|vn|md)|webcache\.googleusercontent\.com)[^\s\)\]\>]+)/gi;

  // Also look for mentions of archived/cached content with URLs
  const cachedMentionPattern =
    /(?:cached|archived|snapshot|wayback)[:\s]*(?:version|copy|page)?[:\s]*(https?:\/\/[^\s\)\]\>]+)/gi;

  let match;

  // Extract direct archive URLs
  while ((match = archiveUrlPattern.exec(responseText)) !== null) {
    const archiveUrl = match[1].replace(/[.,;:!?]+$/, ""); // Clean trailing punctuation

    if (seenArchiveUrls.has(archiveUrl.toLowerCase())) continue;
    seenArchiveUrls.add(archiveUrl.toLowerCase());

    const archiveSource = detectArchiveSourceType(archiveUrl);
    const originalUrl = extractOriginalUrlFromArchive(archiveUrl);
    const snapshotDate = extractSnapshotDate(archiveUrl);
    const snapshotLabel = formatSnapshotLabel(snapshotDate, archiveSource);
    const contentType = detectArchiveContentType(originalUrl);

    // Get context around the URL
    const urlIndex = responseText.indexOf(archiveUrl);
    const contextStart = Math.max(0, urlIndex - 150);
    const contextEnd = Math.min(
      responseText.length,
      urlIndex + archiveUrl.length + 150
    );
    const context = responseText.slice(contextStart, contextEnd);

    // Try to extract title from context
    const titleMatch = context.match(
      /(?:title|name|profile)[:\s]*["']?([^"'\n]{5,80})["']?/i
    );
    const title = titleMatch ? titleMatch[1].trim() : undefined;

    // Extract description from surrounding context
    const description = context
      .replace(archiveUrl, "")
      .replace(/[\n\r]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200) || undefined;

    // Check if content appears to match the person
    const nameParts = personName.toLowerCase().split(/\s+/);
    const contextLower = (context + originalUrl).toLowerCase();
    const isVerified = nameParts.some(
      (part) => part.length > 2 && contextLower.includes(part)
    );

    results.push({
      archiveUrl,
      originalUrl,
      snapshotDate,
      snapshotLabel,
      title,
      description,
      archiveSource,
      contentType,
      isVerified,
    });
  }

  // Also look for cached mentions with regular URLs
  while ((match = cachedMentionPattern.exec(responseText)) !== null) {
    const url = match[1].replace(/[.,;:!?]+$/, "");

    // Skip if it's already an archive URL or we've seen it
    if (
      url.includes("archive.org") ||
      url.includes("archive.is") ||
      seenArchiveUrls.has(url.toLowerCase())
    ) {
      continue;
    }

    seenArchiveUrls.add(url.toLowerCase());

    // This is a cached mention of a regular URL
    const urlIndex = responseText.indexOf(url);
    const contextStart = Math.max(0, urlIndex - 100);
    const contextEnd = Math.min(responseText.length, urlIndex + url.length + 100);
    const context = responseText.slice(contextStart, contextEnd);

    const nameParts = personName.toLowerCase().split(/\s+/);
    const contextLower = (context + url).toLowerCase();
    const isVerified = nameParts.some(
      (part) => part.length > 2 && contextLower.includes(part)
    );

    results.push({
      archiveUrl: url, // The cached reference
      originalUrl: url,
      snapshotDate: undefined,
      snapshotLabel: "Cached/archived reference",
      title: undefined,
      description: context
        .replace(url, "")
        .replace(/[\n\r]+/g, " ")
        .trim()
        .slice(0, 150) || undefined,
      archiveSource: "cached_page",
      contentType: detectArchiveContentType(url),
      isVerified,
    });
  }

  // Sort results: verified first, then Wayback Machine, then others
  const sourceTypePriority: Record<ArchiveSourceType, number> = {
    wayback_machine: 1,
    archive_is: 2,
    google_cache: 3,
    cached_page: 4,
    other: 5,
  };

  results.sort((a, b) => {
    // Verified results first
    if (a.isVerified && !b.isVerified) return -1;
    if (!a.isVerified && b.isVerified) return 1;

    // Then by archive source priority
    return (
      (sourceTypePriority[a.archiveSource] || 10) -
      (sourceTypePriority[b.archiveSource] || 10)
    );
  });

  // Limit to top results
  return results.slice(0, 15);
}

// ============================================================================
// EXAMPLE: Dating Queries Generated
// ============================================================================
/*
EXAMPLE 1: Name + Location (no username)
Input: { name: "Sarah Johnson", location: "Austin, TX" }

Generated Dating Queries (~40):
1.  "Sarah Johnson" dating profile
2.  "Sarah Johnson" tinder bio
3.  "Sarah Johnson" hinge profile
4.  "Sarah Johnson" bumble profile
5.  "Sarah Johnson" dating app profile
6.  "Sarah Johnson" profile screenshot
7.  "Sarah Johnson" tinder
8.  "Sarah Johnson" bumble
9.  "Sarah Johnson" hinge
10. "Sarah Johnson" okcupid
11. "Sarah Johnson" match.com
12. "Sarah Johnson" plenty of fish
13. "Sarah Johnson" met on tinder
14. "Sarah Johnson" met on hinge
15. "Sarah Johnson" matched on bumble
16. "Sarah Johnson" Austin, TX dating
17. "Sarah Johnson" Austin, TX tinder
18. "Sarah Johnson" Austin, TX bumble
19. "Sarah Johnson" Austin, TX hinge
20. "Sarah Johnson" dating profile screenshot
... (plus archive queries)

EXAMPLE 2: Username-based dating search
Input: { name: "Mike Chen", username: "mikechen92" }

Generated Dating Queries (~45):
1.  "Mike Chen" dating profile
2.  "Mike Chen" tinder bio
... (name-based queries)
15. mikechen92 dating profile
16. mikechen92 tinder
17. mikechen92 bumble
18. mikechen92 hinge
19. mikechen92 dating app
... (archive queries with username)
25. mikechen92 site:web.archive.org dating
26. mikechen92 tinder site:web.archive.org
27. mikechen92 dating cached
*/

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
  professionalInfo?: string; // Company, business, or professional role
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
    const contextStart = Math.max(0, urlIndex - 300);
    const contextEnd = Math.min(response.length, urlIndex + 400);
    const context = response.slice(contextStart, contextEnd);

    // Extract a summary from context
    const summary = extractSummaryFromContext(context, url);

    // Extract social stats from context
    const socialStats = extractSocialStatsFromContext(context, url, platform);

    sources.push({
      type,
      platform,
      url,
      summary,
      relevantDetails: [],
      isVerified: true,
      socialStats,
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

      // Get context for markdown link
      const urlIndex = response.indexOf(url);
      const contextStart = Math.max(0, urlIndex - 300);
      const contextEnd = Math.min(response.length, urlIndex + 400);
      const context = response.slice(contextStart, contextEnd);
      const socialStats = extractSocialStatsFromContext(context, url, platform);

      sources.push({
        type,
        platform: linkText || platform,
        url,
        summary: linkText,
        relevantDetails: [],
        isVerified: true,
        socialStats,
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

  // Dating Presence (direct profiles + indirect mentions)
  if (["tinder", "bumble", "hinge", "okcupid", "match", "plenty", "pof", "eharmony", "coffee meets bagel", "cmb", "dating", "swipe", "the league", "raya", "feeld", "grindr", "her", "taimi"].some(p => lower.includes(p))) {
    return "datingPresence";
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
  datingPresence: DeepSearchSource[];
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
    datingPresence: [],
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
      case "datingPresence":
        results.datingPresence.push(enrichedSource);
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
    datingPresence: categorized.datingPresence.length,
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

// Helper to extract social stats from context around URL
function extractSocialStatsFromContext(context: string, url: string, platform: string): SocialMediaStats | undefined {
  const stats: SocialMediaStats = {};
  const contextLower = context.toLowerCase();

  // Extract username from URL
  const username = extractUsernameFromProfileUrl(url, platform);
  if (username) {
    stats.username = username;
  }

  // Try to extract username from context if not found in URL
  // Look for patterns like "Username: @johndoe" or "@johndoe"
  if (!stats.username) {
    const usernamePatterns = [
      /username:\s*@?(\w+)/i,
      /handle:\s*@?(\w+)/i,
      /@(\w{3,30})\b/,
    ];
    for (const pattern of usernamePatterns) {
      const match = context.match(pattern);
      if (match && match[1]) {
        stats.username = match[1];
        break;
      }
    }
  }

  // Extract display name
  // Look for patterns like "Display Name: John Smith" or "Name: John Smith"
  const displayNamePatterns = [
    /display\s*name:\s*([^\n|]+)/i,
    /name:\s*([^\n|]+)/i,
    /profile(?:\s+of)?:\s*([^\n|]+)/i,
  ];
  for (const pattern of displayNamePatterns) {
    const match = context.match(pattern);
    if (match && match[1] && match[1].trim().length > 1 && match[1].trim().length < 50) {
      const name = match[1].trim();
      // Skip if it looks like a URL or username
      if (!name.startsWith("http") && !name.startsWith("@") && !name.includes(".com")) {
        stats.displayName = name;
        break;
      }
    }
  }

  // Extract bio
  const bioPatterns = [
    /bio:\s*([^\n]+)/i,
    /description:\s*([^\n]+)/i,
    /about:\s*([^\n]+)/i,
  ];
  for (const pattern of bioPatterns) {
    const match = context.match(pattern);
    if (match && match[1] && match[1].trim().length > 5) {
      stats.bio = match[1].trim().slice(0, 150);
      break;
    }
  }

  // Extract follower count - various formats
  const followerPatterns = [
    /followers?[:\s]+(\d+(?:\.\d+)?)\s*([kmb])?/i,
    /(\d+(?:\.\d+)?)\s*([kmb])?\s*followers?/i,
  ];
  for (const pattern of followerPatterns) {
    const match = context.match(pattern);
    if (match && match[1]) {
      stats.followers = parseStatNumber(match[1], match[2]);
      break;
    }
  }

  // Extract following count
  const followingPatterns = [
    /following[:\s]+(\d+(?:\.\d+)?)\s*([kmb])?/i,
    /(\d+(?:\.\d+)?)\s*([kmb])?\s*following/i,
  ];
  for (const pattern of followingPatterns) {
    const match = context.match(pattern);
    if (match && match[1]) {
      stats.following = parseStatNumber(match[1], match[2]);
      break;
    }
  }

  // Extract post count
  const postPatterns = [
    /posts?[:\s]+(\d+(?:\.\d+)?)\s*([kmb])?/i,
    /(\d+(?:\.\d+)?)\s*([kmb])?\s*posts?/i,
    /tweets?[:\s]+(\d+(?:\.\d+)?)\s*([kmb])?/i,
    /(\d+(?:\.\d+)?)\s*([kmb])?\s*tweets?/i,
    /videos?[:\s]+(\d+(?:\.\d+)?)\s*([kmb])?/i,
    /(\d+(?:\.\d+)?)\s*([kmb])?\s*videos?/i,
  ];
  for (const pattern of postPatterns) {
    const match = context.match(pattern);
    if (match && match[1]) {
      stats.posts = parseStatNumber(match[1], match[2]);
      break;
    }
  }

  // Check for verified status
  if (contextLower.includes("verified: yes") || contextLower.includes("verified account") || contextLower.includes("✓") || contextLower.includes("verified badge")) {
    stats.isVerifiedAccount = true;
  } else if (contextLower.includes("verified: no")) {
    stats.isVerifiedAccount = false;
  }

  // Check if we have any meaningful stats
  const hasStats = stats.username || stats.displayName || stats.bio ||
                   stats.followers !== undefined || stats.following !== undefined ||
                   stats.posts !== undefined;

  return hasStats ? stats : undefined;
}

// Helper to parse stat numbers with K, M, B suffixes
function parseStatNumber(numStr: string, suffix?: string): number {
  const num = parseFloat(numStr);
  if (isNaN(num)) return 0;

  const suffixLower = (suffix || "").toLowerCase();
  if (suffixLower === "k") return Math.round(num * 1000);
  if (suffixLower === "m") return Math.round(num * 1000000);
  if (suffixLower === "b") return Math.round(num * 1000000000);
  return Math.round(num);
}

// Helper to extract username from profile URL
function extractUsernameFromProfileUrl(url: string, platform: string): string | undefined {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const parts = pathname.split("/").filter(p => p.length > 0);
    const platformLower = platform.toLowerCase();

    // Instagram, Twitter/X, TikTok, GitHub: first path segment is usually username
    if (["instagram", "twitter", "x.com", "x", "tiktok", "github"].some(p => platformLower.includes(p) || urlObj.hostname.includes(p))) {
      if (parts.length > 0) {
        const firstPart = parts[0];
        // Skip non-username paths
        if (!["p", "status", "reel", "explore", "settings", "stories", "reels", "hashtag", "i"].includes(firstPart)) {
          return firstPart.replace(/^@/, "");
        }
      }
    }

    // LinkedIn: /in/username
    if (platformLower.includes("linkedin") || urlObj.hostname.includes("linkedin")) {
      if (parts[0] === "in" && parts.length > 1) {
        return parts[1];
      }
    }

    // Facebook
    if (platformLower.includes("facebook") || urlObj.hostname.includes("facebook")) {
      const idParam = urlObj.searchParams.get("id");
      if (idParam) return idParam;
      if (parts.length > 0 && !["pages", "groups", "events", "profile.php"].includes(parts[0])) {
        return parts[0];
      }
    }

    // YouTube: /@username or /c/username or /channel/id
    if (platformLower.includes("youtube") || urlObj.hostname.includes("youtube")) {
      if (parts[0]?.startsWith("@")) return parts[0].substring(1);
      if (parts[0] === "c" && parts.length > 1) return parts[1];
      if (parts[0] === "channel" && parts.length > 1) return parts[1];
    }

    // Reddit: /user/username or /u/username
    if (platformLower.includes("reddit") || urlObj.hostname.includes("reddit")) {
      if ((parts[0] === "user" || parts[0] === "u") && parts.length > 1) {
        return parts[1];
      }
    }

    return undefined;
  } catch {
    return undefined;
  }
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
