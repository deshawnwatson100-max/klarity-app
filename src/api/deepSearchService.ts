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
} from "./deepSearch";
import { DeepSearchLogger, detectIdentityAmbiguity } from "./deepSearchLogger";

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
  ARCHIVED_CACHED = 7,        // Pass 7: archived/cached pages
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
 * 7. ARCHIVED_CACHED - Archive.org and cached pages
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
    description: "Dating platforms, profile mirrors, and caches",
    generateQueries: (input) => {
      const queries: string[] = [];
      const { name, location, username, anchor, ageRange } = input;
      if (!name) return queries;

      // Dating platforms individually
      queries.push(`"${name}" tinder`);
      queries.push(`"${name}" bumble`);
      queries.push(`"${name}" hinge`);
      queries.push(`"${name}" okcupid`);
      queries.push(`"${name}" match.com`);
      queries.push(`"${name}" plenty of fish`);
      queries.push(`"${name}" dating profile`);

      // Specific dating app anchor
      if (anchor?.type === "dating_app" && anchor.value) {
        queries.push(`"${name}" ${anchor.value}`);
        queries.push(`"${name}" ${anchor.value} profile`);
      }

      // Dating + location
      if (location) {
        queries.push(`"${name}" ${location} dating`);
        queries.push(`"${name}" ${location} tinder`);
      }

      // Dating + age
      if (ageRange) {
        queries.push(`"${name}" ${ageRange} dating`);
      }

      // Profile mirrors and aggregators
      queries.push(`"${name}" dating profile screenshot`);
      queries.push(`"${name}" profile screenshot`);

      // Username on dating
      if (username) {
        const cleanUsername = username.replace(/^@/, "");
        queries.push(`${cleanUsername} dating`);
        queries.push(`${cleanUsername} tinder`);
      }

      return queries;
    },
  },
  {
    pass: SearchPass.LEGAL_RECORDS,
    name: "Legal & Public Records",
    description: "Court records, arrests, and public filings",
    generateQueries: (input) => {
      const queries: string[] = [];
      const { name, location, county } = input;
      if (!name) return queries;

      // General legal searches
      queries.push(`"${name}" court case`);
      queries.push(`"${name}" lawsuit`);
      queries.push(`"${name}" arrest`);
      queries.push(`"${name}" criminal record`);
      queries.push(`"${name}" mugshot`);

      // Court record sites
      queries.push(`"${name}" site:courtlistener.com`);
      queries.push(`"${name}" site:unicourt.com`);
      queries.push(`"${name}" site:judyrecords.com`);

      // County-specific
      if (county) {
        queries.push(`"${name}" ${county} court`);
        queries.push(`"${name}" ${county} arrest`);
        queries.push(`"${name}" ${county} case`);
        queries.push(`"${name}" ${county} inmate`);
      }

      // State-level (extract state from location)
      if (location) {
        queries.push(`"${name}" ${location} court records`);
        queries.push(`"${name}" ${location} arrest records`);
      }

      // Government sites
      queries.push(`"${name}" site:gov`);

      // Business records
      queries.push(`"${name}" business license`);
      queries.push(`"${name}" LLC`);
      queries.push(`"${name}" corporation`);

      return queries;
    },
  },
  {
    pass: SearchPass.ARCHIVED_CACHED,
    name: "Archived & Cached",
    description: "Wayback Machine, cached pages, and deleted content",
    generateQueries: (input) => {
      const queries: string[] = [];
      const { name, username } = input;
      if (!name) return queries;

      // Archive.org
      queries.push(`"${name}" site:web.archive.org`);

      // Cached pages
      queries.push(`"${name}" cached`);
      queries.push(`"${name}" cache:`);

      // Deleted content signals
      queries.push(`"${name}" deleted profile`);
      queries.push(`"${name}" old profile`);
      queries.push(`"${name}" previous account`);

      // Username archives
      if (username) {
        const cleanUsername = username.replace(/^@/, "");
        queries.push(`${cleanUsername} site:web.archive.org`);
        queries.push(`${cleanUsername} cached`);
        queries.push(`${cleanUsername} deleted`);

        // Also search username variations in archives
        const variations = generateUsernameVariations(username);
        for (const v of variations.slice(0, 3)) {
          queries.push(`${v.username} site:web.archive.org`);
        }
      }

      // Alternative archive sites
      queries.push(`"${name}" site:archive.is`);
      queries.push(`"${name}" site:archive.ph`);

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

    // Execute search for this pass
    const passResponse = await callPassSearch(uniqueQueries, input.name);

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

  console.log(`[MultiPass] Complete. Passes: ${passResults.length}, Sources: ${accumulatedSources.length}, Stopped early: ${stoppedEarly}`);
  console.log(`[MultiPass] Categorized results:`, categorizedStats.byCategory);

  return {
    finalResult,
    categorizedResults,
    categorizedStats,
    passesExecuted: passResults.length,
    passResults,
    stoppedEarly,
    stopReason,
  };
}

/**
 * Executes a single pass search with the given queries
 */
async function callPassSearch(queries: string[], personName: string): Promise<string | null> {
  const apiKey = process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY;
  if (!apiKey) return null;

  const prompt = `Search for "${personName}" using these specific queries: ${queries.join(", ")}

For each query, search and report what you find. Include:
- Platform/source name
- Direct URL if found
- Brief description of what was found

Be thorough but concise. Only report actual findings, not speculation.`;

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
            content: "You are a research assistant that searches the web for publicly available information. Report only what you actually find through web search. Include URLs when available.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        web_search_options: {
          search_context_size: "high",
        },
      }),
    });

    if (!response.ok) {
      console.log(`[PassSearch] API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error("[PassSearch] Error:", error);
    return null;
  }
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
 */
async function callDeepSearchLLM(params: LLMCallParams): Promise<string | null> {
  const { systemPrompt, developerPrompt, userPrompt, searchQueries } = params;

  const apiKey = process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY;

  if (!apiKey) {
    console.error("Missing OpenAI API key");
    return null;
  }

  console.log("[DeepSearch] Starting search with queries:", searchQueries.slice(0, 5));

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
        instructions: `${systemPrompt}\n\n${developerPrompt}`,
        input: `${userPrompt}\n\nSearch queries to use: ${searchQueries.join(", ")}`,
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
 */
async function callDeepSearchLLMFallback(params: LLMCallParams): Promise<string | null> {
  const { systemPrompt, developerPrompt, userPrompt, searchQueries } = params;

  const apiKey = process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  console.log("[DeepSearch Fallback] Attempting with gpt-4o-search-preview...");

  try {
    const messages = [
      {
        role: "system",
        content: `${systemPrompt}\n\nIMPORTANT: You must search the internet to find real, current information about this person. Do not make up or hallucinate any information. Only report what you can actually find through web search. Include actual URLs to profiles you discover.`,
      },
      {
        role: "user",
        content: `${userPrompt}\n\nSearch queries to use: ${searchQueries.join(", ")}\n\nPlease search the web for this person and report what you find. Include actual URLs to profiles you discover.`,
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
