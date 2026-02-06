/**
 * Deep Search Headless Browser Fetcher
 *
 * Provides fallback page fetching for JS-heavy pages that return
 * minimal content with standard HTTP fetch. Uses web rendering
 * services to execute JavaScript and extract rendered content.
 *
 * IMPORTANT: This module is designed for React Native environments
 * where direct Puppeteer/Playwright usage is not possible. It uses
 * external rendering services or proxy APIs.
 */

import { ExtractedIdentifier, ExtractedMetadata, OutboundLink, PageFetchResult } from "./deepSearchPageFetcher";

// ============================================================================
// TYPES
// ============================================================================

export interface HeadlessRenderResult {
  url: string;
  success: boolean;
  renderedHtml?: string;
  visibleText?: string;
  screenshots?: string[]; // Base64 encoded if available
  extractedLinks: OutboundLink[];
  extractedIdentifiers: ExtractedIdentifier[];
  extractedMetadata: ExtractedMetadata;
  renderDurationMs: number;
  error?: string;
  fallbackMethod: HeadlessFallbackMethod;
}

export interface HeadlessConfig {
  /** Maximum pages to render with headless fallback */
  maxPagesToRender: number;
  /** Timeout for headless render (ms) */
  renderTimeoutMs: number;
  /** Whether to capture screenshots */
  captureScreenshots: boolean;
  /** Wait time for page to settle after load (ms) */
  pageSettleTimeMs: number;
  /** Minimum visible text length to consider successful */
  minTextLength: number;
}

export type HeadlessFallbackMethod =
  | "google_cache"
  | "archive_snapshot"
  | "mobile_user_agent"
  | "api_render_service"
  | "none";

