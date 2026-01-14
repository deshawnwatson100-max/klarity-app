/**
 * Deep Search Service
 *
 * Orchestrates the Deep Search flow - triggered when Person Context is created
 * or when user explicitly requests a search in the chat loop.
 *
 * Uses a multi-pass search strategy that continues until strong results are found
 * or all passes are exhausted.
 *
 * ENHANCED: Now includes page fetching and second-wave search triggers.
 */

import { PersonContext } from "../types/personContext";
import {
  DEEP_SEARCH_SYSTEM_PROMPT,
  DEEP_SEARCH_DEVELOPER_PROMPT,
  buildDeepSearchUserPrompt,
  parseDeepSearchResponse,
  checkDeepSearchSafety,
  buildSearchQueries,
  DeepSearchResult,
  DeepSearchSource,
  NO_RESULTS_RESPONSE,
  SearchCategory,
  QueryGeneratorInput,
  generatePlatformTargetedQueries,
  generateSocialPlatformQueries,
  generateProfessionalPlatformQueries,
  generateWritingPlatformQueries,
  categorizeResults,
  getCategorizedResultsStats,
  CategorizedResults,
  generateUsernameVariations,
  generateUsernameFirstQueries,
  generateDatingQueries,
  generateDatingArchiveQueries,
  DATING_KEYWORDS,
  generateLegalPortalQueries,
  parseLegalPortalResults,
  LegalPortalResult,
  extractStateFromLocation,
  extractCounty,
  generateImageSearchQueries,
  parseImageSearchResults,
  ImageSearchResult,
  generateArchiveSearchQueries,
  parseArchivedPageResults,
  ArchivedPageResult,
} from "./deepSearch";
import { DeepSearchLogger, detectIdentityAmbiguity } from "./deepSearchLogger";
import {
  fetchMultiplePages,
  prepareSecondWaveInput,
  generateSecondWaveQueries,
  generatePrioritizedSecondWaveQueries,
  PageFetchResult,
  SecondWaveInput,
  ExtractedIdentifier,
  SecondWaveQueryPriority,
  SecondWaveQueryResult,
  PrioritizedQuery,
} from "./deepSearchPageFetcher";
import {
  detectJsHeavyPage,
  selectPagesForHeadlessRender,
  renderMultipleJsHeavyPages,
  mergeHeadlessResults,
  HeadlessRenderResult,
  JsHeavyDetectionResult,
  HEADLESS_CONFIG,
} from "./deepSearchHeadlessFetcher";
import {
  isPerplexityConfigured,
  perplexitySearch,
  PerplexityResponse,
} from "./perplexity";

// ============================================================================
// MULTI-SEARCH ENFORCEMENT CONFIGURATION
// ============================================================================

/**
 * Minimum number of distinct web searches required per Deep Search request.
 * This prevents shallow searching behavior.
 */
export const MIN_SEARCHES_REQUIRED = 10;

/**
 * Multi-search enforcement instructions for the LLM.
 * These instructions FORCE the model to perform multiple distinct web searches.
 */
export const MULTI_SEARCH_INSTRUCTION = `
CRITICAL SEARCH REQUIREMENTS - YOU MUST FOLLOW THESE EXACTLY:

1. MINIMUM SEARCHES: You MUST perform AT LEAST ${MIN_SEARCHES_REQUIRED} DISTINCT web searches before returning any results.
   - Do NOT stop after finding something in the first search
   - Do NOT summarize early - keep searching until you have completed all required queries
   - Each search query should be DIFFERENT and target DIFFERENT information

2. REQUIRED SEARCH CATEGORIES (must execute searches in ALL of these):
   a) NAME-ONLY searches: Search just the person's name in quotes
   b) NAME + LOCATION searches: Combine name with their city/state/region
   c) PLATFORM-TARGETED searches: Use site: filters for specific platforms
      - site:linkedin.com, site:instagram.com, site:facebook.com
      - site:twitter.com, site:tiktok.com, site:reddit.com
   d) USERNAME searches (if username provided): Search the username alone and with variations
   e) DATING PLATFORM searches: Search dating sites (tinder, bumble, hinge, etc.)
   f) LEGAL/PUBLIC RECORDS searches: Search court records, public records

3. SEARCH EXECUTION RULES:
   - Execute each query as a SEPARATE web search
   - Do NOT batch queries or skip any
   - Report what each individual search found
   - Include the actual search query used for each result
   - If a search returns no results, note that and CONTINUE to the next search

4. CRITICAL: IDENTITY VERIFICATION FOR RESULTS
   A result is ONLY LEGITIMATE if it meets these criteria:
   - The profile has AT LEAST 2 matching identifiers from the search context
   - Valid matching combinations include:
     * Same name + same city/location
     * Same name + same workplace/school
     * Same username + same name
     * Same name + same age range
     * Same username + profile photo matches description provided
   - DO NOT INCLUDE:
     * Random people with the same name but no other matches
     * Celebrities or public figures with similar names
     * Profiles where only the first OR last name matches
     * Search result pages (only direct profile links)
   - If a result has ONLY a name match with NO corroborating info, EXCLUDE IT

5. FOR EACH PROFILE FOUND - EXTRACT THESE DETAILS:
   When you find a social media profile, LOOK AT THE PAGE and extract:
   - Username/handle (e.g., @johndoe)
   - Display name shown on profile
   - Bio or description text
   - Follower count (format: "Followers: 1.5K" or "Followers: 15000")
   - Following count (format: "Following: 500")
   - Post/tweet/video count (format: "Posts: 120")
   - Whether account is verified (has blue checkmark)
   - Profile picture description (briefly describe what you see)
   - WHY YOU BELIEVE THIS IS THE SAME PERSON (list matching identifiers)

   IMPORTANT: Actually visit the profile pages and read the stats shown on them.
   Do not guess - only report numbers you actually see on the profile.

6. OUTPUT FORMAT FOR EACH RESULT:
   **Platform Name**
   URL: [direct profile link]
   Username: @[handle]
   Display Name: [name shown on profile]
   Bio: [bio text, first 100 chars]
   Followers: [number] | Following: [number] | Posts: [number]
   Verified: Yes/No
   Profile Photo: [brief description]
   Match Confidence: [High/Medium/Low] - [explain what identifiers match]

7. DO NOT:
   - Stop after 1-3 searches
   - Claim you "searched comprehensively" without actually doing multiple searches
   - Skip platform-targeted searches
   - Return results without executing the minimum required searches
   - Make up follower counts or stats - only report what you actually see
   - Include results that are just "same name" with no other matching details
   - Include obviously wrong results just to have something to show

BEGIN YOUR ${MIN_SEARCHES_REQUIRED}+ SEARCHES NOW:
`;

/**
 * Search execution tracking for logging
 */
export interface SearchExecutionLog {
  passNumber: number;
  passName: string;
  queriesProvided: number;
  searchesRequested: number;
  timestamp: string;
}

// ============================================================================
// MULTI-PASS SEARCH CONFIGURATION
// ============================================================================

/**
 * Minimum number of passes that MUST run before considering early stop.
 * This ensures thorough searching even if early passes return results.
 */
export const MIN_PASSES_BEFORE_STOP = 4;

/**
 * Search passes executed in order. Each pass focuses on specific query types.
 *
 * IMPORTANT: The search MUST NOT stop early just because an earlier pass returned nothing.
 * All passes run in sequence, with weak-result detection triggering automatic retry.
 *
 * Pass order (per requirements):
 * 1. NAME_LOCATION - Basic name + location (always runs first)
 * 2. PLATFORM_TARGETED - site: queries for social/professional
 * 3. USERNAME_FIRST - Username searches (if username exists)
 * 4. DATING_MIRRORS - Dating-focused searches
 * 5. LEGAL_RECORDS - Court and public records
 * 6. ARCHIVED_CACHED - Archive.org and cached pages
 * 7. IMAGES_VISUAL - Images & visual footprint (bonus pass)
 * 8. USERNAME_EXPANDED - Username variations (bonus pass, if username exists)
 */
export enum SearchPass {
  NAME_LOCATION = 1,          // Pass 1: name + location (always first)
  PLATFORM_TARGETED = 2,      // Pass 2: social + professional site: queries
  USERNAME_FIRST = 3,         // Pass 3: Username-first searches
  DATING_MIRRORS = 4,         // Pass 4: dating keywords + mirrors/caches
  LEGAL_RECORDS = 5,          // Pass 5: legal/public records portal discovery
  ARCHIVED_CACHED = 6,        // Pass 6: archived/cached pages
  IMAGES_VISUAL = 7,          // Pass 7: images & visual footprint
  USERNAME_EXPANDED = 8,      // Pass 8: username variations + additional platforms
}

export interface PassConfig {
  pass: SearchPass;
  name: string;
  description: string;
  requiresUsername?: boolean; // If true, skip if no username
  isRequired?: boolean; // If true, this pass must always run (no early skip)
  generateQueries: (input: QueryGeneratorInput) => string[];
}

/**
 * Configuration for each search pass
 *
 * Pass order is critical for thorough searching:
 * 1. NAME_LOCATION - Basic name + location (required, always runs)
 * 2. PLATFORM_TARGETED - site: queries for social/professional (required)
 * 3. USERNAME_FIRST - Username searches (required if username exists)
 * 4. DATING_MIRRORS - Dating-focused (required)
 * 5. LEGAL_RECORDS - Court and public records (required)
 * 6. ARCHIVED_CACHED - Archive.org and cached pages (required)
 * 7. IMAGES_VISUAL - Images & visual footprint
 * 8. USERNAME_EXPANDED - Username variations
 */
const PASS_CONFIGS: PassConfig[] = [
  {
    pass: SearchPass.NAME_LOCATION,
    name: "Name + Location",
    description: "Basic name and location combinations",
    isRequired: true,
    generateQueries: (input) => {
      const queries: string[] = [];
      const { name, location, county, previousLocation, middleInitial } = input;
      if (!name) return queries;

      const nameParts = name.split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

      // Basic name
      queries.push(`"${name}"`);

      // With middle initial
      if (middleInitial && nameParts.length >= 2) {
        queries.push(`"${firstName} ${middleInitial} ${lastName}"`);
      }

      // Name + location combinations
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

      return queries;
    },
  },
  {
    pass: SearchPass.PLATFORM_TARGETED,
    name: "Platform Targeted",
    description: "Social media and professional site-specific searches",
    isRequired: true,
    generateQueries: (input) => {
      const { name, username, location } = input;
      if (!name) return [];
      return generatePlatformTargetedQueries(name, username, location);
    },
  },
  {
    pass: SearchPass.USERNAME_FIRST,
    name: "Username First",
    description: "Priority username search with variations",
    requiresUsername: true,
    isRequired: true, // Required if username exists
    generateQueries: (input) => {
      const { username, anchor } = input;
      const queries: string[] = [];

      // Get the primary username
      const primaryUsername = username || (anchor?.type === "username" ? anchor.value : null);
      if (!primaryUsername) return queries;

      // Use the comprehensive username-first query generator with variations
      queries.push(...generateUsernameFirstQueries(primaryUsername, true));

      return queries;
    },
  },
  {
    pass: SearchPass.DATING_MIRRORS,
    name: "Dating Mirrors",
    description: "Dating platforms, mirrors, and cached dating profiles",
    isRequired: true,
    generateQueries: (input) => {
      const { name, location, username } = input;
      if (!name) return [];

      const queries: string[] = [];

      // Dating platform queries
      queries.push(...generateDatingQueries(name, location, username));

      // Dating archive queries
      queries.push(...generateDatingArchiveQueries(name, username));

      return queries;
    },
  },
  {
    pass: SearchPass.LEGAL_RECORDS,
    name: "Legal Records",
    description: "Court records, public records, and legal portal discovery",
    isRequired: true,
    generateQueries: (input) => {
      const { name, location, county, middleInitial, ageRange } = input;
      if (!name) return [];

      // Extract state from location
      const state = extractStateFromLocation(location);
      const countyName = extractCounty(county, location);

      // Generate comprehensive legal portal queries
      const queries = generateLegalPortalQueries({
        name,
        location,
        county: countyName,
        state,
        middleInitial,
        ageRange,
      });

      return queries;
    },
  },
  {
    pass: SearchPass.ARCHIVED_CACHED,
    name: "Archived & Cached",
    description: "Wayback Machine, archive.is, cached pages, and deleted content",
    isRequired: true,
    generateQueries: (input) => {
      const { name, location, username } = input;
      if (!name) return [];

      // Use the comprehensive archive search query generator
      const queries = generateArchiveSearchQueries({
        name,
        location,
        username,
      });

      return queries;
    },
  },
  {
    pass: SearchPass.IMAGES_VISUAL,
    name: "Images & Visual",
    description: "Profile photos, image searches, and visual footprint",
    generateQueries: (input) => {
      const { name, location, username, professionalInfo } = input;
      if (!name) return [];

      const queries = generateImageSearchQueries({
        name,
        location,
        username,
        workplace: professionalInfo,
      });

      return queries;
    },
  },
  {
    pass: SearchPass.USERNAME_EXPANDED,
    name: "Username Expanded",
    description: "Username variations and additional platform searches",
    requiresUsername: true,
    generateQueries: (input) => {
      const { username, name, location, anchor } = input;
      const queries: string[] = [];

      const primaryUsername = username || (anchor?.type === "username" ? anchor.value : null);
      if (!primaryUsername) return queries;

      // Generate username variations
      const variations = generateUsernameVariations(primaryUsername);

      // Search each variation across platforms
      for (const v of variations.slice(0, 5)) {
        queries.push(`"${v.username}"`);
        queries.push(`${v.username} site:instagram.com`);
        queries.push(`${v.username} site:twitter.com`);
        queries.push(`${v.username} site:tiktok.com`);
        queries.push(`${v.username} site:reddit.com`);
        if (name) {
          queries.push(`${v.username} "${name}"`);
        }
        if (location) {
          queries.push(`${v.username} ${location}`);
        }
      }

      return queries;
    },
  },
];

