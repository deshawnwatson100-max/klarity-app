/**
 * Deep Search Service
 *
 * Orchestrates the Deep Search flow - triggered when Person Context is created
 * or when user explicitly requests a search in the chat loop.
 *
 * Uses a multi-pass search strategy that continues until strong results are found
 * or all passes are exhausted.
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

4. LOGGING: For each search you perform, mentally track:
   - Search #1: [query] -> [result summary]
   - Search #2: [query] -> [result summary]
   - ... continue until you have completed at least ${MIN_SEARCHES_REQUIRED} searches

5. DO NOT:
   - Stop after 1-3 searches
   - Claim you "searched comprehensively" without actually doing multiple searches
   - Skip platform-targeted searches
   - Return results without executing the minimum required searches

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
 * Search passes executed in order. Each pass focuses on specific query types.
 * The search continues until strong results are found or all passes complete.
 *
 * IMPORTANT: If a username is provided, USERNAME_FIRST runs as Pass 1 (highest priority).
 * This ensures username-based discovery happens early, not as an afterthought.
 */
export enum SearchPass {
  USERNAME_FIRST = 1,         // Pass 1: Username-first (runs early if username exists)
  NAME_LOCATION = 2,          // Pass 2: name + location
  PLATFORM_TARGETED = 3,      // Pass 3: social + professional site: queries
  USERNAME_EXPANDED = 4,      // Pass 4: username variations + additional platforms
  DATING_MIRRORS = 5,         // Pass 5: dating keywords + mirrors/caches
  LEGAL_RECORDS = 6,          // Pass 6: legal/public records portal discovery
  IMAGES_VISUAL = 7,          // Pass 7: images & visual footprint
  ARCHIVED_CACHED = 8,        // Pass 8: archived/cached pages
}

export interface PassConfig {
  pass: SearchPass;
  name: string;
  description: string;
  requiresUsername?: boolean; // If true, skip if no username
  generateQueries: (input: QueryGeneratorInput) => string[];
}

/**
 * Configuration for each search pass
 *
 * Pass order is critical:
 * 1. USERNAME_FIRST - If username exists, search it immediately
 * 2. NAME_LOCATION - Basic name + location
 * 3. PLATFORM_TARGETED - site: queries for social/professional
 * 4. USERNAME_EXPANDED - Username variations and additional platforms
 * 5. DATING_MIRRORS - Dating-focused
 * 6. LEGAL_RECORDS - Court and public records
 * 7. IMAGES_VISUAL - Images & visual footprint
 * 8. ARCHIVED_CACHED - Archive.org and cached pages
 */