export interface JsHeavyDetectionResult {
  isJsHeavy: boolean;
  reason?: string;
  confidence: "high" | "medium" | "low";
  recommendedFallback: HeadlessFallbackMethod;
  priority: number; // 1-10, higher = more important to render
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: HeadlessConfig = {
  maxPagesToRender: 5, // Limit to top N high-value pages
  renderTimeoutMs: 15000, // 15 second timeout
  captureScreenshots: false, // Disabled by default to save bandwidth
  pageSettleTimeMs: 2000, // Wait 2s for dynamic content
  minTextLength: 200, // Minimum text to consider successful
};

/** Domains known to require JS rendering */
const JS_HEAVY_DOMAINS: Record<string, JsHeavyDomainConfig> = {
  "instagram.com": { priority: 10, method: "mobile_user_agent", requires: "login_wall" },
  "facebook.com": { priority: 9, method: "mobile_user_agent", requires: "login_wall" },
  "twitter.com": { priority: 9, method: "google_cache", requires: "js_render" },
  "x.com": { priority: 9, method: "google_cache", requires: "js_render" },
  "tiktok.com": { priority: 8, method: "mobile_user_agent", requires: "js_render" },
  "linkedin.com": { priority: 8, method: "google_cache", requires: "login_wall" },
  "threads.net": { priority: 7, method: "mobile_user_agent", requires: "js_render" },
  "snapchat.com": { priority: 6, method: "mobile_user_agent", requires: "js_render" },
  "pinterest.com": { priority: 5, method: "mobile_user_agent", requires: "js_render" },
  "reddit.com": { priority: 4, method: "google_cache", requires: "js_render" },
  "discord.com": { priority: 3, method: "none", requires: "login_required" },
};

interface JsHeavyDomainConfig {
  priority: number;
  method: HeadlessFallbackMethod;
  requires: "js_render" | "login_wall" | "login_required" | "captcha";
}

/** User agents for mobile fallback */
const MOBILE_USER_AGENTS = [
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
];

/** Content indicators that suggest JS-heavy rendering */
const JS_HEAVY_INDICATORS = [
  // React/Next.js indicators
  { pattern: /<div id="__next"><\/div>/i, weight: 10 },
  { pattern: /<div id="root"><\/div>/i, weight: 10 },
  { pattern: /data-reactroot/i, weight: 8 },
  { pattern: /__NEXT_DATA__/i, weight: 9 },

  // Vue/Nuxt indicators
  { pattern: /<div id="app"><\/div>/i, weight: 10 },
  { pattern: /__NUXT__/i, weight: 9 },

  // Angular indicators
  { pattern: /ng-version/i, weight: 8 },
  { pattern: /<app-root/i, weight: 9 },

  // General SPA indicators
  { pattern: /window\.__INITIAL_STATE__/i, weight: 7 },
  { pattern: /window\.__PRELOADED_STATE__/i, weight: 7 },
  { pattern: /<noscript>.*enable javascript/i, weight: 10 },
  { pattern: /please enable javascript/i, weight: 10 },

  // Empty body or minimal content
  { pattern: /<body[^>]*>\s*<div[^>]*><\/div>\s*<\/body>/i, weight: 10 },
  { pattern: /<body[^>]*>\s*<script/i, weight: 6 },
];

/** Content indicators that suggest page has real content */
const REAL_CONTENT_INDICATORS = [
  { pattern: /<article/i, weight: -5 },
  { pattern: /<main[^>]*>.{500,}/i, weight: -8 },
  { pattern: /<p[^>]*>.{100,}/i, weight: -3 },
  { pattern: /"@type":\s*"Person"/i, weight: -5 },
  { pattern: /"@type":\s*"Article"/i, weight: -5 },
];

// ============================================================================
// JS-HEAVY DETECTION
// ============================================================================

/**
 * Analyzes a page fetch result to determine if it needs headless rendering.
 * Returns detection result with confidence and recommended fallback method.
 */
export function detectJsHeavyPage(
  result: PageFetchResult,
  url: string
): JsHeavyDetectionResult {
  const domain = extractDomain(url);
  let jsScore = 0;
  const reasons: string[] = [];

  // Check if domain is known JS-heavy
  if (domain) {
    const domainConfig = Object.entries(JS_HEAVY_DOMAINS).find(([d]) =>
      domain.includes(d)
    );
    if (domainConfig) {
      const [domainName, config] = domainConfig;
      return {
        isJsHeavy: true,
        reason: `Domain ${domainName} is known to require ${config.requires}`,
        confidence: "high",
        recommendedFallback: config.method,
        priority: config.priority,
      };
    }
  }

  // Check content length
  if (result.contentLength !== undefined) {
    if (result.contentLength < 500) {
      jsScore += 10;
      reasons.push("Very minimal content length (<500 bytes)");
    } else if (result.contentLength < 2000) {
      jsScore += 5;
      reasons.push("Low content length (<2000 bytes)");
    }
  }

  // Analyze HTML content for JS indicators
  if (result.rawContent) {
    const content = result.rawContent;

    // Check JS-heavy indicators
    for (const indicator of JS_HEAVY_INDICATORS) {
      if (indicator.pattern.test(content)) {
        jsScore += indicator.weight;
        reasons.push(`JS indicator found: ${indicator.pattern.source.slice(0, 30)}...`);
      }
    }

    // Check real content indicators (reduce score)
    for (const indicator of REAL_CONTENT_INDICATORS) {
      if (indicator.pattern.test(content)) {
        jsScore += indicator.weight; // These are negative
      }
    }

    // Check ratio of script tags to content
    const scriptCount = (content.match(/<script/gi) || []).length;
    const textContent = content.replace(/<[^>]+>/g, "").trim();
    const textLength = textContent.length;

    if (scriptCount > 10 && textLength < 1000) {
      jsScore += 5;
      reasons.push(`High script count (${scriptCount}) with low text content`);
    }

    // Check for empty body patterns
    const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      const bodyContent = bodyMatch[1].replace(/<script[\s\S]*?<\/script>/gi, "").trim();
      const bodyTextLength = bodyContent.replace(/<[^>]+>/g, "").trim().length;

      if (bodyTextLength < 100) {
        jsScore += 8;
        reasons.push("Body contains almost no visible text after removing scripts");
      }
    }
  }

  // Check if metadata was extracted but no real content
  const hasMetadata = result.extractedMetadata.title || result.extractedMetadata.description;
  const hasIdentifiers = result.extractedIdentifiers.length > 0;

  if (hasMetadata && !hasIdentifiers && jsScore > 5) {
    jsScore += 3;
    reasons.push("Has metadata but no identifiers extracted");
  }

  // Determine confidence and recommendation
  let confidence: "high" | "medium" | "low";
  let isJsHeavy: boolean;
  let recommendedFallback: HeadlessFallbackMethod;
  let priority: number;