// ============================================================================
// THIN RESULTS HEURISTIC
// ============================================================================

export interface ResultStrength {
  isStrong: boolean;
  totalSources: number;
  urlCount: number;
  categoriesCovered: number;
  reasons: string[];
}

/**
 * Evaluates if the current results are "thin" and more passes should run.
 *
 * Strong results criteria:
 * - At least 3 sources with URLs
 * - At least 2 different categories covered
 * - OR at least 5 total sources (even without URLs)
 */
export function evaluateResultStrength(result: DeepSearchResult): ResultStrength {
  const reasons: string[] = [];

  // Count sources with URLs
  const urlCount = result.sources.filter(s => s.url).length;

  // Count unique categories
  const categories = new Set(result.sources.map(s => s.type));
  const categoriesCovered = categories.size;

  // Determine if strong
  let isStrong = false;

  if (urlCount >= 3 && categoriesCovered >= 2) {
    isStrong = true;
    reasons.push("Good URL coverage across categories");
  } else if (result.sources.length >= 5) {
    isStrong = true;
    reasons.push("Sufficient total sources found");
  } else if (urlCount >= 2 && categoriesCovered >= 3) {
    isStrong = true;
    reasons.push("Diverse category coverage");
  }

  // Reasons why it's thin
  if (!isStrong) {
    if (urlCount < 2) {
      reasons.push(`Only ${urlCount} sources with URLs`);
    }
    if (categoriesCovered < 2) {
      reasons.push(`Only ${categoriesCovered} category covered`);
    }
    if (result.sources.length < 3) {
      reasons.push(`Only ${result.sources.length} total sources`);
    }
  }

  return {
    isStrong,
    totalSources: result.sources.length,
    urlCount,
    categoriesCovered,
    reasons,
  };
}

/**
 * Checks if two text strings are similar enough to be considered duplicates.
 * Uses a simple word overlap comparison.
 */
function isSimilarText(text1: string, text2: string): boolean {
  // If texts are identical, they're similar
  if (text1 === text2) return true;

  // If one is a substring of the other (and reasonably long), they're similar
  if (text1.length > 20 && text2.length > 20) {
    if (text1.includes(text2) || text2.includes(text1)) return true;
  }

  // Word overlap comparison
  const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 3));

  if (words1.size === 0 || words2.size === 0) return false;

  // Count overlapping words
  let overlap = 0;
  for (const word of words1) {
    if (words2.has(word)) overlap++;
  }

  // If more than 60% of words overlap, consider similar
  const overlapRatio = overlap / Math.min(words1.size, words2.size);
  return overlapRatio > 0.6;
}

/**
 * Maximum number of retry attempts per pass when results are thin.
 */
const MAX_RETRY_ATTEMPTS = 1;

/**
 * Generates expanded queries for retry when initial pass results are thin.
 * Adds variations, aliases, and broader search terms.
 */
function generateRetryQueries(
  input: QueryGeneratorInput,
  originalQueries: string[],
  passType: SearchPass
): string[] {
  const retryQueries: string[] = [];
  const { name, location, username, aliases, middleInitial, county } = input;

  if (!name) return [];

  const nameParts = name.split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

  // Add name variations not in original queries
  const nameVariations = [
    `"${firstName} ${lastName}"`, // First + Last only
    `${firstName} ${lastName}`, // Without quotes
    `"${lastName}, ${firstName}"`, // Reversed format
  ];

  if (middleInitial) {
    nameVariations.push(`"${firstName} ${middleInitial}. ${lastName}"`);
    nameVariations.push(`"${firstName} ${middleInitial} ${lastName}"`);
  }

  // Add location variations
  if (location) {
    const locationParts = location.split(",").map(p => p.trim());
    for (const variation of nameVariations) {
      retryQueries.push(`${variation} ${location}`);
      // Try just city or just state
      for (const part of locationParts) {
        if (part && !originalQueries.some(q => q.includes(part))) {
          retryQueries.push(`${variation} ${part}`);
        }
      }
    }
  }

  // Add county if available and not already searched
  if (county && !originalQueries.some(q => q.toLowerCase().includes(county.toLowerCase()))) {
    retryQueries.push(`"${name}" ${county}`);
  }

  // Add aliases/username variations for retry
  if (aliases?.length) {
    for (const alias of aliases.slice(0, 3)) {
      if (!originalQueries.some(q => q.includes(alias))) {
        retryQueries.push(`"${alias}"`);
        if (location) {
          retryQueries.push(`"${alias}" ${location}`);
        }
      }
    }
  }

  // Pass-specific retry expansions
  switch (passType) {
    case SearchPass.NAME_LOCATION:
      // Try broader geographic searches
      retryQueries.push(`"${name}" profile`);
      retryQueries.push(`"${name}" contact`);
      retryQueries.push(`"${name}" about`);
      break;

    case SearchPass.PLATFORM_TARGETED:
      // Try additional platforms not in original
      const additionalPlatforms = ["pinterest.com", "snapchat.com", "threads.net", "mastodon.social"];
      for (const platform of additionalPlatforms) {
        if (!originalQueries.some(q => q.includes(platform))) {
          retryQueries.push(`"${name}" site:${platform}`);
        }
      }
      break;

    case SearchPass.USERNAME_FIRST:
      // Try username with common suffixes/prefixes
      if (username) {
        const usernameSuffixes = ["_", "1", "2", "official", "real"];
        for (const suffix of usernameSuffixes) {
          retryQueries.push(`${username}${suffix}`);
          retryQueries.push(`${suffix}${username}`);
        }
      }
      break;

    case SearchPass.DATING_MIRRORS:
      // Try additional dating-related terms
      retryQueries.push(`"${name}" relationship`);
      retryQueries.push(`"${name}" single`);
      retryQueries.push(`"${name}" looking for`);
      break;

    case SearchPass.LEGAL_RECORDS:
      // Try additional legal search terms
      retryQueries.push(`"${name}" arrest`);
      retryQueries.push(`"${name}" warrant`);
      retryQueries.push(`"${name}" lawsuit`);
      break;

    case SearchPass.ARCHIVED_CACHED:
      // Try additional archive sources
      retryQueries.push(`"${name}" cached`);
      retryQueries.push(`"${name}" snapshot`);
      retryQueries.push(`"${name}" site:webcache.googleusercontent.com`);
      break;
  }

  // Filter out queries that were already in the original set
  const originalSet = new Set(originalQueries.map(q => q.toLowerCase()));
  const uniqueRetryQueries = retryQueries.filter(
    q => !originalSet.has(q.toLowerCase())
  );

  console.log(`[MultiPass] Generated ${uniqueRetryQueries.length} retry queries for pass ${passType}`);
  return [...new Set(uniqueRetryQueries)];
}

// ============================================================================
// MULTI-PASS SEARCH RUNNER
// ============================================================================

export interface MultiPassResult {
  finalResult: DeepSearchResult;
  categorizedResults: CategorizedResults;
  categorizedStats: {
    total: number;
    byCategory: Record<string, number>;
    categoriesWithResults: string[];
  };
  passesExecuted: number;
  passResults: PassResult[];
  stoppedEarly: boolean;
  stopReason?: string;
  // Legal portal results (link-first output for user to explore)
  legalPortals: LegalPortalResult[];
  // Image search results (link-first with thumbnails for preview)
  imageResults: ImageSearchResult[];
  // Archived page results (labeled as "archived snapshots" with direct links)
  archivedPages: ArchivedPageResult[];
  /** Total number of retry attempts across all passes */
  totalRetryAttempts: number;
  /** Number of passes that were retried */
  passesRetried: number;
  /** Whether minimum passes requirement was met */
  minimumPassesMet: boolean;
  /** Page fetch results with extracted identifiers */
  pageFetchResults?: PageFetchResult[];
  /** Second-wave search input (discovered identifiers) */
  secondWaveInput?: SecondWaveInput;
  /** Whether second-wave search was executed */
  secondWaveExecuted: boolean;
  /** Number of new sources found from second-wave search */
  secondWaveSources: number;
  /** Pages marked as JS-heavy (need special handling) */
  jsHeavyPages: string[];
  /** All extracted identifiers from page fetching */
  extractedIdentifiers: ExtractedIdentifier[];
  /** Second-wave query statistics by priority */
  secondWaveQueryStats?: {
    usernameOnly: number;
    usernamePlatform: number;
    profileLookup: number;
    forumMentions: number;
    archiveMentions: number;
    domainSearches: number;
    connectionVerify: number;
    total: number;
  };
  /** Detailed second-wave query list with priorities */
  secondWaveQueries?: PrioritizedQuery[];
  /** Headless render results for JS-heavy pages */
  headlessRenderResults?: HeadlessRenderResult[];
  /** Number of pages successfully rendered with headless fallback */
  headlessRenderedCount: number;
  /** Additional identifiers extracted from headless-rendered pages */
  headlessExtractedIdentifiers: ExtractedIdentifier[];
}

export interface PassResult {
  pass: SearchPass;
  passName: string;
  queriesUsed: string[];
  sourcesFound: number;
  urlsFound: number;
  newSourcesAdded: number;
  resultStrength: ResultStrength;
  /** Number of retry attempts for this pass (0 = first attempt succeeded) */
  retryAttempts?: number;
  /** Whether this pass was retried due to thin results */
  wasRetried?: boolean;
}

/**
 * Executes a multi-pass Deep Search that continues until strong results
 * are found or all passes are exhausted.
 */