const PASS_CONFIGS: PassConfig[] = [
  {
    pass: SearchPass.USERNAME_FIRST,
    name: "Username First",
    description: "Priority username search with variations - runs early",
    requiresUsername: true,
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
    pass: SearchPass.NAME_LOCATION,
    name: "Name + Location",
    description: "Basic name and location combinations",
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
    generateQueries: (input) => {
      const { name, location, username, anchor } = input;
      if (!name) return [];

      // Use the centralized platform query generators
      const queries: string[] = [];

      // Social platforms (Instagram, Facebook, Twitter/X, TikTok, Reddit)
      queries.push(...generateSocialPlatformQueries(name, username, location));

      // Professional platforms (LinkedIn, GitHub, Behance, Dribbble)
      queries.push(...generateProfessionalPlatformQueries(name, username, location));

      // Public writing platforms (Medium, Substack, Quora, WordPress, Blogger)
      queries.push(...generateWritingPlatformQueries(name, username));

      // Professional anchors (additional queries)
      if (anchor?.type === "workplace" && anchor.value) {
        queries.push(`"${name}" ${anchor.value}`);
        queries.push(`"${name}" ${anchor.value} site:linkedin.com`);
      }
      if (anchor?.type === "school" && anchor.value) {
        queries.push(`"${name}" ${anchor.value}`);
        queries.push(`"${name}" ${anchor.value} alumni`);
        queries.push(`"${name}" ${anchor.value} site:linkedin.com`);
      }

      // De-duplicate
      return [...new Set(queries)];
    },
  },
  {
    pass: SearchPass.USERNAME_EXPANDED,
    name: "Username Expanded",
    description: "Username variations and additional platform searches",
    requiresUsername: true,
    generateQueries: (input) => {
      const queries: string[] = [];
      const { username, aliases, anchor } = input;

      // Collect all usernames to expand
      const usernamesToSearch: string[] = [];

      if (username) {
        usernamesToSearch.push(username);
      }
      if (anchor?.type === "username" && anchor.value) {
        const anchorUsername = anchor.value.replace(/^@/, "");
        if (!usernamesToSearch.includes(anchorUsername)) {
          usernamesToSearch.push(anchorUsername);
        }
      }
      if (aliases?.length) {
        for (const alias of aliases.slice(0, 3)) {
          const cleanAlias = alias.replace(/^@/, "");
          if (!usernamesToSearch.includes(cleanAlias)) {
            usernamesToSearch.push(cleanAlias);
          }
        }
      }

      // For each username, generate variations and search additional platforms
      for (const u of usernamesToSearch) {
        const variations = generateUsernameVariations(u);

        // Additional niche platforms not covered in USERNAME_FIRST
        const nichePlatforms = [
          "medium.com",
          "quora.com",
          "tumblr.com",
          "soundcloud.com",
          "spotify.com",
          "venmo.com",
          "cashapp.com",
          "discord.com",
          "telegram.org",
        ];

        // Search variations on niche platforms
        for (const variation of variations.slice(0, 5)) {
          for (const platform of nichePlatforms) {
            queries.push(`${variation.username} site:${platform}`);
          }
        }

        // Dating platforms with username
        queries.push(`${u} dating profile`);
        queries.push(`${u} tinder`);
        queries.push(`${u} bumble`);
      }

      // De-duplicate
      return [...new Set(queries)];
    },
  },
  {
    pass: SearchPass.DATING_MIRRORS,
    name: "Dating & Mirrors",
    description: "Dating platforms, profile mirrors, caches, and indirect mentions",
    generateQueries: (input) => {
      const queries: string[] = [];
      const { name, location, username, anchor, ageRange } = input;
      if (!name) return queries;

      // Use the comprehensive dating query generator
      queries.push(...generateDatingQueries(name, location, username));

      // Specific dating app anchor gets priority searches
      if (anchor?.type === "dating_app" && anchor.value) {
        queries.push(`"${name}" ${anchor.value}`);
        queries.push(`"${name}" ${anchor.value} profile`);
        queries.push(`"${name}" ${anchor.value} bio`);
        queries.push(`"${name}" met on ${anchor.value}`);
      }

      // Dating + age (age-targeted dating searches)
      if (ageRange) {
        queries.push(`"${name}" ${ageRange} dating`);
        queries.push(`"${name}" ${ageRange} tinder`);
        queries.push(`"${name}" ${ageRange} bumble`);
      }

      // Add archive/cache queries for dating
      queries.push(...generateDatingArchiveQueries(name, username));

      // De-duplicate
      return [...new Set(queries)];
    },
  },
  {
    pass: SearchPass.LEGAL_RECORDS,
    name: "Legal & Public Records",
    description: "Court records, jail rosters, state DOC, and official portal discovery",
    generateQueries: (input) => {
      const { name, location, county, middleInitial, ageRange } = input;
      if (!name) return [];

      // Use the comprehensive legal portal query generator
      // This includes:
      // - County clerk / court case search
      // - State judiciary case lookup
      // - Jail roster / inmate search
      // - State DOC inmate lookup
      // - .gov domain preference
      const queries = generateLegalPortalQueries({
        name,
        location,
        county,
        middleInitial,
        ageRange,
      });

      return queries;
    },
  },
  {
    pass: SearchPass.IMAGES_VISUAL,
    name: "Images & Visual Footprint",
    description: "Profile photos, image search, visual presence across platforms",
    generateQueries: (input) => {
      const { name, location, username, professionalInfo } = input;
      if (!name) return [];

      // Use the comprehensive image search query generator
      // This includes:
      // - Direct name + image searches
      // - Name + location image searches
      // - Username image searches
      // - Platform-specific image searches (LinkedIn, Facebook, Instagram, etc.)
      // - Professional/news image searches
      // - Dating platform image searches
      // - Archive/cached image searches
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
    pass: SearchPass.ARCHIVED_CACHED,
    name: "Archived & Cached",
    description: "Wayback Machine, archive.is, cached pages, and deleted content",
    generateQueries: (input) => {
      const { name, location, username } = input;
      if (!name) return [];

      // Use the comprehensive archive search query generator
      // This covers:
      // - Wayback Machine searches (web.archive.org)
      // - Archive.is / Archive.ph searches
      // - General cached/archived page searches
      // - Platform-specific archive searches (social media, dating)
      const queries = generateArchiveSearchQueries({
        name,
        location,
        username,
        // Note: discoveredProfileUrls can be passed in from earlier passes
        // if we collect them during the search process
      });

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
}

export interface PassResult {
  pass: SearchPass;
  passName: string;
  queriesUsed: string[];
  sourcesFound: number;
  urlsFound: number;
  newSourcesAdded: number;
  resultStrength: ResultStrength;
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

      // Check if we should stop early
      if (strength.isStrong) {
        stoppedEarly = true;
        stopReason = `Strong results after Pass ${passNumber}: ${strength.reasons.join(", ")}`;
        console.log(`[MultiPass] Stopping early: ${stopReason}`);
        break;
      }
    } else {
      console.log(`[MultiPass] Pass ${passNumber} returned no response`);
      passResults.push({
        pass: passNumber,
        passName: passConfig.name,
        queriesUsed: uniqueQueries,
        sourcesFound: 0,
        urlsFound: 0,
        newSourcesAdded: 0,
        resultStrength: {
          isStrong: false,
          totalSources: accumulatedSources.length,
          urlCount: accumulatedSources.filter(s => s.url).length,
          categoriesCovered: new Set(accumulatedSources.map(s => s.type)).size,
          reasons: ["Pass returned no response"],
        },
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

  console.log(`[MultiPass] Complete. Passes: ${passResults.length}, Sources: ${accumulatedSources.length}, Stopped early: ${stoppedEarly}`);
  console.log(`[MultiPass] Categorized results:`, categorizedStats.byCategory);
  console.log(`[MultiPass] Legal portals found:`, legalPortals.length);
  console.log(`[MultiPass] Image results found:`, imageResults.length);
  console.log(`[MultiPass] Archived pages found:`, archivedPages.length);

  return {
    finalResult,
    categorizedResults,
    categorizedStats,
    passesExecuted: passResults.length,
    passResults,
    stoppedEarly,
    stopReason,
    legalPortals,
    imageResults,
    archivedPages,
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
DO NOT make up or hallucinate information - only report what you actually find.`,
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
// LLM CALL WITH WEB SEARCH
// ============================================================================

interface LLMCallParams {
  systemPrompt: string;
  developerPrompt: string;
  userPrompt: string;
  searchQueries: string[];
}

/**
 * Calls the OpenAI Responses API with web search capability
 * This uses the newer Responses API with built-in web_search tool
 * ENFORCES multi-search behavior through explicit instructions
 */
async function callDeepSearchLLM(params: LLMCallParams): Promise<string | null> {
  const { systemPrompt, developerPrompt, userPrompt, searchQueries } = params;

  const apiKey = process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY;

  if (!apiKey) {
    console.error("Missing OpenAI API key");
    return null;
  }

  // Build numbered query list for explicit multi-search enforcement
  const numberedQueries = searchQueries.slice(0, 20).map((q, i) => `${i + 1}. ${q}`).join("\n");

  console.log(`[DeepSearch] Starting search with ${searchQueries.length} queries (min required: ${MIN_SEARCHES_REQUIRED})`);
  console.log("[DeepSearch] Sample queries:", searchQueries.slice(0, 5));

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