  if (jsScore >= 15) {
    isJsHeavy = true;
    confidence = "high";
    recommendedFallback = "google_cache";
    priority = 8;
  } else if (jsScore >= 10) {
    isJsHeavy = true;
    confidence = "medium";
    recommendedFallback = "mobile_user_agent";
    priority = 5;
  } else if (jsScore >= 5) {
    isJsHeavy = true;
    confidence = "low";
    recommendedFallback = "archive_snapshot";
    priority = 3;
  } else {
    isJsHeavy = false;
    confidence = "low";
    recommendedFallback = "none";
    priority = 0;
  }

  return {
    isJsHeavy,
    reason: reasons.length > 0 ? reasons.slice(0, 3).join("; ") : undefined,
    confidence,
    recommendedFallback,
    priority,
  };
}

/**
 * Selects the highest-priority JS-heavy pages for headless rendering.
 * Limited to maxPagesToRender to control performance.
 */
export function selectPagesForHeadlessRender(
  fetchResults: PageFetchResult[],
  config: HeadlessConfig = DEFAULT_CONFIG
): Array<{ result: PageFetchResult; detection: JsHeavyDetectionResult }> {
  const jsHeavyPages: Array<{ result: PageFetchResult; detection: JsHeavyDetectionResult }> = [];

  for (const result of fetchResults) {
    if (!result.success && !result.isJsHeavy) continue;

    const detection = detectJsHeavyPage(result, result.url);

    if (detection.isJsHeavy && detection.recommendedFallback !== "none") {
      jsHeavyPages.push({ result, detection });
    }
  }

  // Sort by priority (highest first) and limit
  jsHeavyPages.sort((a, b) => b.detection.priority - a.detection.priority);

  const selected = jsHeavyPages.slice(0, config.maxPagesToRender);

  console.log(
    `[HeadlessFetcher] Selected ${selected.length}/${jsHeavyPages.length} JS-heavy pages for rendering`
  );

  return selected;
}

// ============================================================================
// HEADLESS RENDER FALLBACK METHODS
// ============================================================================

/**
 * Attempts to fetch page content using Google Cache.
 * Google often caches rendered versions of JS-heavy pages.
 */
