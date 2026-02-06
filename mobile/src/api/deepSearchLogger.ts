/**
 * Deep Search Logger
 *
 * Internal developer logging for Deep Search runs.
 * Records comprehensive data for debugging and analysis.
 * NOT user-facing.
 */

import { PersonContext } from "../types/personContext";
import { SearchCategory, SEARCH_CATEGORIES, DeepSearchResult } from "./deepSearch";

// ============================================================================
// LOG TYPES
// ============================================================================

export interface DeepSearchLogEntry {
  // Core identifiers
  logId: string;
  personId: string;
  timestamp: string;

  // Inputs
  inputs: {
    name: string;
    location?: string;
    username?: string;
    anchorType?: "workplace" | "school" | "dating_app" | "username";
    anchorValue?: string;
    relationshipContext: string;
    hasExtendedContext: boolean;
    extendedContextFields?: string[];
  };

  // Query execution
  queries: {
    total: number;
    list: string[];
  };

  // Categories attempted/found
  categories: {
    attempted: SearchCategory[];
    resultsPerCategory: Record<SearchCategory, number>;
  };

  // Results
  results: {
    totalSources: number;
    sourcesByType: Record<string, number>;
    hasUrls: boolean;
    urlCount: number;
  };

  // Identity ambiguity
  identityAmbiguity: {
    detected: boolean;
    signals?: string[];
  };

  // Performance
  performance: {
    startTime: number;
    endTime?: number;
    durationMs?: number;
  };

  // Errors
  error?: {
    message: string;
    stage: "safety_check" | "query_build" | "api_call" | "parsing" | "unknown";
  };

  // Safety
  safetyBlocked: boolean;
  safetyReason?: string;
}

// ============================================================================
// IN-MEMORY LOG STORAGE (for development)
// ============================================================================

const MAX_LOGS = 50; // Keep last 50 logs in memory
const deepSearchLogs: DeepSearchLogEntry[] = [];

// ============================================================================
// LOGGER CLASS
// ============================================================================

export class DeepSearchLogger {
  private entry: Partial<DeepSearchLogEntry>;

  constructor(personId: string) {
    this.entry = {
      logId: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      personId,
      timestamp: new Date().toISOString(),
      performance: {
        startTime: Date.now(),
      },
      categories: {
        attempted: [],
        resultsPerCategory: {} as Record<SearchCategory, number>,
      },
      results: {
        totalSources: 0,
        sourcesByType: {},
        hasUrls: false,
        urlCount: 0,
      },
      identityAmbiguity: {
        detected: false,
      },
      safetyBlocked: false,
    };
  }

  /**
   * Log the input context from PersonContext
   */
  logInputs(personContext: PersonContext): void {
    const extendedFields: string[] = [];
    const ext = personContext.extendedContext;

    if (ext) {
      if (ext.countyOrRegion) extendedFields.push("countyOrRegion");
      if (ext.middleNameOrInitial) extendedFields.push("middleNameOrInitial");
      if (ext.previousLocation) extendedFields.push("previousLocation");
      if (ext.professionalInfo) extendedFields.push("professionalInfo");
      if (ext.knownAliases?.length) extendedFields.push("knownAliases");
    }

    this.entry.inputs = {
      name: personContext.name || "[empty]",
      location: personContext.location,
      username: personContext.knownUsername,
      anchorType: personContext.contextAnchor?.type,
      anchorValue: personContext.contextAnchor?.value,
      relationshipContext: personContext.relationshipContext,
      hasExtendedContext: extendedFields.length > 0,
      extendedContextFields: extendedFields.length > 0 ? extendedFields : undefined,
    };

    console.log("[DeepSearch Log] Inputs:", JSON.stringify(this.entry.inputs, null, 2));
  }