export async function executeMultiPassSearch(
  input: QueryGeneratorInput,
  personContextId: string,
  onProgress?: (status: string, passNumber: number, totalPasses: number) => void
): Promise<MultiPassResult> {
  const passResults: PassResult[] = [];
  let accumulatedSources: DeepSearchSource[] = [];
  let allRawResponses: string[] = [];
  let stoppedEarly = false;
  let stopReason: string | undefined;

  const totalPasses = PASS_CONFIGS.length;

  // Determine which passes to run based on input
  // Passes with requiresUsername: true are skipped if no username is available
  const hasUsername = !!(input.username || input.aliases?.length || input.anchor?.type === "username");
  const passesToRun = PASS_CONFIGS.filter(config => {
    if (config.requiresUsername && !hasUsername) {
      return false;
    }
    return true;
  });

  console.log(`[MultiPass] Starting ${passesToRun.length} passes for "${input.name}"`);

  for (const passConfig of passesToRun) {
    const passNumber = passConfig.pass;
    onProgress?.(`Pass ${passNumber}: ${passConfig.name}...`, passNumber, totalPasses);

    console.log(`[MultiPass] === PASS ${passNumber}: ${passConfig.name} ===`);

    // Generate queries for this pass
    const passQueries = passConfig.generateQueries(input);

    if (passQueries.length === 0) {
      console.log(`[MultiPass] Pass ${passNumber} generated no queries, skipping`);
      continue;
    }

    // De-duplicate queries
    const uniqueQueries = [...new Set(passQueries)];
    console.log(`[MultiPass] Pass ${passNumber} queries (${uniqueQueries.length}):`, uniqueQueries.slice(0, 5));

    // Execute search for this pass (with multi-search enforcement)
    const passSearchResult = await callPassSearch(uniqueQueries, input.name, passConfig.name);
    const passResponse = passSearchResult.content;

    // Log search execution metrics
    console.log(`[MultiPass] Pass ${passNumber} search metrics:`, {
      queriesProvided: uniqueQueries.length,
      searchesExecuted: passSearchResult.searchesExecuted,
      meetsMinimum: passSearchResult.searchesExecuted >= MIN_SEARCHES_REQUIRED,
    });

    if (passResponse) {
      allRawResponses.push(passResponse);

      // Parse this pass's results
      const passResult = parseDeepSearchResponse(
        passResponse,
        personContextId,
        uniqueQueries.join(", ")
      );

      // Count new sources (not already found)
      const existingUrls = new Set(accumulatedSources.map(s => s.url).filter(Boolean));
      const newSources = passResult.sources.filter(s => !s.url || !existingUrls.has(s.url));

      // Add new sources to accumulated results
      accumulatedSources = [...accumulatedSources, ...newSources];

      // Create accumulated result for strength evaluation
      const accumulatedResult: DeepSearchResult = {
        id: `ds_multipass_${Date.now()}`,
        timestamp: new Date().toISOString(),
        personContextId,
        searchQuery: uniqueQueries.join(", "),
        sources: accumulatedSources,
        summary: "",
        alignmentNotes: [],
        uncertainties: [],
        rawResponse: allRawResponses.join("\n\n---\n\n"),
      };

      // Evaluate result strength
      const strength = evaluateResultStrength(accumulatedResult);

      // Log pass result
      const passResultLog: PassResult = {
        pass: passNumber,
        passName: passConfig.name,
        queriesUsed: uniqueQueries,
        sourcesFound: passResult.sources.length,
        urlsFound: passResult.sources.filter(s => s.url).length,
        newSourcesAdded: newSources.length,
        resultStrength: strength,
      };
      passResults.push(passResultLog);

      console.log(`[MultiPass] Pass ${passNumber} results:`, {
        sourcesFound: passResult.sources.length,
        newSourcesAdded: newSources.length,
        totalAccumulated: accumulatedSources.length,
        isStrong: strength.isStrong,
        reasons: strength.reasons,
      });

      // Check if we should stop early - BUT only after minimum passes have run
      // Per requirements: search must NOT stop early just because an earlier pass returned nothing
      const passesCompletedCount = passResults.length;
      const canStopEarly = passesCompletedCount >= MIN_PASSES_BEFORE_STOP;

      if (strength.isStrong && canStopEarly) {
        stoppedEarly = true;
        stopReason = `Strong results after Pass ${passNumber} (${passesCompletedCount} passes completed): ${strength.reasons.join(", ")}`;
        console.log(`[MultiPass] Stopping early: ${stopReason}`);
        break;
      } else if (strength.isStrong && !canStopEarly) {
        console.log(`[MultiPass] Results are strong but minimum passes not met (${passesCompletedCount}/${MIN_PASSES_BEFORE_STOP}). Continuing...`);
      } else if (!strength.isStrong && newSources.length === 0) {
        // Thin results - attempt retry with expanded queries
        console.log(`[MultiPass] Pass ${passNumber} produced thin results. Attempting retry...`);

        const retryQueries = generateRetryQueries(input, uniqueQueries, passNumber);

        if (retryQueries.length > 0) {
          console.log(`[MultiPass] Retry with ${retryQueries.length} expanded queries`);
          onProgress?.(`Pass ${passNumber}: Retrying with expanded queries...`, passNumber, totalPasses);

          const retrySearchResult = await callPassSearch(retryQueries, input.name, `${passConfig.name} (Retry)`);
          const retryResponse = retrySearchResult.content;

          if (retryResponse) {
            allRawResponses.push(retryResponse);

            const retryResult = parseDeepSearchResponse(
              retryResponse,
              personContextId,
              retryQueries.join(", ")
            );

            // Count new sources from retry
            const existingUrlsAfterRetry = new Set(accumulatedSources.map(s => s.url).filter(Boolean));
            const newRetrySourcesFound = retryResult.sources.filter(s => !s.url || !existingUrlsAfterRetry.has(s.url));

            if (newRetrySourcesFound.length > 0) {
              accumulatedSources = [...accumulatedSources, ...newRetrySourcesFound];
              console.log(`[MultiPass] Retry found ${newRetrySourcesFound.length} new sources`);

              // Update the pass result to reflect retry
              const lastPassResult = passResults[passResults.length - 1];
              if (lastPassResult) {
                lastPassResult.queriesUsed = [...lastPassResult.queriesUsed, ...retryQueries];
                lastPassResult.newSourcesAdded += newRetrySourcesFound.length;
                lastPassResult.sourcesFound += retryResult.sources.length;
                lastPassResult.urlsFound += retryResult.sources.filter(s => s.url).length;
                lastPassResult.retryAttempts = 1;
                lastPassResult.wasRetried = true;
              }
            } else {
              console.log(`[MultiPass] Retry did not find additional sources`);
            }
          }
        }
      }
    } else {
      console.log(`[MultiPass] Pass ${passNumber} returned no response`);

      // Attempt retry even when main pass returned no response
      const retryQueries = generateRetryQueries(input, uniqueQueries, passNumber);
      let retrySourcesFound = 0;

      if (retryQueries.length > 0) {
        console.log(`[MultiPass] Attempting retry for failed pass ${passNumber} with ${retryQueries.length} queries`);
        onProgress?.(`Pass ${passNumber}: Retrying after no response...`, passNumber, totalPasses);

        const retrySearchResult = await callPassSearch(retryQueries, input.name, `${passConfig.name} (Retry)`);
        const retryResponse = retrySearchResult.content;

        if (retryResponse) {
          allRawResponses.push(retryResponse);

          const retryResult = parseDeepSearchResponse(
            retryResponse,
            personContextId,
            retryQueries.join(", ")
          );

          const existingUrlsForRetry = new Set(accumulatedSources.map(s => s.url).filter(Boolean));
          const newSourcesFromRetry = retryResult.sources.filter(s => !s.url || !existingUrlsForRetry.has(s.url));

          if (newSourcesFromRetry.length > 0) {
            accumulatedSources = [...accumulatedSources, ...newSourcesFromRetry];
            retrySourcesFound = newSourcesFromRetry.length;
            console.log(`[MultiPass] Retry recovered ${newSourcesFromRetry.length} sources`);
          }
        }
      }

      passResults.push({
        pass: passNumber,
        passName: passConfig.name,
        queriesUsed: [...uniqueQueries, ...retryQueries],
        sourcesFound: retrySourcesFound,
        urlsFound: 0,
        newSourcesAdded: retrySourcesFound,
        resultStrength: {
          isStrong: false,
          totalSources: accumulatedSources.length,
          urlCount: accumulatedSources.filter(s => s.url).length,
          categoriesCovered: new Set(accumulatedSources.map(s => s.type)).size,
          reasons: retrySourcesFound > 0 ? ["Recovered via retry"] : ["Pass returned no response"],
        },
        retryAttempts: retryQueries.length > 0 ? 1 : 0,
        wasRetried: retryQueries.length > 0,
      });
    }
  }

  // Build final result
  const finalResult: DeepSearchResult = {
    id: `ds_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    personContextId,
    searchQuery: passResults.flatMap(p => p.queriesUsed).join(", "),
    sources: accumulatedSources,
    summary: accumulatedSources.length > 0
      ? `Found ${accumulatedSources.length} results across ${new Set(accumulatedSources.map(s => s.type)).size} categories.`
      : "No results found after comprehensive search.",
    alignmentNotes: [],
    uncertainties: [],
    rawResponse: allRawResponses.join("\n\n---\n\n"),
  };

  // Categorize results with URL de-duplication
  const categorizedResults = categorizeResults(accumulatedSources);
  const categorizedStats = getCategorizedResultsStats(categorizedResults);

  // Extract legal portal results from raw responses
  // Build jurisdiction string from input
  const state = extractStateFromLocation(input.location);
  const countyName = extractCounty(input.county, input.location);
  const jurisdiction = [countyName, state].filter(Boolean).join(", ") || undefined;
  const legalPortals = parseLegalPortalResults(allRawResponses.join("\n"), jurisdiction);

  // Extract image search results from raw responses
  const imageResults = parseImageSearchResults(allRawResponses.join("\n"), input.name);

  // Extract archived page results from raw responses
  const archivedPages = parseArchivedPageResults(allRawResponses.join("\n"), input.name);

  // Calculate retry statistics
  const totalRetryAttempts = passResults.reduce((sum, p) => sum + (p.retryAttempts || 0), 0);
  const passesRetried = passResults.filter(p => p.wasRetried).length;
  const minimumPassesMet = passResults.length >= MIN_PASSES_BEFORE_STOP;

  // ============================================================================
  // PAGE FETCHING & SECOND-WAVE SEARCH
  // ============================================================================

  // Collect URLs from accumulated sources for page fetching
  const urlsToFetch = accumulatedSources
    .filter(s => s.url && s.url.startsWith("http"))
    .map(s => s.url as string)
    .slice(0, 10); // Limit to top 10 URLs

  let pageFetchResults: PageFetchResult[] = [];
  let secondWaveInput: SecondWaveInput | undefined;
  let secondWaveExecuted = false;
  let secondWaveSources = 0;
  let jsHeavyPages: string[] = [];
  let allExtractedIdentifiers: ExtractedIdentifier[] = [];
  let secondWaveQueries: PrioritizedQuery[] | undefined;
  let secondWaveQueryStats: MultiPassResult["secondWaveQueryStats"];
  let headlessRenderResults: HeadlessRenderResult[] = [];
  let headlessRenderedCount = 0;
  let headlessExtractedIdentifiers: ExtractedIdentifier[] = [];

  if (urlsToFetch.length > 0) {
    onProgress?.("Fetching page content...", passResults.length + 1, totalPasses + 2);
    console.log(`[MultiPass] Fetching ${urlsToFetch.length} pages for identifier extraction`);

    try {
      // Fetch pages and extract identifiers
      pageFetchResults = await fetchMultiplePages(urlsToFetch, 3);

      // Collect JS-heavy pages
      jsHeavyPages = pageFetchResults
        .filter(r => r.isJsHeavy)
        .map(r => r.url);

      // Collect all extracted identifiers
      allExtractedIdentifiers = pageFetchResults.flatMap(r => r.extractedIdentifiers);

      console.log(`[MultiPass] Page fetch complete:`, {
        fetched: pageFetchResults.length,
        successful: pageFetchResults.filter(r => r.success).length,
        jsHeavy: jsHeavyPages.length,
        identifiersFound: allExtractedIdentifiers.length,
      });

      // ============================================================================
      // HEADLESS RENDER FALLBACK FOR JS-HEAVY PAGES
      // ============================================================================

      // Select high-value JS-heavy pages for headless rendering
      if (jsHeavyPages.length > 0) {
        onProgress?.("Rendering JS-heavy pages...", passResults.length + 1, totalPasses + 3);
        console.log(`[MultiPass] Attempting headless render for ${jsHeavyPages.length} JS-heavy pages`);

        try {
          // Select top N pages for headless rendering based on priority
          const pagesToRender = selectPagesForHeadlessRender(pageFetchResults, HEADLESS_CONFIG);

          if (pagesToRender.length > 0) {
            console.log(`[MultiPass] Selected ${pagesToRender.length} pages for headless rendering`);

            // Render pages with headless fallback methods
            headlessRenderResults = await renderMultipleJsHeavyPages(pagesToRender, 2);

            // Count successful renders
            headlessRenderedCount = headlessRenderResults.filter(r => r.success).length;

            // Extract identifiers from headless-rendered pages
            headlessExtractedIdentifiers = headlessRenderResults
              .filter(r => r.success)
              .flatMap(r => r.extractedIdentifiers);

            // Merge headless results back into page fetch results
            if (headlessRenderedCount > 0) {
              pageFetchResults = mergeHeadlessResults(pageFetchResults, headlessRenderResults);

              // Update all extracted identifiers with headless results
              const existingIdentifierValues = new Set(allExtractedIdentifiers.map(i => i.value));
              const newHeadlessIdentifiers = headlessExtractedIdentifiers.filter(
                i => !existingIdentifierValues.has(i.value)
              );
              allExtractedIdentifiers = [...allExtractedIdentifiers, ...newHeadlessIdentifiers];

              console.log(`[MultiPass] Headless render complete:`, {
                rendered: headlessRenderedCount,
                newIdentifiers: newHeadlessIdentifiers.length,
                totalIdentifiers: allExtractedIdentifiers.length,
              });
            }
          }
        } catch (error) {
          console.error("[MultiPass] Headless render error:", error);
        }
      }

      // Prepare second-wave input
      const existingUsernames = new Set(
        [input.username, ...(input.aliases || [])].filter(Boolean).map(u => u!.toLowerCase())
      );
      const existingUrls = new Set(accumulatedSources.map(s => s.url).filter(Boolean) as string[]);

      secondWaveInput = prepareSecondWaveInput(pageFetchResults, existingUsernames, existingUrls);

      // Execute second-wave search if we found new identifiers
      const hasNewIdentifiers =
        secondWaveInput.discoveredUsernames.length > 0 ||
        secondWaveInput.discoveredSocialLinks.length > 0 ||
        secondWaveInput.discoveredDomains.length > 0;

      if (hasNewIdentifiers) {
        onProgress?.("Running second-wave search...", passResults.length + 2, totalPasses + 2);
        console.log(`[MultiPass] Executing second-wave search with discovered identifiers`);
        console.log(`[MultiPass] Second-wave input:`, {
          usernames: secondWaveInput.discoveredUsernames,
          socialLinks: secondWaveInput.discoveredSocialLinks.length,
          domains: secondWaveInput.discoveredDomains,
        });

        // Generate prioritized queries for second-wave
        const secondWaveQueryResult = generatePrioritizedSecondWaveQueries(secondWaveInput, input.name);
        secondWaveQueries = secondWaveQueryResult.prioritizedQueries;
        secondWaveQueryStats = secondWaveQueryResult.stats;

        console.log(`[MultiPass] Second-wave query stats:`, secondWaveQueryStats);

        if (secondWaveQueryResult.queries.length > 0) {
          // Execute second-wave search with prioritized queries
          const secondWaveSearchResult = await callPassSearch(
            secondWaveQueryResult.queries,
            input.name,
            "Second Wave"
          );

          if (secondWaveSearchResult.content) {
            allRawResponses.push(secondWaveSearchResult.content);

            const secondWaveParsed = parseDeepSearchResponse(
              secondWaveSearchResult.content,
              personContextId,
              secondWaveQueryResult.queries.join(", ")
            );

            // Merge and deduplicate results
            const existingUrlSet = new Set(accumulatedSources.map(s => s.url).filter(Boolean));
            const existingSummarySet = new Set(
              accumulatedSources.map(s => s.summary?.toLowerCase()).filter(Boolean)
            );

            // Smart deduplication: check URL AND summary/platform similarity
            const newSecondWaveSources = secondWaveParsed.sources.filter(source => {
              // Skip if exact URL match
              if (source.url && existingUrlSet.has(source.url)) {
                return false;
              }

              // Skip if very similar summary exists (fuzzy dedup)
              if (source.summary) {
                const normalizedSummary = source.summary.toLowerCase();
                for (const existingSummary of existingSummarySet) {
                  if (existingSummary && isSimilarText(normalizedSummary, existingSummary)) {
                    return false;
                  }
                }
              }

              return true;
            });

            if (newSecondWaveSources.length > 0) {
              accumulatedSources = [...accumulatedSources, ...newSecondWaveSources];
              secondWaveSources = newSecondWaveSources.length;
              console.log(`[MultiPass] Second-wave added ${secondWaveSources} new sources (deduplicated from ${secondWaveParsed.sources.length})`);
            } else {
              console.log(`[MultiPass] Second-wave found ${secondWaveParsed.sources.length} sources but all were duplicates`);
            }

            secondWaveExecuted = true;
          }
        }
      }
    } catch (error) {
      console.error("[MultiPass] Page fetching error:", error);
    }
  }

  // Rebuild final result with second-wave sources
  const updatedFinalResult: DeepSearchResult = {
    id: `ds_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    personContextId,
    searchQuery: passResults.flatMap(p => p.queriesUsed).join(", "),
    sources: accumulatedSources,
    summary: accumulatedSources.length > 0
      ? `Found ${accumulatedSources.length} results across ${new Set(accumulatedSources.map(s => s.type)).size} categories.`
      : "No results found after comprehensive search.",
    alignmentNotes: [],
    uncertainties: [],
    rawResponse: allRawResponses.join("\n\n---\n\n"),
  };

  // Rebuild categorized results with updated sources
  const updatedCategorizedResults = categorizeResults(accumulatedSources);
  const updatedCategorizedStats = getCategorizedResultsStats(updatedCategorizedResults);

  console.log(`[MultiPass] Complete. Passes: ${passResults.length}, Sources: ${accumulatedSources.length}, Stopped early: ${stoppedEarly}`);
  console.log(`[MultiPass] Retry stats: ${totalRetryAttempts} retries across ${passesRetried} passes`);
  console.log(`[MultiPass] Minimum passes met: ${minimumPassesMet} (${passResults.length}/${MIN_PASSES_BEFORE_STOP})`);
  console.log(`[MultiPass] Page fetching: ${pageFetchResults.length} pages, ${jsHeavyPages.length} JS-heavy`);
  console.log(`[MultiPass] Headless render: ${headlessRenderedCount} pages rendered, ${headlessExtractedIdentifiers.length} identifiers extracted`);
  console.log(`[MultiPass] Second-wave: executed=${secondWaveExecuted}, newSources=${secondWaveSources}`);
  if (secondWaveQueryStats) {
    console.log(`[MultiPass] Second-wave query breakdown:`, secondWaveQueryStats);
  }
  console.log(`[MultiPass] Extracted identifiers: ${allExtractedIdentifiers.length}`);
  console.log(`[MultiPass] Categorized results:`, updatedCategorizedStats.byCategory);
  console.log(`[MultiPass] Legal portals found:`, legalPortals.length);
  console.log(`[MultiPass] Image results found:`, imageResults.length);
  console.log(`[MultiPass] Archived pages found:`, archivedPages.length);

  return {
    finalResult: updatedFinalResult,
    categorizedResults: updatedCategorizedResults,
    categorizedStats: updatedCategorizedStats,
    passesExecuted: passResults.length,
    passResults,
    stoppedEarly,
    stopReason,
    legalPortals,
    imageResults,
    archivedPages,
    totalRetryAttempts,
    passesRetried,
    minimumPassesMet,
    pageFetchResults,
    secondWaveInput,
    secondWaveExecuted,
    secondWaveSources,
    jsHeavyPages,
    extractedIdentifiers: allExtractedIdentifiers,
    secondWaveQueryStats,
    secondWaveQueries,
    headlessRenderResults,
    headlessRenderedCount,
    headlessExtractedIdentifiers,
  };
}