async function fetchViaGoogleCache(url: string): Promise<HeadlessRenderResult> {
  const startTime = Date.now();
  const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(cacheUrl, {
      method: "GET",
      headers: {
        "User-Agent": MOBILE_USER_AGENTS[0],
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return createErrorResult(url, `Google Cache returned ${response.status}`, "google_cache", startTime);
    }

    const html = await response.text();

    // Extract visible text and identifiers
    const visibleText = extractVisibleText(html);
    const extractedIdentifiers = extractIdentifiersFromHtml(html, url);
    const extractedLinks = extractLinksFromHtml(html, url);
    const extractedMetadata = extractMetadataFromHtml(html);

    return {
      url,
      success: visibleText.length >= DEFAULT_CONFIG.minTextLength,
      renderedHtml: html,
      visibleText,
      extractedLinks,
      extractedIdentifiers,
      extractedMetadata,
      renderDurationMs: Date.now() - startTime,
      fallbackMethod: "google_cache",
    };
  } catch (error) {
    return createErrorResult(
      url,
      error instanceof Error ? error.message : "Unknown error",
      "google_cache",
      startTime
    );
  }
}

/**
 * Attempts to fetch page content using Archive.org snapshots.
 * Tries to find the most recent cached version.
 */
async function fetchViaArchiveSnapshot(url: string): Promise<HeadlessRenderResult> {
  const startTime = Date.now();

  try {
    // First, check if archive has this URL
    const availabilityUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const availResponse = await fetch(availabilityUrl, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!availResponse.ok) {
      return createErrorResult(url, "Archive availability check failed", "archive_snapshot", startTime);
    }

    const availData = await availResponse.json();

    if (!availData.archived_snapshots?.closest?.url) {
      return createErrorResult(url, "No archive snapshot available", "archive_snapshot", startTime);
    }

    const snapshotUrl = availData.archived_snapshots.closest.url;

    // Fetch the actual snapshot
    const controller2 = new AbortController();
    const timeoutId2 = setTimeout(() => controller2.abort(), 12000);

    const snapshotResponse = await fetch(snapshotUrl, {
      headers: {
        "User-Agent": MOBILE_USER_AGENTS[0],
      },
      signal: controller2.signal,
    });

    clearTimeout(timeoutId2);

    if (!snapshotResponse.ok) {
      return createErrorResult(url, `Archive snapshot returned ${snapshotResponse.status}`, "archive_snapshot", startTime);
    }

    const html = await snapshotResponse.text();
    const visibleText = extractVisibleText(html);
    const extractedIdentifiers = extractIdentifiersFromHtml(html, url);
    const extractedLinks = extractLinksFromHtml(html, url);
    const extractedMetadata = extractMetadataFromHtml(html);

    return {
      url,
      success: visibleText.length >= DEFAULT_CONFIG.minTextLength,
      renderedHtml: html,
      visibleText,
      extractedLinks,
      extractedIdentifiers,
      extractedMetadata,
      renderDurationMs: Date.now() - startTime,
      fallbackMethod: "archive_snapshot",
    };
  } catch (error) {
    return createErrorResult(
      url,
      error instanceof Error ? error.message : "Unknown error",
      "archive_snapshot",
      startTime
    );
  }
}

/**
 * Attempts to fetch page using mobile user agent.
 * Some sites serve simpler, pre-rendered pages to mobile devices.
 */
async function fetchViaMobileUserAgent(url: string): Promise<HeadlessRenderResult> {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": MOBILE_USER_AGENTS[Math.floor(Math.random() * MOBILE_USER_AGENTS.length)],
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return createErrorResult(url, `Mobile fetch returned ${response.status}`, "mobile_user_agent", startTime);
    }

    const html = await response.text();
    const visibleText = extractVisibleText(html);
    const extractedIdentifiers = extractIdentifiersFromHtml(html, url);
    const extractedLinks = extractLinksFromHtml(html, url);
    const extractedMetadata = extractMetadataFromHtml(html);

    return {
      url,
      success: visibleText.length >= DEFAULT_CONFIG.minTextLength,
      renderedHtml: html,
      visibleText,
      extractedLinks,
      extractedIdentifiers,
      extractedMetadata,
      renderDurationMs: Date.now() - startTime,
      fallbackMethod: "mobile_user_agent",
    };
  } catch (error) {
    return createErrorResult(
      url,
      error instanceof Error ? error.message : "Unknown error",
      "mobile_user_agent",
      startTime
    );
  }
}

// ============================================================================
// MAIN HEADLESS RENDER FUNCTION
// ============================================================================

/**
 * Attempts to render a JS-heavy page using multiple fallback methods.
 * Tries methods in order of likelihood of success based on domain.
 */
export async function renderJsHeavyPage(
  url: string,
  recommendedMethod: HeadlessFallbackMethod
): Promise<HeadlessRenderResult> {
  console.log(`[HeadlessFetcher] Attempting headless render for: ${url} (method: ${recommendedMethod})`);

  // Order fallback methods based on recommendation
  const methodOrder: HeadlessFallbackMethod[] = getMethodOrder(recommendedMethod);

  for (const method of methodOrder) {
    if (method === "none") continue;

    let result: HeadlessRenderResult;

    switch (method) {
      case "google_cache":
        result = await fetchViaGoogleCache(url);
        break;
      case "archive_snapshot":
        result = await fetchViaArchiveSnapshot(url);
        break;
      case "mobile_user_agent":
        result = await fetchViaMobileUserAgent(url);
        break;
      case "api_render_service":
        // API render service would go here if configured
        result = createErrorResult(url, "API render service not configured", method, Date.now());
        break;
      default:
        continue;
    }

    if (result.success) {
      console.log(`[HeadlessFetcher] Success with ${method}: ${url} (${result.visibleText?.length || 0} chars)`);
      return result;
    }

    console.log(`[HeadlessFetcher] Failed with ${method}: ${result.error}`);
  }

  // All methods failed
  return createErrorResult(url, "All headless render methods failed", "none", Date.now());
}

/**
 * Renders multiple JS-heavy pages with concurrency control.
 */