  /**
   * Log the search queries that will be executed
   */
  logQueries(queries: string[]): void {
    this.entry.queries = {
      total: queries.length,
      list: queries,
    };

    // Determine which categories are being attempted based on query content
    const attempted: SearchCategory[] = [];
    const queryText = queries.join(" ").toLowerCase();

    if (queryText.includes("dating") || queryText.includes("tinder") || queryText.includes("bumble") || queryText.includes("hinge")) {
      attempted.push(SEARCH_CATEGORIES.DATING);
    }
    if (queryText.includes("linkedin") || queryText.includes("instagram") || queryText.includes("facebook") || queryText.includes("twitter") || queryText.includes("tiktok") || queryText.includes("reddit")) {
      attempted.push(SEARCH_CATEGORIES.SOCIAL_MEDIA);
    }
    if (queryText.includes("court") || queryText.includes("arrest") || queryText.includes(".gov") || queryText.includes("lawsuit")) {
      attempted.push(SEARCH_CATEGORIES.LEGAL_PUBLIC_RECORDS);
    }
    if (queryText.includes("business") || queryText.includes("professional") || queryText.includes("company")) {
      attempted.push(SEARCH_CATEGORIES.PROFESSIONAL);
    }
    if (queryText.includes("@") || queryText.includes("username")) {
      attempted.push(SEARCH_CATEGORIES.USERNAME_ALIAS);
    }
    if (queryText.includes("medium") || queryText.includes("quora") || queryText.includes("blog")) {
      attempted.push(SEARCH_CATEGORIES.PUBLIC_WRITING);
    }
    if (queryText.includes("archive.org")) {
      attempted.push(SEARCH_CATEGORIES.ARCHIVED_CACHED);
    }

    // Always attempt these if we have location
    if (this.entry.inputs?.location) {
      attempted.push(SEARCH_CATEGORIES.LOCATION_HISTORY);
    }

    this.entry.categories = {
      ...this.entry.categories!,
      attempted,
    };

    console.log("[DeepSearch Log] Queries:", {
      total: queries.length,
      categoriesAttempted: attempted,
      sampleQueries: queries.slice(0, 5),
    });
  }

  /**
   * Log the results from parsing
   */
  logResults(result: DeepSearchResult): void {
    const sourcesByType: Record<string, number> = {};
    const resultsPerCategory: Record<SearchCategory, number> = {
      [SEARCH_CATEGORIES.DATING]: 0,
      [SEARCH_CATEGORIES.SOCIAL_MEDIA]: 0,
      [SEARCH_CATEGORIES.LEGAL_PUBLIC_RECORDS]: 0,
      [SEARCH_CATEGORIES.PROFESSIONAL]: 0,
      [SEARCH_CATEGORIES.USERNAME_ALIAS]: 0,
      [SEARCH_CATEGORIES.IMAGES_VISUAL]: 0,
      [SEARCH_CATEGORIES.PUBLIC_WRITING]: 0,
      [SEARCH_CATEGORIES.LOCATION_HISTORY]: 0,
      [SEARCH_CATEGORIES.ARCHIVED_CACHED]: 0,
    };

    let urlCount = 0;

    for (const source of result.sources) {
      // Count by type
      sourcesByType[source.type] = (sourcesByType[source.type] || 0) + 1;

      // Map to search category
      const categoryMap: Record<string, SearchCategory> = {
        social: SEARCH_CATEGORIES.SOCIAL_MEDIA,
        professional: SEARCH_CATEGORIES.PROFESSIONAL,
        dating: SEARCH_CATEGORIES.DATING,
        legal: SEARCH_CATEGORIES.LEGAL_PUBLIC_RECORDS,
        username: SEARCH_CATEGORIES.USERNAME_ALIAS,
        images: SEARCH_CATEGORIES.IMAGES_VISUAL,
        writing: SEARCH_CATEGORIES.PUBLIC_WRITING,
        location: SEARCH_CATEGORIES.LOCATION_HISTORY,
        archived: SEARCH_CATEGORIES.ARCHIVED_CACHED,
      };

      const category = categoryMap[source.type];
      if (category) {
        resultsPerCategory[category]++;
      }

      if (source.url) {
        urlCount++;
      }
    }

    this.entry.results = {
      totalSources: result.sources.length,
      sourcesByType,
      hasUrls: urlCount > 0,
      urlCount,
    };

    this.entry.categories = {
      ...this.entry.categories!,
      resultsPerCategory,
    };

    console.log("[DeepSearch Log] Results:", {
      totalSources: result.sources.length,
      urlCount,
      sourcesByType,
      resultsPerCategory,
    });
  }

  /**
   * Log identity ambiguity detection
   */
  logIdentityAmbiguity(detected: boolean, signals?: string[]): void {
    this.entry.identityAmbiguity = {
      detected,
      signals,
    };

    if (detected) {
      console.log("[DeepSearch Log] Identity ambiguity detected:", signals);
    }
  }

  /**
   * Log safety block
   */
  logSafetyBlock(reason: string): void {
    this.entry.safetyBlocked = true;
    this.entry.safetyReason = reason;

    console.log("[DeepSearch Log] Safety blocked:", reason);
  }

  /**
   * Log an error
   */
  logError(message: string, stage: "safety_check" | "query_build" | "api_call" | "parsing" | "unknown"): void {
    this.entry.error = {
      message,
      stage,
    };

    console.error("[DeepSearch Log] Error at", stage, ":", message);
  }