/**
 * Executes a single pass search with the given queries.
 * ENFORCES multi-search behavior - the model MUST execute multiple distinct searches.
 *
 * @param queries - Array of search queries to execute
 * @param personName - Name of the person being searched
 * @param passName - Name of the current pass (for logging)
 * @returns Search results or null if failed
 */
async function callPassSearch(
  queries: string[],
  personName: string,
  passName: string = "Search"
): Promise<{ content: string | null; searchesExecuted: number }> {
  const apiKey = process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY;
  if (!apiKey) return { content: null, searchesExecuted: 0 };

  // Ensure we have at least MIN_SEARCHES_REQUIRED queries
  const minQueries = Math.max(queries.length, MIN_SEARCHES_REQUIRED);

  // Log search execution start
  console.log(`[PassSearch:${passName}] Starting with ${queries.length} queries (min required: ${MIN_SEARCHES_REQUIRED})`);

  // Build numbered query list for explicit execution tracking
  const numberedQueries = queries.slice(0, 20).map((q, i) => `${i + 1}. ${q}`).join("\n");

  const multiSearchPrompt = `You are performing a Deep Search for "${personName}".

${MULTI_SEARCH_INSTRUCTION}

HERE ARE YOUR REQUIRED SEARCH QUERIES - YOU MUST EXECUTE EACH ONE:
${numberedQueries}

EXECUTION INSTRUCTIONS:
1. Execute EACH numbered query above as a SEPARATE web search
2. For EACH search, report:
   - The query number and text
   - What you found (or "No results" if nothing found)
   - Any URLs discovered
3. Do NOT skip any queries
4. Do NOT stop early - complete ALL ${queries.length} searches
5. After completing all searches, provide a summary organized by category

IMPORTANT: Your response should show evidence of executing each search. Format like:

=== SEARCH RESULTS ===

[Query 1: "${queries[0] || "name search"}"]
Results: [what you found]

[Query 2: "${queries[1] || "location search"}"]
Results: [what you found]

... continue for ALL queries ...

=== SUMMARY ===
[Organized findings by category]`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-search-preview",
        messages: [
          {
            role: "system",
            content: `You are a thorough research assistant that MUST perform multiple distinct web searches.
You are NOT allowed to stop after one search. You MUST execute at least ${MIN_SEARCHES_REQUIRED} different search queries.
Each search should target different information: name variations, locations, specific platforms, usernames, etc.
Report what each individual search found. Include actual URLs when available.

CRITICAL ACCURACY REQUIREMENTS:
- DO NOT make up or hallucinate information - only report what you actually find
- DO NOT include results that are just "similar names" - the result must have STRONG EVIDENCE it is the same person
- A result is LEGITIMATE only if it has at least 2 matching identifiers (e.g., same name + same location, same name + same workplace, same username + same photo, etc.)
- If you find a profile with ONLY a matching name but NO other corroborating details, mark it as "Possible match - unverified" or EXCLUDE it entirely
- NEVER include celebrities, public figures, or random people who happen to have the same name
- When in doubt, DO NOT include the result - quality over quantity
- Always verify the URL is a direct profile link, not just a search results page`,
          },
          {
            role: "user",
            content: multiSearchPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 4000, // Increased to accommodate multiple search results
        web_search_options: {
          search_context_size: "high",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`[PassSearch:${passName}] API error: ${response.status}`, errorText);
      return { content: null, searchesExecuted: 0 };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || null;

    // Estimate searches executed by counting query references in response
    const searchesExecuted = estimateSearchesExecuted(content, queries);

    console.log(`[PassSearch:${passName}] Completed. Estimated searches executed: ${searchesExecuted}/${queries.length}`);

    if (searchesExecuted < MIN_SEARCHES_REQUIRED) {
      console.warn(`[PassSearch:${passName}] WARNING: Only ${searchesExecuted} searches detected, minimum is ${MIN_SEARCHES_REQUIRED}`);
    }

    return { content, searchesExecuted };
  } catch (error) {
    console.error(`[PassSearch:${passName}] Error:`, error);
    return { content: null, searchesExecuted: 0 };
  }
}

/**
 * Estimates how many searches were actually executed based on response content.
 * Looks for query patterns, result markers, and URL counts.
 */
function estimateSearchesExecuted(content: string | null, queries: string[]): number {
  if (!content) return 0;

  let count = 0;

  // Count explicit query references (e.g., "[Query 1:", "Search #1:")
  const queryPatterns = [
    /\[Query \d+/gi,
    /Search #\d+/gi,
    /Query \d+:/gi,
    /\d+\.\s*[""][^""]+[""]/g, // Numbered quoted queries
  ];

  for (const pattern of queryPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      count = Math.max(count, matches.length);
    }
  }

  // Also count how many of the original queries are mentioned
  let queryMentions = 0;
  for (const query of queries) {
    // Check for key parts of the query (first few words)
    const keyPart = query.split(" ").slice(0, 3).join(" ").toLowerCase();
    if (content.toLowerCase().includes(keyPart)) {
      queryMentions++;
    }
  }

  // Count URLs found (indicates actual searches)
  const urlMatches = content.match(/https?:\/\/[^\s\)\]\>]+/g);
  const urlCount = urlMatches ? urlMatches.length : 0;

  // Use the highest indicator
  const estimated = Math.max(count, queryMentions, Math.ceil(urlCount / 2));

  return estimated;
}