export async function renderMultipleJsHeavyPages(
  pages: Array<{ result: PageFetchResult; detection: JsHeavyDetectionResult }>,
  maxConcurrent: number = 2
): Promise<HeadlessRenderResult[]> {
  const results: HeadlessRenderResult[] = [];

  console.log(`[HeadlessFetcher] Rendering ${pages.length} JS-heavy pages (max concurrent: ${maxConcurrent})`);

  // Process in batches
  for (let i = 0; i < pages.length; i += maxConcurrent) {
    const batch = pages.slice(i, i + maxConcurrent);

    const batchResults = await Promise.all(
      batch.map(({ result, detection }) =>
        renderJsHeavyPage(result.url, detection.recommendedFallback)
      )
    );

    results.push(...batchResults);

    console.log(`[HeadlessFetcher] Batch ${Math.floor(i / maxConcurrent) + 1} complete`);
  }

  const successful = results.filter(r => r.success).length;
  console.log(`[HeadlessFetcher] Complete. Successful: ${successful}/${results.length}`);

  return results;
}

// ============================================================================
// HTML PARSING HELPERS
// ============================================================================

/**
 * Extracts visible text from HTML, removing scripts, styles, and tags.
 */
function extractVisibleText(html: string): string {
  // Remove script and style elements
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // Remove all HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode HTML entities
  text = decodeHtmlEntities(text);

  // Normalize whitespace
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

/**
 * Extracts identifiers from HTML content.
 */
function extractIdentifiersFromHtml(html: string, sourceUrl: string): ExtractedIdentifier[] {
  const identifiers: ExtractedIdentifier[] = [];
  const seen = new Set<string>();

  // Extract @usernames
  const usernameMatches = html.matchAll(/@([a-zA-Z0-9_]{2,30})\b/g);
  for (const match of usernameMatches) {
    const username = match[1].toLowerCase();
    if (!seen.has(username) && isValidUsername(username)) {
      seen.add(username);
      identifiers.push({
        type: "username",
        value: username,
        confidence: "medium",
        source: sourceUrl,
      });
    }
  }

  // Extract social URLs
  const socialPatterns = [
    /https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/gi,
    /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/([a-zA-Z0-9_]+)/gi,
    /https?:\/\/(?:www\.)?facebook\.com\/([a-zA-Z0-9.]+)/gi,
    /https?:\/\/(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9-]+)/gi,
    /https?:\/\/(?:www\.)?tiktok\.com\/@([a-zA-Z0-9_.]+)/gi,
  ];

  for (const pattern of socialPatterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      const url = match[0];
      if (!seen.has(url)) {
        seen.add(url);
        identifiers.push({
          type: "social_link",
          value: url,
          platform: detectPlatformFromUrl(url),
          confidence: "high",
          source: sourceUrl,
        });
      }
    }
  }

  // Extract emails
  const emailMatches = html.matchAll(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g);
  for (const match of emailMatches) {
    const email = match[0].toLowerCase();
    if (!seen.has(email) && !isGenericEmail(email)) {
      seen.add(email);
      identifiers.push({
        type: "email",
        value: email,
        confidence: "medium",
        source: sourceUrl,
      });
    }
  }

  return identifiers;
}

/**
 * Extracts outbound links from HTML.
 */
function extractLinksFromHtml(html: string, sourceUrl: string): OutboundLink[] {
  const links: OutboundLink[] = [];
  const seen = new Set<string>();
  const sourceDomain = extractDomain(sourceUrl);

  const hrefPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
  const matches = html.matchAll(hrefPattern);

  for (const match of matches) {
    let url = match[1];
    const text = decodeHtmlEntities(match[2] || "").trim();

    // Skip non-HTTP URLs
    if (!url.startsWith("http://") && !url.startsWith("https://")) continue;

    // Skip internal links
    const linkDomain = extractDomain(url);
    if (linkDomain === sourceDomain) continue;

    // Skip duplicates
    if (seen.has(url)) continue;
    seen.add(url);

    const platform = detectPlatformFromUrl(url);
    links.push({
      url,
      text,
      isSocialProfile: !!platform,
      platform,
    });
  }

  return links;
}

/**
 * Extracts metadata from HTML.
 */