  /**
   * Finalize and store the log entry
   */
  finalize(): DeepSearchLogEntry {
    const endTime = Date.now();
    this.entry.performance = {
      ...this.entry.performance!,
      endTime,
      durationMs: endTime - this.entry.performance!.startTime,
    };

    const finalEntry = this.entry as DeepSearchLogEntry;

    // Store in memory
    deepSearchLogs.push(finalEntry);
    if (deepSearchLogs.length > MAX_LOGS) {
      deepSearchLogs.shift();
    }

    // Log final summary
    console.log("[DeepSearch Log] === FINAL SUMMARY ===");
    console.log("[DeepSearch Log] Log ID:", finalEntry.logId);
    console.log("[DeepSearch Log] Person ID:", finalEntry.personId);
    console.log("[DeepSearch Log] Duration:", finalEntry.performance.durationMs, "ms");
    console.log("[DeepSearch Log] Queries executed:", finalEntry.queries?.total || 0);
    console.log("[DeepSearch Log] Total results:", finalEntry.results?.totalSources || 0);
    console.log("[DeepSearch Log] URLs found:", finalEntry.results?.urlCount || 0);
    console.log("[DeepSearch Log] Safety blocked:", finalEntry.safetyBlocked);
    console.log("[DeepSearch Log] Has error:", !!finalEntry.error);
    console.log("[DeepSearch Log] ======================");

    return finalEntry;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get all stored logs (for debugging)
 */
export function getDeepSearchLogs(): DeepSearchLogEntry[] {
  return [...deepSearchLogs];
}

/**
 * Get the most recent log entry
 */
export function getLastDeepSearchLog(): DeepSearchLogEntry | undefined {
  return deepSearchLogs[deepSearchLogs.length - 1];
}

/**
 * Clear all stored logs
 */
export function clearDeepSearchLogs(): void {
  deepSearchLogs.length = 0;
}

/**
 * Check for identity ambiguity signals in response
 */
export function detectIdentityAmbiguity(rawResponse: string): { detected: boolean; signals: string[] } {
  const signals: string[] = [];
  const lowerResponse = rawResponse.toLowerCase();

  // Check for common ambiguity phrases
  const ambiguityPhrases = [
    { pattern: /possible match/gi, signal: "Possible match mentioned" },
    { pattern: /may not be the same person/gi, signal: "May not be same person" },
    { pattern: /could not verify/gi, signal: "Could not verify identity" },
    { pattern: /unclear if this is/gi, signal: "Unclear identification" },
    { pattern: /multiple people with/gi, signal: "Multiple people found" },
    { pattern: /common name/gi, signal: "Common name noted" },
    { pattern: /several results/gi, signal: "Several results for name" },
    { pattern: /different person/gi, signal: "Different person mentioned" },
    { pattern: /not confirmed/gi, signal: "Not confirmed" },
    { pattern: /unverified/gi, signal: "Unverified results" },
  ];

  for (const { pattern, signal } of ambiguityPhrases) {
    if (pattern.test(lowerResponse)) {
      signals.push(signal);
    }
  }

  return {
    detected: signals.length > 0,
    signals,
  };
}

/**
 * Format log entry for console output
 */
export function formatLogForConsole(entry: DeepSearchLogEntry): string {
  return `
=== Deep Search Log ===
Log ID: ${entry.logId}
Person ID: ${entry.personId}
Timestamp: ${entry.timestamp}

INPUTS:
  Name: ${entry.inputs.name}
  Location: ${entry.inputs.location || "N/A"}
  Username: ${entry.inputs.username || "N/A"}
  Anchor: ${entry.inputs.anchorType ? `${entry.inputs.anchorType}: ${entry.inputs.anchorValue}` : "N/A"}
  Relationship: ${entry.inputs.relationshipContext}
  Extended context: ${entry.inputs.hasExtendedContext ? entry.inputs.extendedContextFields?.join(", ") : "None"}

QUERIES:
  Total: ${entry.queries.total}
  Sample: ${entry.queries.list.slice(0, 3).join(", ")}...

CATEGORIES ATTEMPTED:
  ${entry.categories.attempted.join(", ") || "None"}

RESULTS PER CATEGORY:
${Object.entries(entry.categories.resultsPerCategory)
    .filter(([_, count]) => count > 0)
    .map(([cat, count]) => `  ${cat}: ${count}`)
    .join("\n") || "  No results"}

RESULTS SUMMARY:
  Total sources: ${entry.results.totalSources}
  URLs found: ${entry.results.urlCount}
  By type: ${JSON.stringify(entry.results.sourcesByType)}

IDENTITY AMBIGUITY:
  Detected: ${entry.identityAmbiguity.detected}
  ${entry.identityAmbiguity.signals?.length ? `Signals: ${entry.identityAmbiguity.signals.join(", ")}` : ""}

PERFORMANCE:
  Duration: ${entry.performance.durationMs}ms

${entry.safetyBlocked ? `SAFETY BLOCKED: ${entry.safetyReason}` : ""}
${entry.error ? `ERROR: [${entry.error.stage}] ${entry.error.message}` : ""}
=======================
`;
}