// ============================================================================
// DEEP SEARCH EXECUTION
// ============================================================================

interface DeepSearchOptions {
  personContext: PersonContext;
  focusAreas?: SearchCategory[];
  onProgress?: (status: string) => void;
}

interface DeepSearchResponse {
  success: boolean;
  result?: DeepSearchResult;
  error?: string;
  safetyBlock?: {
    reason: "safety_concern" | "surveillance_intent";
    showResources: boolean;
  };
}

/**
 * Executes a Deep Search for the given Person Context
 * This function coordinates:
 * 1. Safety check
 * 2. Building search queries
 * 3. Calling the LLM with web search enabled
 * 4. Parsing and returning results
 */
export async function executeDeepSearch(
  options: DeepSearchOptions
): Promise<DeepSearchResponse> {
  const { personContext, focusAreas, onProgress } = options;

  // Initialize logger
  const logger = new DeepSearchLogger(personContext.id);
  logger.logInputs(personContext);

  try {
    // Step 1: Safety check
    onProgress?.("Checking safety...");
    const safetyCheck = checkDeepSearchSafety(personContext);

    if (!safetyCheck.isSafe) {
      logger.logSafetyBlock(safetyCheck.reason || "unknown");
      logger.finalize();
      return {
        success: false,
        safetyBlock: {
          reason: safetyCheck.reason as "safety_concern" | "surveillance_intent",
          showResources: safetyCheck.shouldShowResources || false,
        },
      };
    }

    // Step 2: Build search queries
    onProgress?.("Building search queries...");
    const searchQueries = buildSearchQueries(personContext);
    logger.logQueries(searchQueries);

    // Step 3: Build the user prompt
    const userPrompt = buildDeepSearchUserPrompt({
      personContext,
      additionalSearchTerms: searchQueries,
      focusAreas,
    });

    // Step 4: Call the LLM with web search
    onProgress?.("Searching public sources...");

    const response = await callDeepSearchLLM({
      systemPrompt: DEEP_SEARCH_SYSTEM_PROMPT,
      developerPrompt: DEEP_SEARCH_DEVELOPER_PROMPT,
      userPrompt,
      searchQueries,
    });

    if (!response) {
      logger.logError("No response from API", "api_call");
      const result = parseDeepSearchResponse(
        NO_RESULTS_RESPONSE,
        personContext.id,
        searchQueries.join(", ")
      );
      logger.logResults(result);
      logger.finalize();
      return {
        success: true,
        result,
      };
    }

    // Step 5: Parse the response
    onProgress?.("Processing results...");
    const result = parseDeepSearchResponse(
      response,
      personContext.id,
      searchQueries.join(", ")
    );

    // Log results
    logger.logResults(result);

    // Check for identity ambiguity
    const ambiguity = detectIdentityAmbiguity(response);
    logger.logIdentityAmbiguity(ambiguity.detected, ambiguity.signals);

    // Finalize log
    logger.finalize();

    return {
      success: true,
      result,
    };
  } catch (error) {
    console.error("Deep Search error:", error);
    logger.logError(error instanceof Error ? error.message : "Unknown error", "unknown");
    logger.finalize();
    return {
      success: false,
      error: error instanceof Error ? error.message : "Search failed",
    };
  }
}

// ============================================================================
// DEEP DIVE SEARCH - Enhanced search with verified sources
// ============================================================================

interface DeepDiveOptions {
  personContext: PersonContext;
  verifiedSources: DeepSearchSource[];
  onProgress?: (status: string) => void;
}

/**
 * Verified profile data extracted for enhanced searching
 */
interface VerifiedProfileData {
  username: string;
  platform: string;
  displayName?: string;
  bio?: string;
  followers?: number;
  following?: number;
  posts?: number;
  isVerified?: boolean;
  url?: string;
}

/**
 * Deep Dive Search - An enhanced search using verified profile data
 *
 * This is triggered after user verifies which profiles belong to the person.
 * Uses ALL available data from verified profiles:
 * - Usernames (cross-platform search)
 * - Display names (name variations)
 * - Bios (keywords, interests, locations mentioned)
 * - Follower/following ratios (influencer vs normal user)
 * - Platform presence (to find gaps)
 */
export async function executeDeepDiveSearch(
  options: DeepDiveOptions
): Promise<DeepSearchResponse> {
  const { personContext, verifiedSources, onProgress } = options;

  console.log("[DeepDive] Starting enhanced search with", verifiedSources.length, "verified sources");

  // Extract ALL available data from verified profiles
  const verifiedProfiles: VerifiedProfileData[] = [];
  const verifiedUsernames: string[] = [];
  const verifiedDisplayNames: string[] = [];
  const bioKeywords: string[] = [];
  const verifiedPlatforms: string[] = [];

  for (const source of verifiedSources) {
    const stats = source.socialStats;

    // Extract username from socialStats or URL
    let username: string | undefined;
    if (stats?.username) {
      username = stats.username.replace(/^@/, "");
    } else if (source.url) {
      username = extractUsernameFromUrl(source.url, source.platform);
    }

    if (username && !verifiedUsernames.includes(username.toLowerCase())) {
      verifiedUsernames.push(username.toLowerCase());
    }

    // Extract display name
    if (stats?.displayName && !verifiedDisplayNames.includes(stats.displayName)) {
      verifiedDisplayNames.push(stats.displayName);
    }

    // Extract keywords from bio
    if (stats?.bio) {
      const keywords = extractBioKeywords(stats.bio);
      for (const kw of keywords) {
        if (!bioKeywords.includes(kw)) {
          bioKeywords.push(kw);
        }
      }
    }

    // Track platforms found
    if (!verifiedPlatforms.includes(source.platform.toLowerCase())) {
      verifiedPlatforms.push(source.platform.toLowerCase());
    }

    verifiedProfiles.push({
      username: username || "",
      platform: source.platform,
      displayName: stats?.displayName,
      bio: stats?.bio,
      followers: stats?.followers,
      following: stats?.following,
      posts: stats?.posts,
      isVerified: stats?.isVerifiedAccount,
      url: source.url,
    });
  }

  console.log("[DeepDive] Verified usernames:", verifiedUsernames);
  console.log("[DeepDive] Verified display names:", verifiedDisplayNames);
  console.log("[DeepDive] Bio keywords:", bioKeywords);
  console.log("[DeepDive] Platforms found:", verifiedPlatforms);

  try {
    onProgress?.("Analyzing verified profiles...");

    // Build enhanced search queries using ALL verified data
    const enhancedQueries = buildEnhancedDeepDiveQueries(
      personContext,
      verifiedUsernames,
      verifiedDisplayNames,
      bioKeywords,
      verifiedPlatforms,
      verifiedProfiles
    );
    console.log("[DeepDive] Enhanced queries:", enhancedQueries.slice(0, 10));

    // Build the deep dive user prompt with rich context
    const deepDivePrompt = buildEnhancedDeepDivePrompt(
      personContext,
      verifiedProfiles,
      verifiedUsernames,
      verifiedDisplayNames,
      bioKeywords
    );

    onProgress?.("Deep diving with verified identity...");

    // Call the LLM with enhanced search
    const response = await callDeepSearchLLM({
      systemPrompt: ENHANCED_DEEP_DIVE_SYSTEM_PROMPT,
      developerPrompt: ENHANCED_DEEP_DIVE_DEVELOPER_PROMPT,
      userPrompt: deepDivePrompt,
      searchQueries: enhancedQueries,
    });

    if (!response) {
      console.error("[DeepDive] No response from API");
      return {
        success: false,
        error: "No response from search",
      };
    }

    // Parse the response
    onProgress?.("Processing deep dive results...");
    const result = parseDeepSearchResponse(
      response,
      personContext.id,
      enhancedQueries.join(", ")
    );

    console.log("[DeepDive] Found", result.sources.length, "sources");

    return {
      success: true,
      result,
    };
  } catch (error) {
    console.error("[DeepDive] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Deep dive search failed",
    };
  }
}

/**
 * Extract meaningful keywords from a bio for search
 */
function extractBioKeywords(bio: string): string[] {
  const keywords: string[] = [];

  // Common patterns to extract
  const patterns = [
    // Location patterns
    /(?:based in|living in|from|in)\s+([A-Z][a-zA-Z\s,]+)/gi,
    // Job/role patterns
    /(?:^|\s)(CEO|CTO|founder|engineer|designer|developer|artist|photographer|writer|coach|consultant|manager|director)\b/gi,
    // Company/org patterns
    /@([A-Za-z0-9_]+)/g,
    // Education patterns
    /(?:alum|alumni|grad|student)\s+(?:of\s+)?([A-Z][a-zA-Z\s]+)/gi,
    // Interest patterns
    /(?:love|lover|enthusiast|fan of)\s+([a-zA-Z\s]+)/gi,
  ];

  for (const pattern of patterns) {
    const matches = bio.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].length > 2 && match[1].length < 50) {
        keywords.push(match[1].trim());
      }
    }
  }

  // Also extract any capitalized multi-word phrases (likely names, places, companies)
  const capitalizedPhrases = bio.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/g) || [];
  for (const phrase of capitalizedPhrases) {
    if (phrase.length > 3 && phrase.length < 50 && !keywords.includes(phrase)) {
      keywords.push(phrase);
    }
  }

  // Extract emojis context (what comes after location/work emojis)
  const emojiContexts = bio.match(/[📍🏠🏢💼🎓]\s*([^📍🏠🏢💼🎓\n]+)/g) || [];
  for (const ctx of emojiContexts) {
    const cleaned = ctx.replace(/^[📍🏠🏢💼🎓]\s*/, "").trim();
    if (cleaned.length > 2 && cleaned.length < 50) {
      keywords.push(cleaned);
    }
  }

  return [...new Set(keywords)].slice(0, 10); // Limit to 10 keywords
}

