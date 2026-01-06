/**
 * Deep Search Service
 *
 * Orchestrates the Deep Search flow - triggered when Person Context is created
 * or when user explicitly requests a search in the chat loop.
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
  NO_RESULTS_RESPONSE,
  SearchCategory,
} from "./deepSearch";

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

  try {
    // Step 1: Safety check
    onProgress?.("Checking safety...");
    const safetyCheck = checkDeepSearchSafety(personContext);

    if (!safetyCheck.isSafe) {
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
      return {
        success: true,
        result: parseDeepSearchResponse(
          NO_RESULTS_RESPONSE,
          personContext.id,
          searchQueries.join(", ")
        ),
      };
    }

    // Step 5: Parse the response
    onProgress?.("Processing results...");
    const result = parseDeepSearchResponse(
      response,
      personContext.id,
      searchQueries.join(", ")
    );

    return {
      success: true,
      result,
    };
  } catch (error) {
    console.error("Deep Search error:", error);
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
