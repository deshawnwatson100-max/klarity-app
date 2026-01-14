/**
 * Perplexity API Client
 *
 * Perplexity provides AI-powered web search with real-time internet access.
 * It's optimized for research and information retrieval with built-in citations.
 *
 * Available models:
 * - sonar: Fast, cost-effective for general queries (~$0.005/search)
 * - sonar-pro: More thorough, better for complex research (~$0.01/search)
 *
 * Pricing (as of 2025):
 * - sonar: $1/1M input tokens, $1/1M output tokens + $5/1000 searches
 * - sonar-pro: $3/1M input tokens, $15/1M output tokens + $5/1000 searches
 */

export interface PerplexityMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface PerplexityCitation {
  url: string;
  title?: string;
  snippet?: string;
}

export interface PerplexityResponse {
  content: string;
  citations: PerplexityCitation[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface PerplexitySearchOptions {
  model?: "sonar" | "sonar-pro";
  temperature?: number;
  maxTokens?: number;
  searchDomainFilter?: string[]; // e.g., ["linkedin.com", "instagram.com"]
  searchRecency?: "day" | "week" | "month" | "year"; // Filter by recency
  returnImages?: boolean;
  returnRelatedQuestions?: boolean;
}

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";

/**
 * Get the Perplexity API key from environment
 */
const getPerplexityApiKey = (): string | null => {
  const apiKey = process.env.EXPO_PUBLIC_PERPLEXITY_API_KEY;
  if (!apiKey) {
    console.warn("[Perplexity] API key not found in environment variables");
    return null;
  }
  return apiKey;
};

/**
 * Check if Perplexity is configured
 */
export const isPerplexityConfigured = (): boolean => {
  return !!getPerplexityApiKey();
};

/**
 * Perform a web search using Perplexity AI
 *
 * @param query - The search query or question
 * @param options - Search configuration options
 * @returns Search results with AI summary and citations
 */
export const perplexitySearch = async (
  query: string,
  options: PerplexitySearchOptions = {}
): Promise<PerplexityResponse | null> => {
  const apiKey = getPerplexityApiKey();
  if (!apiKey) {
    console.error("[Perplexity] Cannot search - API key not configured");
    return null;
  }

  const {
    model = "sonar",
    temperature = 0.2,
    maxTokens = 2048,
    searchDomainFilter,
    searchRecency,
    returnImages = false,
    returnRelatedQuestions = false,
  } = options;

  const messages: PerplexityMessage[] = [
    {
      role: "system",
      content: "You are a helpful research assistant. Provide accurate, well-sourced information. Always cite your sources.",
    },
    {
      role: "user",
      content: query,
    },
  ];

  try {
    const requestBody: Record<string, unknown> = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      return_images: returnImages,
      return_related_questions: returnRelatedQuestions,
    };

    // Add optional filters if provided
    if (searchDomainFilter && searchDomainFilter.length > 0) {
      requestBody.search_domain_filter = searchDomainFilter;
    }
    if (searchRecency) {
      requestBody.search_recency_filter = searchRecency;
    }

    const response = await fetch(PERPLEXITY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[Perplexity] API error:", response.status, errorData);
      return null;
    }

    const data = await response.json();

    // Extract content from response
    const content = data.choices?.[0]?.message?.content || "";

    // Extract citations if available
    const citations: PerplexityCitation[] = data.citations?.map((url: string) => ({
      url,
    })) || [];

    return {
      content,
      citations,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  } catch (error) {
    console.error("[Perplexity] Request failed:", error);
    return null;
  }
};

/**
 * Perform a deep search for person information using Perplexity
 * Optimized for finding social media profiles, public records, etc.
 *
 * @param personQuery - Structured query about a person
 * @param context - Additional context (location, workplace, etc.)
 * @returns Search results with profile information and sources
 */
export const perplexityPersonSearch = async (
  personQuery: string,
  context?: {
    location?: string;
    workplace?: string;
    username?: string;
    age?: string;
  }
): Promise<PerplexityResponse | null> => {
  // Build enhanced query with context
  let enhancedQuery = personQuery;

  if (context) {
    const contextParts: string[] = [];
    if (context.location) contextParts.push(`Location: ${context.location}`);
    if (context.workplace) contextParts.push(`Workplace: ${context.workplace}`);
    if (context.username) contextParts.push(`Username: ${context.username}`);
    if (context.age) contextParts.push(`Age: ${context.age}`);

    if (contextParts.length > 0) {
      enhancedQuery = `${personQuery}\n\nAdditional context:\n${contextParts.join("\n")}`;
    }
  }

  return perplexitySearch(enhancedQuery, {
    model: "sonar-pro", // Use pro model for more thorough person searches
    temperature: 0.1, // Lower temperature for more factual results
    maxTokens: 4096,
  });
};

/**
 * Perform multiple searches in parallel
 * Useful for searching across different categories
 *
 * @param queries - Array of search queries
 * @param options - Search options applied to all queries
 * @returns Array of search results
 */
export const perplexityBatchSearch = async (
  queries: string[],
  options: PerplexitySearchOptions = {}
): Promise<(PerplexityResponse | null)[]> => {
  const results = await Promise.all(
    queries.map((query) => perplexitySearch(query, options))
  );
  return results;
};