/**
 * Build enhanced queries using all verified profile data
 */
function buildEnhancedDeepDiveQueries(
  personContext: PersonContext,
  verifiedUsernames: string[],
  verifiedDisplayNames: string[],
  bioKeywords: string[],
  verifiedPlatforms: string[],
  verifiedProfiles: VerifiedProfileData[]
): string[] {
  const queries: string[] = [];
  const name = personContext.name;
  const location = personContext.location;

  // 1. CROSS-PLATFORM USERNAME SEARCH (highest priority)
  // People often reuse usernames across platforms
  const platformsToSearch = [
    "instagram.com", "twitter.com", "x.com", "tiktok.com", "facebook.com",
    "linkedin.com", "reddit.com", "youtube.com", "pinterest.com", "tumblr.com",
    "snapchat.com", "threads.net", "github.com", "medium.com", "quora.com"
  ];

  for (const username of verifiedUsernames) {
    // Search username on platforms NOT already verified
    for (const platform of platformsToSearch) {
      const platformName = platform.split(".")[0];
      if (!verifiedPlatforms.some(vp => vp.includes(platformName))) {
        queries.push(`"${username}" site:${platform}`);
      }
    }
    // Generic username search
    queries.push(`"${username}" profile`);
    queries.push(`"${username}" account`);
  }

  // 2. USERNAME VARIATIONS (same person often uses similar names)
  for (const username of verifiedUsernames.slice(0, 3)) {
    // Common variations
    const variations = generateUsernameSearchVariations(username);
    for (const variation of variations.slice(0, 5)) {
      queries.push(`"${variation}"`);
    }
  }

  // 3. DISPLAY NAME SEARCH (may differ from legal name)
  for (const displayName of verifiedDisplayNames) {
    if (displayName.toLowerCase() !== name.toLowerCase()) {
      queries.push(`"${displayName}" profile`);
      queries.push(`"${displayName}" site:instagram.com`);
      queries.push(`"${displayName}" site:linkedin.com`);
      if (location) {
        queries.push(`"${displayName}" ${location}`);
      }
    }
  }

  // 4. BIO KEYWORDS + NAME (find other profiles with same interests/location)
  for (const keyword of bioKeywords.slice(0, 5)) {
    queries.push(`"${name}" "${keyword}"`);
    for (const username of verifiedUsernames.slice(0, 2)) {
      queries.push(`"${username}" "${keyword}"`);
    }
  }

  // 5. DATING PLATFORMS (high priority for relationship context)
  const datingPlatforms = ["tinder", "bumble", "hinge", "okcupid", "match.com", "pof", "badoo"];
  for (const username of verifiedUsernames.slice(0, 3)) {
    for (const dating of datingPlatforms) {
      queries.push(`"${username}" ${dating}`);
    }
  }
  // Also search by display names on dating
  for (const displayName of verifiedDisplayNames.slice(0, 2)) {
    queries.push(`"${displayName}" dating profile`);
    queries.push(`"${displayName}" tinder OR bumble OR hinge`);
  }

  // 6. ARCHIVED/DELETED CONTENT
  for (const username of verifiedUsernames.slice(0, 3)) {
    queries.push(`"${username}" site:web.archive.org`);
    queries.push(`"${username}" cached`);
  }
  for (const profile of verifiedProfiles.slice(0, 3)) {
    if (profile.url) {
      queries.push(`site:web.archive.org "${profile.url}"`);
    }
  }

  // 7. LEGAL/PUBLIC RECORDS (now with confirmed identity)
  queries.push(`"${name}" court case`);
  queries.push(`"${name}" arrest record`);
  queries.push(`"${name}" lawsuit`);
  if (location) {
    queries.push(`"${name}" ${location} court`);
    queries.push(`"${name}" ${location} public records`);
  }
  // Use display names for legal search too
  for (const displayName of verifiedDisplayNames) {
    if (displayName !== name) {
      queries.push(`"${displayName}" court OR arrest OR lawsuit`);
    }
  }

  // 8. FORUM/COMMUNITY SEARCHES
  const forums = ["reddit.com", "quora.com", "forums", "community"];
  for (const username of verifiedUsernames.slice(0, 3)) {
    for (const forum of forums) {
      queries.push(`"${username}" ${forum}`);
    }
  }

  // 9. PROFESSIONAL/WORK CONTEXT (from bio keywords)
  const workKeywords = bioKeywords.filter(kw =>
    /(?:CEO|CTO|founder|engineer|designer|developer|company|corp|inc|llc)/i.test(kw)
  );
  for (const workKw of workKeywords) {
    queries.push(`"${name}" "${workKw}"`);
    queries.push(`"${workKw}" site:linkedin.com`);
  }

  // 10. REVERSE IMAGE SEARCH QUERIES (profile photo context)
  for (const username of verifiedUsernames.slice(0, 2)) {
    queries.push(`"${username}" photo`);
    queries.push(`"${username}" selfie`);
  }

  return [...new Set(queries)]; // Remove duplicates
}

/**
 * Generate username variations for expanded search
 */
function generateUsernameSearchVariations(username: string): string[] {
  const variations: string[] = [username];
  const cleaned = username.replace(/[_.\-]/g, "").toLowerCase();

  // Common number suffixes
  const numbers = ["1", "2", "01", "99", "123"];
  for (const num of numbers) {
    variations.push(`${cleaned}${num}`);
    variations.push(`${cleaned}_${num}`);
  }

  // With/without underscores
  if (username.includes("_")) {
    variations.push(username.replace(/_/g, ""));
    variations.push(username.replace(/_/g, "."));
  } else {
    // Try to split camelCase or add separators
    const words = cleaned.match(/[a-z]+|[0-9]+/gi);
    if (words && words.length > 1) {
      variations.push(words.join("_"));
      variations.push(words.join("."));
    }
  }

  // Common suffixes
  const suffixes = ["_", "official", "real", "the"];
  for (const suffix of suffixes) {
    variations.push(`${cleaned}${suffix}`);
    variations.push(`${suffix}${cleaned}`);
  }

  return [...new Set(variations)];
}

/**
 * Build enhanced prompt with all verified data
 */
function buildEnhancedDeepDivePrompt(
  personContext: PersonContext,
  verifiedProfiles: VerifiedProfileData[],
  verifiedUsernames: string[],
  verifiedDisplayNames: string[],
  bioKeywords: string[]
): string {
  // Build detailed verified profiles section
  const profilesSection = verifiedProfiles.map(p => {
    let text = `• ${p.platform}`;
    if (p.url) text += `\n  URL: ${p.url}`;
    if (p.username) text += `\n  Username: @${p.username}`;
    if (p.displayName) text += `\n  Display Name: ${p.displayName}`;
    if (p.bio) text += `\n  Bio: "${p.bio.slice(0, 100)}${p.bio.length > 100 ? "..." : ""}"`;
    if (p.followers !== undefined) text += `\n  Followers: ${p.followers}`;
    if (p.following !== undefined) text += `\n  Following: ${p.following}`;
    if (p.posts !== undefined) text += `\n  Posts: ${p.posts}`;
    if (p.isVerified) text += `\n  Verified Account: Yes`;
    return text;
  }).join("\n\n");

  return `DEEP DIVE SEARCH - Identity Confirmed

The user has VERIFIED these profiles belong to the same person. Use this confirmed data to find additional information.

═══════════════════════════════════════════════════════
CONFIRMED IDENTITY
═══════════════════════════════════════════════════════
Name: ${personContext.name}
Relationship: ${personContext.relationshipContext}
${personContext.location ? `Location: ${personContext.location}` : ""}

═══════════════════════════════════════════════════════
VERIFIED PROFILES (User Confirmed)
═══════════════════════════════════════════════════════
${profilesSection}

═══════════════════════════════════════════════════════
EXTRACTED DATA FOR SEARCH
═══════════════════════════════════════════════════════
Verified Usernames: ${verifiedUsernames.join(", ") || "None"}
Display Names: ${verifiedDisplayNames.join(", ") || "Same as legal name"}
Bio Keywords: ${bioKeywords.join(", ") || "None extracted"}

═══════════════════════════════════════════════════════
YOUR MISSION
═══════════════════════════════════════════════════════
Using the VERIFIED usernames and profile data above, search for:

1. SAME USERNAME ON OTHER PLATFORMS
   - People reuse usernames - search each verified username across ALL platforms
   - Check: TikTok, Snapchat, Pinterest, YouTube, Reddit, Twitter/X, Threads, etc.

2. USERNAME VARIATIONS
   - Try common variations: username_, _username, username123, theusername, etc.
   - Search these variations across platforms

3. DATING PROFILES
   - This is high priority - search dating sites with verified usernames AND display names
   - Check: Tinder, Bumble, Hinge, OkCupid, Match, POF, Badoo
   - Search for cached/archived dating profiles

4. DELETED/ARCHIVED CONTENT
   - Check Wayback Machine for the verified profile URLs
   - Search for cached versions of profiles
   - Look for deleted posts or old content

5. LEGAL/PUBLIC RECORDS
   - Now that identity is confirmed, search court records by name AND display names
   - Look for arrests, lawsuits, business filings
   - Include location for targeted searches

6. FORUM/COMMUNITY PRESENCE
   - Search Reddit, Quora, forums with verified usernames
   - Look for comments, posts, discussions

IMPORTANT INSTRUCTIONS:
- Identity is CONFIRMED - don't say "possible match"
- Use the EXACT verified usernames in your searches
- Search for username variations (people often use similar names)
- Include display names in searches (may differ from legal name)
- Use bio keywords to find related profiles
- Present ALL findings with direct URLs`;
}

const ENHANCED_DEEP_DIVE_SYSTEM_PROMPT = `You are Klarity Deep Dive - an advanced search system with CONFIRMED identity.

The user has verified specific profiles belong to their person of interest. Your job is to use this confirmed data to find everything publicly available about this person.

KEY ADVANTAGE: You have VERIFIED usernames and profile data. People typically reuse usernames across platforms, so search each verified username on EVERY platform.

CRITICAL RULE - ONLY RETURN LEGITIMATE RESULTS:
Even with confirmed usernames, a new result is ONLY legitimate if it has clear evidence of being the SAME PERSON:
- Username match from verified profile (HIGH confidence)
- Same display name + same username pattern
- Bio/content references other verified profiles
- Cross-linked accounts (one profile links to another)
- Consistent personal details across profiles (location, job, interests)

DO NOT INCLUDE:
- Random profiles that just happen to have a similar username
- Common usernames on unrelated accounts (e.g., "john123" could be anyone)
- Profiles with no connection to the verified identity
- Celebrities or public figures with similar names/usernames
- Results you are guessing with no real evidence

When in doubt, DO NOT include a result. Quality matters more than quantity.

SEARCH STRATEGY:
1. Take each verified username and search it on platforms NOT already found
2. Try username variations (underscores, numbers, prefixes/suffixes)
3. Use display names for additional searches (may differ from legal name)
4. Search bio keywords with the person's name
5. Check dating platforms with usernames AND display names
6. Search archived/cached content for deleted profiles
7. Search legal records with confirmed identity

OUTPUT FORMAT - For each profile found:
**[Platform Name]**
URL: [direct link]
Username: @[handle]
Display Name: [name shown]
Bio: [first 100 chars]
Stats: Followers: X | Following: Y | Posts: Z
Match Confidence: High/Medium/Low
Match Reason: [WHY this is the same person - username match, cross-linked, etc.]

Be thorough but ACCURATE - only include results that are clearly the same person.`;