function extractMetadataFromHtml(html: string): ExtractedMetadata {
  const metadata: ExtractedMetadata = {};

  // OpenGraph
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (ogTitle) metadata.title = decodeHtmlEntities(ogTitle[1]);

  const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  if (ogDesc) metadata.description = decodeHtmlEntities(ogDesc[1]);

  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (ogImage) metadata.ogImage = ogImage[1];

  // Twitter
  const twitterHandle = html.match(/<meta[^>]+name=["']twitter:(?:site|creator)["'][^>]+content=["']@?([^"']+)["']/i);
  if (twitterHandle) metadata.twitterHandle = twitterHandle[1];

  // Fallback to title tag
  if (!metadata.title) {
    const titleTag = html.match(/<title>([^<]+)<\/title>/i);
    if (titleTag) metadata.title = decodeHtmlEntities(titleTag[1]);
  }

  return metadata;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function isValidUsername(username: string): boolean {
  if (username.length < 2 || username.length > 30) return false;

  const commonWords = [
    "the", "and", "for", "are", "but", "not", "you", "all", "can",
    "http", "https", "www", "com", "org", "net", "html",
  ];

  return !commonWords.includes(username.toLowerCase()) && /[a-zA-Z]/.test(username);
}

function isGenericEmail(email: string): boolean {
  const generic = ["noreply", "no-reply", "support", "info", "admin", "example.com", "test.com"];
  return generic.some(g => email.includes(g));
}

function detectPlatformFromUrl(url: string): string | undefined {
  const domain = extractDomain(url);
  if (!domain) return undefined;

  const platforms: Record<string, string> = {
    "instagram.com": "Instagram",
    "facebook.com": "Facebook",
    "twitter.com": "Twitter",
    "x.com": "Twitter",
    "linkedin.com": "LinkedIn",
    "tiktok.com": "TikTok",
    "reddit.com": "Reddit",
    "youtube.com": "YouTube",
    "github.com": "GitHub",
  };

  for (const [d, name] of Object.entries(platforms)) {
    if (domain.includes(d)) return name;
  }

  return undefined;
}

function getMethodOrder(recommended: HeadlessFallbackMethod): HeadlessFallbackMethod[] {
  const allMethods: HeadlessFallbackMethod[] = [
    "mobile_user_agent",
    "google_cache",
    "archive_snapshot",
    "api_render_service",
  ];

  // Put recommended method first
  if (recommended !== "none") {
    return [recommended, ...allMethods.filter(m => m !== recommended)];
  }

  return allMethods;
}

function createErrorResult(
  url: string,
  error: string,
  method: HeadlessFallbackMethod,
  startTime: number
): HeadlessRenderResult {
  return {
    url,
    success: false,
    extractedLinks: [],
    extractedIdentifiers: [],
    extractedMetadata: {},
    renderDurationMs: Date.now() - startTime,
    error,
    fallbackMethod: method,
  };
}

// ============================================================================
// INTEGRATION WITH PAGE FETCHER
// ============================================================================

/**
 * Merges headless render results back into page fetch results.
 * Updates the original results with additional content extracted via headless rendering.
 */
export function mergeHeadlessResults(
  originalResults: PageFetchResult[],
  headlessResults: HeadlessRenderResult[]
): PageFetchResult[] {
  const headlessMap = new Map(headlessResults.map(r => [r.url, r]));

  return originalResults.map(original => {
    const headless = headlessMap.get(original.url);

    if (!headless || !headless.success) {
      return original;
    }

    // Merge identifiers (deduplicated)
    const existingValues = new Set(original.extractedIdentifiers.map(i => i.value));
    const newIdentifiers = headless.extractedIdentifiers.filter(
      i => !existingValues.has(i.value)
    );

    // Merge links (deduplicated)
    const existingUrls = new Set(original.outboundLinks.map(l => l.url));
    const newLinks = headless.extractedLinks.filter(l => !existingUrls.has(l.url));

    return {
      ...original,
      success: true, // Mark as successful now that we have content
      isJsHeavy: true,
      jsHeavyReason: `Content extracted via ${headless.fallbackMethod}`,
      rawContent: headless.renderedHtml || original.rawContent,
      contentLength: headless.renderedHtml?.length || original.contentLength,
      extractedIdentifiers: [...original.extractedIdentifiers, ...newIdentifiers],
      outboundLinks: [...original.outboundLinks, ...newLinks],
      extractedMetadata: {
        ...original.extractedMetadata,
        ...headless.extractedMetadata,
      },
    };
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  DEFAULT_CONFIG as HEADLESS_CONFIG,
  JS_HEAVY_DOMAINS,
  MOBILE_USER_AGENTS,
};