const ENHANCED_DEEP_DIVE_DEVELOPER_PROMPT = `DEEP DIVE MODE - CONFIRMED IDENTITY

You have verified profile data. Execute a comprehensive search.

CRITICAL - IDENTITY VERIFICATION REQUIREMENT:
Before including ANY new result, you MUST verify it is the SAME PERSON using one of these criteria:
- EXACT username match from a verified profile (HIGH confidence)
- Username + consistent bio details (location, job, interests match)
- Cross-linked accounts (profile A links to profile B)
- Same unique display name + location combination
- Profile photo appears to be the same person

DO NOT INCLUDE results that are just:
- Similar usernames with no other connection
- Same name but different person
- Common usernames that could belong to anyone
- Guesses or speculation

It is BETTER to return 3 verified results than 10 unverified guesses.

SEARCH PHASES:

PHASE 1: USERNAME CROSS-REFERENCE
For EACH verified username, search on:
- Instagram, Twitter/X, TikTok, Facebook, LinkedIn
- Reddit, YouTube, Pinterest, Snapchat, Threads
- GitHub, Medium, Quora, Tumblr
- Dating: Tinder, Bumble, Hinge, OkCupid, Match

PHASE 2: USERNAME VARIATIONS
Try these patterns for each username:
- username_, _username
- username1, username123, username99
- theusername, realusername, officialusername
- username with/without dots, dashes, underscores

PHASE 3: DISPLAY NAME SEARCH
If display name differs from legal name:
- Search display name across platforms
- Combine display name with location
- Search dating profiles with display name

PHASE 4: DATING DEEP SEARCH
High priority - use ALL available data:
- Search verified usernames on dating sites
- Search display names on dating sites
- Look for cached/archived dating profiles
- Check dating profile screenshot sites

PHASE 5: ARCHIVED CONTENT
- Wayback Machine for verified URLs
- Cached profile pages
- Deleted content searches

PHASE 6: LEGAL RECORDS
Identity confirmed - search:
- Court cases (civil and criminal)
- Arrest records
- Business filings
- Professional licenses

OUTPUT FORMAT:
For each result, include:
- Direct URL
- Match Confidence (High/Medium/Low)
- Match Reason (WHY you believe this is the same person)

Only include results where you have clear evidence of identity match.`;

/**
 * Extract username from a profile URL
 */
function extractUsernameFromUrl(url: string, platform: string): string | undefined {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/").filter(Boolean);

    // Platform-specific extraction
    const platformLower = platform.toLowerCase();

    if (platformLower.includes("instagram") || urlObj.hostname.includes("instagram")) {
      return pathParts[0];
    }
    if (platformLower.includes("twitter") || platformLower.includes("x.com") || urlObj.hostname.includes("twitter") || urlObj.hostname.includes("x.com")) {
      return pathParts[0];
    }
    if (platformLower.includes("tiktok") || urlObj.hostname.includes("tiktok")) {
      const username = pathParts[0];
      return username?.startsWith("@") ? username.slice(1) : username;
    }
    if (platformLower.includes("linkedin") || urlObj.hostname.includes("linkedin")) {
      if (pathParts[0] === "in" && pathParts[1]) {
        return pathParts[1];
      }
      return pathParts[0];
    }
    if (platformLower.includes("facebook") || urlObj.hostname.includes("facebook")) {
      return pathParts[0];
    }
    if (platformLower.includes("reddit") || urlObj.hostname.includes("reddit")) {
      if (pathParts[0] === "user" || pathParts[0] === "u") {
        return pathParts[1];
      }
      return pathParts[0];
    }

    // Generic fallback
    return pathParts[0];
  } catch {
    return undefined;
  }
}

// ============================================================================
// LLM CALL WITH WEB SEARCH
// ============================================================================

interface LLMCallParams {
  systemPrompt: string;
  developerPrompt: string;
  userPrompt: string;
  searchQueries: string[];
}

/**
 * Calls Perplexity AI for web search - optimized for real-time internet search
 * Perplexity is specifically built for search and provides better results with citations
 *
 * Cost: ~$0.005-0.01 per search (much cheaper than OpenAI web search)
 */
async function callDeepSearchWithPerplexity(params: LLMCallParams): Promise<string | null> {
  const { systemPrompt, developerPrompt, userPrompt, searchQueries } = params;

  if (!isPerplexityConfigured()) {
    console.log("[DeepSearch] Perplexity not configured, skipping...");
    return null;
  }

  console.log(`[DeepSearch Perplexity] Starting search with ${searchQueries.length} queries`);
  console.log("[DeepSearch Perplexity] Sample queries:", searchQueries.slice(0, 5));

  // Build a comprehensive search prompt for Perplexity
  const numberedQueries = searchQueries.slice(0, 15).map((q, i) => `${i + 1}. ${q}`).join("\n");

  const searchPrompt = `${systemPrompt}

${developerPrompt}

${userPrompt}

SEARCH QUERIES TO INVESTIGATE:
${numberedQueries}

INSTRUCTIONS:
1. Search thoroughly for each query above
2. For social media profiles found, include: username, display name, bio, follower counts, and profile link
3. Only include results where at least 2 identifiers match (name + location, name + workplace, username + name, etc.)
4. Do NOT include random people with just a matching name
5. Cite your sources with direct URLs
6. Organize results by category (Social Media, Professional, Dating, Public Records, etc.)

If nothing is found for a category, state that clearly.`;

  try {
    const response = await perplexitySearch(searchPrompt, {
      model: "sonar-pro", // Use pro model for thorough person searches
      temperature: 0.1, // Low temperature for factual accuracy
      maxTokens: 4096,
    });

    if (!response || !response.content) {
      console.log("[DeepSearch Perplexity] No response received");
      return null;
    }

    console.log("[DeepSearch Perplexity] Got response, length:", response.content.length);
    console.log("[DeepSearch Perplexity] Citations found:", response.citations.length);

    // Append citations to the response for better source tracking
    let resultWithCitations = response.content;
    if (response.citations.length > 0) {
      resultWithCitations += "\n\n---\n**Sources:**\n";
      response.citations.forEach((citation, i) => {
        resultWithCitations += `${i + 1}. ${citation.url}\n`;
      });
    }

    return resultWithCitations;
  } catch (error) {
    console.error("[DeepSearch Perplexity] Search failed:", error);
    return null;
  }
}

/**
 * Calls the OpenAI Responses API with web search capability
 * This uses the newer Responses API with built-in web_search tool
 * ENFORCES multi-search behavior through explicit instructions
 *
 * NOTE: This is now the FALLBACK - Perplexity is tried first as it's optimized for search
 */
async function callDeepSearchLLM(params: LLMCallParams): Promise<string | null> {
  // Try Perplexity first - it's specifically designed for web search
  const perplexityResult = await callDeepSearchWithPerplexity(params);
  if (perplexityResult) {
    console.log("[DeepSearch] Using Perplexity result");
    return perplexityResult;
  }

  // Fallback to OpenAI if Perplexity is not configured or fails
  console.log("[DeepSearch] Falling back to OpenAI...");

  const { systemPrompt, developerPrompt, userPrompt, searchQueries } = params;

  const apiKey = process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY;

  if (!apiKey) {
    console.error("Missing OpenAI API key");
    return null;
  }

  // Build numbered query list for explicit multi-search enforcement
  const numberedQueries = searchQueries.slice(0, 20).map((q, i) => `${i + 1}. ${q}`).join("\n");

  console.log(`[DeepSearch OpenAI] Starting search with ${searchQueries.length} queries (min required: ${MIN_SEARCHES_REQUIRED})`);
  console.log("[DeepSearch OpenAI] Sample queries:", searchQueries.slice(0, 5));

  // Enhanced instructions with multi-search enforcement
  const enhancedInstructions = `${systemPrompt}

${developerPrompt}

${MULTI_SEARCH_INSTRUCTION}`;

  // Enhanced input with explicit query list
  const enhancedInput = `${userPrompt}

=== REQUIRED SEARCH QUERIES (EXECUTE ALL) ===
${numberedQueries}

IMPORTANT: Execute EACH query above as a separate web search. Do not stop after finding something - complete ALL searches.
Total searches required: ${Math.max(searchQueries.length, MIN_SEARCHES_REQUIRED)}`;

  try {
    // Use OpenAI Responses API with web_search tool for real internet search
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        instructions: enhancedInstructions,
        input: enhancedInput,
        tools: [
          {
            type: "web_search",
          },
        ],
      }),
    });

    console.log("[DeepSearch] Responses API status:", response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[DeepSearch] Responses API error:", JSON.stringify(errorData));

      // Fallback to chat completions if responses API fails
      console.log("[DeepSearch] Falling back to chat completions API...");
      return await callDeepSearchLLMFallback(params);
    }

    const data = await response.json();
    console.log("[DeepSearch] Responses API response keys:", Object.keys(data));

    // Extract the text content from the response
    // The Responses API returns output in a different format
    if (data.output) {
      // Handle array of output items
      if (Array.isArray(data.output)) {
        console.log("[DeepSearch] Output is array with", data.output.length, "items");
        const textContent = data.output
          .filter((item: { type: string }) => item.type === "message")
          .map((item: { content: Array<{ type: string; text: string }> }) => {
            if (Array.isArray(item.content)) {
              return item.content
                .filter((c) => c.type === "output_text" || c.type === "text")
                .map((c) => c.text)
                .join("");
            }
            return "";
          })
          .join("\n");

        if (textContent) {
          console.log("[DeepSearch] Extracted text content length:", textContent.length);
          // Log estimated searches executed
          const searchesExecuted = estimateSearchesExecuted(textContent, searchQueries);
          console.log(`[DeepSearch] Estimated searches executed: ${searchesExecuted}/${searchQueries.length}`);
          return textContent;
        }
      }

      if (typeof data.output === "string") {
        console.log("[DeepSearch] Output is string, length:", data.output.length);
        return data.output;
      }
    }

    // Try alternative response formats
    if (data.choices?.[0]?.message?.content) {
      console.log("[DeepSearch] Found content in choices format");
      return data.choices[0].message.content;
    }

    console.log("[DeepSearch] Could not extract content, full response:", JSON.stringify(data).slice(0, 500));

    // Fallback if we couldn't parse the response
    return await callDeepSearchLLMFallback(params);
  } catch (error) {
    console.error("[DeepSearch] LLM call failed:", error);
    // Try fallback
    return await callDeepSearchLLMFallback(params);
  }
}

/**
 * Fallback to Chat Completions API if Responses API is not available
 * ENFORCES multi-search behavior through explicit instructions
 */
async function callDeepSearchLLMFallback(params: LLMCallParams): Promise<string | null> {
  const { systemPrompt, developerPrompt, userPrompt, searchQueries } = params;

  const apiKey = process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  // Build numbered query list for explicit multi-search enforcement
  const numberedQueries = searchQueries.slice(0, 20).map((q, i) => `${i + 1}. ${q}`).join("\n");

  console.log(`[DeepSearch Fallback] Attempting with gpt-4o-search-preview... (${searchQueries.length} queries)`);

  try {
    // Enhanced system prompt with multi-search enforcement
    const enhancedSystemPrompt = `${systemPrompt}

${MULTI_SEARCH_INSTRUCTION}

IMPORTANT: You must search the internet to find real, current information about this person.
Do not make up or hallucinate any information. Only report what you can actually find through web search.
Include actual URLs to profiles you discover.
You MUST execute at least ${MIN_SEARCHES_REQUIRED} distinct web searches before responding.`;

    // Enhanced user prompt with explicit query list
    const enhancedUserPrompt = `${userPrompt}

=== REQUIRED SEARCH QUERIES (EXECUTE ALL) ===
${numberedQueries}

INSTRUCTIONS:
1. Execute EACH numbered query above as a SEPARATE web search
2. Do NOT stop after 1-3 searches - complete ALL queries
3. For each search, report what you found or "No results found"
4. Include actual URLs to profiles you discover
5. After completing all searches, organize findings by category

Total searches required: ${Math.max(searchQueries.length, MIN_SEARCHES_REQUIRED)}

BEGIN SEARCHING NOW:`;

    const messages = [
      {
        role: "system",
        content: enhancedSystemPrompt,
      },
      {
        role: "user",
        content: enhancedUserPrompt,
      },
    ];

    // Try gpt-4o-search-preview first
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-search-preview",
        messages,
        temperature: 0.7,
        max_tokens: 4000,
        web_search_options: {
          search_context_size: "high",
        },
      }),
    });

    console.log("[DeepSearch Fallback] gpt-4o-search-preview status:", response.status);

    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        console.log("[DeepSearch Fallback] Got response, length:", content.length);
        // Log estimated searches executed
        const searchesExecuted = estimateSearchesExecuted(content, searchQueries);
        console.log(`[DeepSearch Fallback] Estimated searches executed: ${searchesExecuted}/${searchQueries.length}`);
        return content;
      }
    }

    // If search preview fails, try with regular gpt-4o
    console.log("[DeepSearch Fallback] Trying regular gpt-4o...");
    const regularResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    console.log("[DeepSearch Fallback] gpt-4o status:", regularResponse.status);

    if (!regularResponse.ok) {
      const errorData = await regularResponse.json();
      console.error("[DeepSearch Fallback] Error:", JSON.stringify(errorData));
      return null;
    }

    const data = await regularResponse.json();
    const content = data.choices?.[0]?.message?.content;
    console.log("[DeepSearch Fallback] Got response from gpt-4o, length:", content?.length || 0);
    return content || null;
  } catch (error) {
    console.error("[DeepSearch Fallback] Failed:", error);
    return null;
  }
}

// ============================================================================
// AUTO-TRIGGER CHECK
// ============================================================================

/**
 * Determines if Deep Search should auto-run for a Person Context
 * Based on relationship type and user notes
 */
export function shouldAutoTriggerDeepSearch(personContext: PersonContext): boolean {
  // Auto-trigger for dating and new relationships where verification helps
  const autoTriggerRelationships = ["dating", "romantic", "other"];

  if (!autoTriggerRelationships.includes(personContext.relationshipContext)) {
    return false;
  }

  // Check if user has uncertainty in their notes - safely handle undefined
  const notesText = (personContext.notes || [])
    .map((n) => n?.content || "")
    .join(" ")
    .toLowerCase();
  const uncertaintyIndicators = [
    "not sure",
    "unsure",
    "wondering",
    "don't know",
    "seems off",
    "feels off",
    "confused",
    "questioning",
    "verify",
    "check",
  ];

  return uncertaintyIndicators.some((indicator) => notesText.includes(indicator));
}

// ============================================================================
// DEEP SEARCH TRIGGER FROM CHAT
// ============================================================================

/**
 * Detects if a user message is requesting a Deep Search
 */
export function isDeepSearchRequest(message: string): boolean {
  const lowerMessage = message.toLowerCase();

  const searchTriggers = [
    "search for",
    "look up",
    "find out about",
    "find information",
    "what can you find",
    "do a deep search",
    "run a search",
    "search online",
    "check their",
    "check his",
    "check her",
    "look them up",
    "look him up",
    "look her up",
    "what's out there",
    "what is out there",
    "public information",
    "online presence",
  ];

  return searchTriggers.some((trigger) => lowerMessage.includes(trigger));
}

// ============================================================================
// RESULT FORMATTING FOR CHAT
// ============================================================================

/**
 * Formats Deep Search results for display in chat
 */
export function formatDeepSearchForChat(result: DeepSearchResult): string {
  let output = "";

  // Summary
  output += result.summary + "\n\n";

  // Sources
  if (result.sources.length > 0) {
    output += "**What I found:**\n";
    for (const source of result.sources) {
      output += `\n**${source.platform}** (${source.type})\n`;
      output += source.summary + "\n";
      if (source.relevantDetails.length > 0) {
        for (const detail of source.relevantDetails) {
          output += `• ${detail}\n`;
        }
      }
      if (!source.isVerified) {
        output += "_Note: Could not verify this is the same person_\n";
      }
    }
  }

  // Alignment
  if (result.alignmentNotes.length > 0) {
    output += "\n**Aligns with what you shared:**\n";
    for (const note of result.alignmentNotes) {
      output += `• ${note}\n`;
    }
  }

  // Uncertainties
  if (result.uncertainties.length > 0) {
    output += "\n**Could not verify:**\n";
    for (const note of result.uncertainties) {
      output += `• ${note}\n`;
    }
  }

  return output;
}

// ============================================================================
// DEEP DIVE RESULT EVALUATION - Collaborative Trust Flow
// ============================================================================

import { DeepDiveResultQuality } from "../types/chat";

/**
 * Evaluation result for deep dive search
 * Used to determine if AI should ask for more info
 */
export interface DeepDiveEvaluation {
  quality: DeepDiveResultQuality;
  sourcesCount: number;
  verifiedSourcesCount: number;
  acknowledgmentText: string;
  suggestFollowUp: boolean;
  followUpReason?: string;
  missingDataTypes: string[];
  confidence: number; // 0-100
}

/**
 * Data types that can improve search results
 */
const HELPFUL_DATA_TYPES = [
  { type: "username", weight: 5, label: "username or social handle" },
  { type: "location", weight: 4, label: "location" },
  { type: "workplace", weight: 3, label: "workplace" },
  { type: "school", weight: 2, label: "school" },
  { type: "age", weight: 1, label: "age range" },
];

/**
 * Evaluates deep dive results and generates collaborative response
 * This is the core of the trust-building flow - being transparent about results
 */
export function evaluateDeepDiveResults(
  result: DeepSearchResult,
  personContext: PersonContext,
  verifiedSourcesCount: number = 0
): DeepDiveEvaluation {
  const sourcesCount = result.sources.length;
  const hasUrls = result.sources.filter(s => s.url).length;
  const uniqueCategories = new Set(result.sources.map(s => s.type)).size;

  // Determine result quality
  let quality: DeepDiveResultQuality;
  let confidence: number;

  if (sourcesCount === 0) {
    quality = "no_results";
    confidence = 0;
  } else if (hasUrls >= 4 && uniqueCategories >= 3) {
    quality = "strong";
    confidence = 85;
  } else if (hasUrls >= 2 && uniqueCategories >= 2) {
    quality = "moderate";
    confidence = 60;
  } else {
    quality = "weak";
    confidence = 30;
  }

  // Determine what data is missing that could help
  const missingDataTypes: string[] = [];

  // Check what data we have vs what could help
  const hasUsername = !!(personContext.knownUsername || personContext.extendedContext?.knownAliases?.length);
  const hasLocation = !!personContext.location;
  const hasWorkplace = !!personContext.extendedContext?.professionalInfo;
  const hasAge = !!personContext.approximateAge;

  if (!hasUsername) missingDataTypes.push("username");
  if (!hasLocation) missingDataTypes.push("location");
  if (!hasWorkplace && quality !== "strong") missingDataTypes.push("workplace");
  if (!hasAge && quality === "weak") missingDataTypes.push("age");

  // Generate acknowledgment text based on quality
  const personName = personContext.name;
  let acknowledgmentText: string;
  let suggestFollowUp = false;
  let followUpReason: string | undefined;

  switch (quality) {
    case "strong":
      acknowledgmentText = `I found solid information on ${personName}. Here's what I discovered across ${uniqueCategories} different sources.`;
      suggestFollowUp = false;
      break;

    case "moderate":
      acknowledgmentText = `I found some information on ${personName}, but the results are limited. I could find more with additional details.`;
      suggestFollowUp = missingDataTypes.length > 0;
      followUpReason = missingDataTypes.length > 0
        ? "Having more context often helps narrow down the right person and find additional profiles."
        : undefined;
      break;

    case "weak":
      acknowledgmentText = `I found very little on ${personName}. This happens when someone has a common name or limited online presence.`;
      suggestFollowUp = true;
      followUpReason = "A few more details would help me search more effectively and rule out false matches.";
      break;

    case "no_results":
      acknowledgmentText = `I was not able to find public information on ${personName}. This could mean they use a different name online, have private accounts, or have minimal digital footprint.`;
      suggestFollowUp = true;
      followUpReason = "If you have any other details—even partial ones—I can try a more targeted search.";
      break;
  }

  return {
    quality,
    sourcesCount,
    verifiedSourcesCount,
    acknowledgmentText,
    suggestFollowUp,
    followUpReason,
    missingDataTypes,
    confidence,
  };
}

/**
 * Determines the best follow-up question to ask based on what's missing
 */
export function getBestFollowUpQuestion(
  missingDataTypes: string[],
  personContext: PersonContext
): { dataType: string; question: string; placeholder: string } | null {
  if (missingDataTypes.length === 0) return null;

  // Prioritize by how helpful each data type is
  const prioritized = missingDataTypes.sort((a, b) => {
    const aWeight = HELPFUL_DATA_TYPES.find(d => d.type === a)?.weight || 0;
    const bWeight = HELPFUL_DATA_TYPES.find(d => d.type === b)?.weight || 0;
    return bWeight - aWeight;
  });

  const bestType = prioritized[0];
  const personName = personContext.name;

  // Generate context-aware question
  const questions: Record<string, { question: string; placeholder: string }> = {
    username: {
      question: `Do you know any usernames or handles ${personName} uses online?`,
      placeholder: "e.g., @johndoe, john_doe123",
    },
    location: {
      question: `Do you know where ${personName} lives or is from?`,
      placeholder: "e.g., Los Angeles, CA or Chicago area",
    },
    workplace: {
      question: `Do you know where ${personName} works or what they do?`,
      placeholder: "e.g., works at Google, is a nurse",
    },
    school: {
      question: `Do you know what school ${personName} went to?`,
      placeholder: "e.g., UCLA, graduated 2020",
    },
    age: {
      question: `Do you have an idea of ${personName}'s age?`,
      placeholder: "e.g., mid 20s, around 35",
    },
  };

  return {
    dataType: bestType,
    ...questions[bestType] || {
      question: `Is there anything else you know about ${personName}?`,
      placeholder: "Any detail helps...",
    },
  };
}

/**
 * Generates a re-search with additional context provided by user
 */
export async function executeDeepDiveWithAdditionalInfo(
  personContext: PersonContext,
  additionalInfo: { dataType: string; value: string },
  verifiedSources: DeepSearchSource[],
  onProgress?: (status: string) => void
): Promise<DeepSearchResponse> {
  // Merge additional info into person context for search
  const enrichedContext: PersonContext = {
    ...personContext,
    extendedContext: { ...personContext.extendedContext },
  };

  switch (additionalInfo.dataType) {
    case "username":
      enrichedContext.knownUsername = additionalInfo.value;
      if (!enrichedContext.extendedContext) enrichedContext.extendedContext = {};
      if (!enrichedContext.extendedContext.knownAliases) enrichedContext.extendedContext.knownAliases = [];
      enrichedContext.extendedContext.knownAliases.push(additionalInfo.value);
      break;
    case "location":
      enrichedContext.location = additionalInfo.value;
      break;
    case "workplace":
      if (!enrichedContext.extendedContext) enrichedContext.extendedContext = {};
      enrichedContext.extendedContext.professionalInfo = additionalInfo.value;
      break;
    case "school":
      // Add to professional info
      if (!enrichedContext.extendedContext) enrichedContext.extendedContext = {};
      enrichedContext.extendedContext.professionalInfo = enrichedContext.extendedContext.professionalInfo
        ? `${enrichedContext.extendedContext.professionalInfo}, ${additionalInfo.value}`
        : additionalInfo.value;
      break;
    case "age":
      enrichedContext.approximateAge = additionalInfo.value;
      break;
  }

  onProgress?.(`Searching with ${additionalInfo.dataType}: ${additionalInfo.value}...`);

  // Execute enhanced deep dive with the new info
  return executeDeepDiveSearch({
    personContext: enrichedContext,
    verifiedSources,
    onProgress,
  });
}
