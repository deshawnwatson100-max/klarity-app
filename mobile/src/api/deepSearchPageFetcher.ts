/**
 * Deep Search Page Fetcher & Identifier Extractor
 *
 * Fetches content from discovered URLs and extracts:
 * - Outbound links
 * - Usernames and handles
 * - Social profile links
 * - Structured metadata (OpenGraph, JSON-LD)
 *
 * Extracted identifiers are fed back into the search runner
 * to trigger second-wave searches automatically.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ExtractedIdentifier {
  type: "username" | "social_link" | "email" | "phone" | "website" | "profile_url";
  value: string;
  platform?: string;
  confidence: "high" | "medium" | "low";
  source: string; // URL where this was found
}

export interface ExtractedMetadata {
  title?: string;
  description?: string;
  ogImage?: string;
  ogType?: string;
  ogSiteName?: string;
  twitterHandle?: string;
  canonicalUrl?: string;
  jsonLd?: Record<string, unknown>[];
}

export interface OutboundLink {
  url: string;
  text: string;
  isSocialProfile: boolean;
  platform?: string;
}

export interface PageFetchResult {
  url: string;
  success: boolean;
  statusCode?: number;
  contentLength?: number;
  isJsHeavy: boolean;
  jsHeavyReason?: string;
  extractedIdentifiers: ExtractedIdentifier[];
  extractedMetadata: ExtractedMetadata;
  outboundLinks: OutboundLink[];
  rawContent?: string;
  fetchDurationMs: number;
  error?: string;
}

export interface SecondWaveInput {
  /** New usernames discovered from page content */
  discoveredUsernames: string[];
  /** New social profile URLs to investigate */
  discoveredSocialLinks: string[];
  /** New domains/websites associated with the person */
  discoveredDomains: string[];
  /** Source URLs that provided these identifiers */
  sources: string[];
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Maximum number of pages to fetch per search pass */
const MAX_PAGES_TO_FETCH = 10;

/** Timeout for page fetch requests (ms) */
const FETCH_TIMEOUT_MS = 8000;

/** Minimum content length to consider page as having content */
const MIN_CONTENT_LENGTH = 500;

/** Social platform domains for detection */
const SOCIAL_PLATFORMS: Record<string, string> = {
  "instagram.com": "Instagram",
  "facebook.com": "Facebook",
  "twitter.com": "Twitter",
  "x.com": "Twitter",
  "linkedin.com": "LinkedIn",
  "tiktok.com": "TikTok",
  "reddit.com": "Reddit",
  "pinterest.com": "Pinterest",
  "snapchat.com": "Snapchat",
  "youtube.com": "YouTube",
  "github.com": "GitHub",
  "medium.com": "Medium",
  "tumblr.com": "Tumblr",
  "twitch.tv": "Twitch",
  "discord.com": "Discord",
  "threads.net": "Threads",
  "mastodon.social": "Mastodon",
  "bsky.app": "Bluesky",
  "tinder.com": "Tinder",
  "bumble.com": "Bumble",
  "hinge.co": "Hinge",
  "okcupid.com": "OkCupid",
  "match.com": "Match",
  "pof.com": "POF",
  "behance.net": "Behance",
  "dribbble.com": "Dribbble",
  "soundcloud.com": "SoundCloud",
  "spotify.com": "Spotify",
  "venmo.com": "Venmo",
  "cashapp.com": "CashApp",
};

/** Domains that typically require JS rendering */
const JS_HEAVY_DOMAINS = [
  "instagram.com",
  "facebook.com",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "linkedin.com",
  "snapchat.com",
  "threads.net",
];

// ============================================================================
// USERNAME EXTRACTION PATTERNS
// ============================================================================

/** Regex patterns for extracting usernames from content */
const USERNAME_PATTERNS = [
  // @username mentions
  /@([a-zA-Z0-9_]{2,30})\b/g,
  // Twitter/X style: twitter.com/username
  /(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]{1,15})\b/gi,
  // Instagram: instagram.com/username
  /instagram\.com\/([a-zA-Z0-9_.]{1,30})\b/gi,
  // TikTok: tiktok.com/@username
  /tiktok\.com\/@([a-zA-Z0-9_.]{1,24})\b/gi,
  // GitHub: github.com/username
  /github\.com\/([a-zA-Z0-9-]{1,39})\b/gi,
  // Reddit: reddit.com/user/username or /u/username
  /reddit\.com\/u(?:ser)?\/([a-zA-Z0-9_-]{3,20})\b/gi,
  // LinkedIn: linkedin.com/in/username
  /linkedin\.com\/in\/([a-zA-Z0-9-]{3,100})\b/gi,
  // Generic "username:" or "handle:" patterns
  /(?:username|handle|user)[:\s]+@?([a-zA-Z0-9_]{2,30})\b/gi,
];

/** Social profile URL patterns */
const SOCIAL_URL_PATTERNS = [
  /https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9_.]+\/?/gi,
  /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[a-zA-Z0-9_]+\/?/gi,
  /https?:\/\/(?:www\.)?facebook\.com\/[a-zA-Z0-9.]+\/?/gi,
  /https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?/gi,
  /https?:\/\/(?:www\.)?tiktok\.com\/@[a-zA-Z0-9_.]+\/?/gi,
  /https?:\/\/(?:www\.)?github\.com\/[a-zA-Z0-9-]+\/?/gi,
  /https?:\/\/(?:www\.)?reddit\.com\/u(?:ser)?\/[a-zA-Z0-9_-]+\/?/gi,
  /https?:\/\/(?:www\.)?youtube\.com\/(?:@|channel\/|c\/)[a-zA-Z0-9_-]+\/?/gi,
  /https?:\/\/(?:www\.)?pinterest\.com\/[a-zA-Z0-9_]+\/?/gi,
  /https?:\/\/(?:www\.)?medium\.com\/@[a-zA-Z0-9_]+\/?/gi,
  /https?:\/\/(?:www\.)?twitch\.tv\/[a-zA-Z0-9_]+\/?/gi,
  /https?:\/\/(?:www\.)?soundcloud\.com\/[a-zA-Z0-9-]+\/?/gi,
  /https?:\/\/(?:www\.)?behance\.net\/[a-zA-Z0-9_]+\/?/gi,
  /https?:\/\/(?:www\.)?dribbble\.com\/[a-zA-Z0-9_]+\/?/gi,
];

// ============================================================================
// PAGE FETCHING
// ============================================================================

/**
 * Fetches a page and extracts identifiers from its content.
 * Handles timeouts, errors, and JS-heavy page detection.
 */
export async function fetchAndExtractPage(url: string): Promise<PageFetchResult> {
  const startTime = Date.now();
  const result: PageFetchResult = {
    url,
    success: false,
    isJsHeavy: false,
    extractedIdentifiers: [],
    extractedMetadata: {},
    outboundLinks: [],
    fetchDurationMs: 0,
  };

  try {
    // Check if domain is known to be JS-heavy
    const domain = extractDomain(url);
    if (domain && JS_HEAVY_DOMAINS.some(d => domain.includes(d))) {
      result.isJsHeavy = true;
      result.jsHeavyReason = `Domain ${domain} typically requires JavaScript rendering`;
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KlarityBot/1.0; +https://klarity.ai)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    result.statusCode = response.status;

    if (!response.ok) {
      result.error = `HTTP ${response.status}`;
      result.fetchDurationMs = Date.now() - startTime;
      return result;
    }

    const html = await response.text();
    result.contentLength = html.length;
    result.rawContent = html.slice(0, 50000); // Store first 50KB for analysis

    // Check if content is minimal (likely JS-heavy)
    if (html.length < MIN_CONTENT_LENGTH) {
      result.isJsHeavy = true;
      result.jsHeavyReason = "Page content is minimal, likely requires JavaScript";
    }

    // Check for common JS framework indicators
    if (detectJsFramework(html)) {
      result.isJsHeavy = true;
      result.jsHeavyReason = "Page uses JavaScript framework for rendering";
    }

    // Extract metadata
    result.extractedMetadata = extractMetadata(html);

    // Extract identifiers
    result.extractedIdentifiers = extractIdentifiers(html, url);

    // Extract outbound links
    result.outboundLinks = extractOutboundLinks(html, url);

    result.success = true;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        result.error = "Request timed out";
        result.isJsHeavy = true;
        result.jsHeavyReason = "Request timed out, may require JavaScript";
      } else {
        result.error = error.message;
      }
    } else {
      result.error = "Unknown error";
    }
  }

  result.fetchDurationMs = Date.now() - startTime;
  return result;
}

/**
 * Fetches multiple pages in parallel with concurrency control.
 */
export async function fetchMultiplePages(
  urls: string[],
  maxConcurrent: number = 3
): Promise<PageFetchResult[]> {
  const results: PageFetchResult[] = [];
  const urlsToFetch = urls.slice(0, MAX_PAGES_TO_FETCH);

  console.log(`[PageFetcher] Fetching ${urlsToFetch.length} pages (max concurrent: ${maxConcurrent})`);

  // Process in batches
  for (let i = 0; i < urlsToFetch.length; i += maxConcurrent) {
    const batch = urlsToFetch.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(batch.map(url => fetchAndExtractPage(url)));
    results.push(...batchResults);

    // Log progress
    console.log(`[PageFetcher] Completed batch ${Math.floor(i / maxConcurrent) + 1}, total fetched: ${results.length}`);
  }

  const successful = results.filter(r => r.success).length;
  const jsHeavy = results.filter(r => r.isJsHeavy).length;
  console.log(`[PageFetcher] Complete. Success: ${successful}/${results.length}, JS-heavy: ${jsHeavy}`);

  return results;
}

// ============================================================================
// METADATA EXTRACTION
// ============================================================================

/**
 * Extracts OpenGraph, Twitter Cards, and JSON-LD metadata from HTML.
 */
function extractMetadata(html: string): ExtractedMetadata {
  const metadata: ExtractedMetadata = {};

  // OpenGraph meta tags
  const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (ogTitleMatch) metadata.title = decodeHtmlEntities(ogTitleMatch[1]);

  const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  if (ogDescMatch) metadata.description = decodeHtmlEntities(ogDescMatch[1]);

  const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (ogImageMatch) metadata.ogImage = ogImageMatch[1];

  const ogTypeMatch = html.match(/<meta[^>]+property=["']og:type["'][^>]+content=["']([^"']+)["']/i);
  if (ogTypeMatch) metadata.ogType = ogTypeMatch[1];

  const ogSiteMatch = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
  if (ogSiteMatch) metadata.ogSiteName = ogSiteMatch[1];

  // Twitter meta tags
  const twitterHandleMatch = html.match(/<meta[^>]+name=["']twitter:(?:site|creator)["'][^>]+content=["']@?([^"']+)["']/i);
  if (twitterHandleMatch) metadata.twitterHandle = twitterHandleMatch[1];

  // Canonical URL
  const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  if (canonicalMatch) metadata.canonicalUrl = canonicalMatch[1];

  // Fallback to regular title tag
  if (!metadata.title) {
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) metadata.title = decodeHtmlEntities(titleMatch[1]);
  }

  // Fallback to meta description
  if (!metadata.description) {
    const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    if (descMatch) metadata.description = decodeHtmlEntities(descMatch[1]);
  }

  // Extract JSON-LD
  const jsonLdMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([^<]+)<\/script>/gi);
  const jsonLdData: Record<string, unknown>[] = [];
  for (const match of jsonLdMatches) {
    try {
      const parsed = JSON.parse(match[1]);
      jsonLdData.push(parsed);
    } catch {
      // Invalid JSON-LD, skip
    }
  }
  if (jsonLdData.length > 0) {
    metadata.jsonLd = jsonLdData;
  }

  return metadata;
}

// ============================================================================
// IDENTIFIER EXTRACTION
// ============================================================================

/**
 * Extracts usernames, social links, and other identifiers from HTML content.
 */
function extractIdentifiers(html: string, sourceUrl: string): ExtractedIdentifier[] {
  const identifiers: ExtractedIdentifier[] = [];
  const seenValues = new Set<string>();

  // Extract usernames from content
  for (const pattern of USERNAME_PATTERNS) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      const username = match[1]?.toLowerCase();
      if (username && !seenValues.has(username) && isValidUsername(username)) {
        seenValues.add(username);
        identifiers.push({
          type: "username",
          value: username,
          platform: detectPlatformFromPattern(pattern),
          confidence: determineConfidence(username, html),
          source: sourceUrl,
        });
      }
    }
  }

  // Extract social profile URLs
  for (const pattern of SOCIAL_URL_PATTERNS) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      const url = match[0];
      if (!seenValues.has(url)) {
        seenValues.add(url);
        const platform = detectPlatformFromUrl(url);
        identifiers.push({
          type: "social_link",
          value: url,
          platform,
          confidence: "high",
          source: sourceUrl,
        });

        // Also extract username from the URL
        const usernameFromUrl = extractUsernameFromSocialUrl(url);
        if (usernameFromUrl && !seenValues.has(usernameFromUrl)) {
          seenValues.add(usernameFromUrl);
          identifiers.push({
            type: "username",
            value: usernameFromUrl,
            platform,
            confidence: "high",
            source: sourceUrl,
          });
        }
      }
    }
  }

  // Extract email addresses
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emailMatches = html.matchAll(emailPattern);
  for (const match of emailMatches) {
    const email = match[0].toLowerCase();
    if (!seenValues.has(email) && !isCommonEmail(email)) {
      seenValues.add(email);
      identifiers.push({
        type: "email",
        value: email,
        confidence: "medium",
        source: sourceUrl,
      });
    }
  }

  // Extract from JSON-LD data
  const jsonLdIdentifiers = extractFromJsonLd(html, sourceUrl);
  for (const id of jsonLdIdentifiers) {
    if (!seenValues.has(id.value)) {
      seenValues.add(id.value);
      identifiers.push(id);
    }
  }

  return identifiers;
}

/**
 * Extracts identifiers from JSON-LD structured data.
 */
function extractFromJsonLd(html: string, sourceUrl: string): ExtractedIdentifier[] {
  const identifiers: ExtractedIdentifier[] = [];

  const jsonLdMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([^<]+)<\/script>/gi);

  for (const match of jsonLdMatches) {
    try {
      const data = JSON.parse(match[1]);

      // Handle Person schema
      if (data["@type"] === "Person") {
        if (data.sameAs && Array.isArray(data.sameAs)) {
          for (const url of data.sameAs) {
            if (typeof url === "string" && url.startsWith("http")) {
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
        if (data.email) {
          identifiers.push({
            type: "email",
            value: data.email,
            confidence: "high",
            source: sourceUrl,
          });
        }
        if (data.url) {
          identifiers.push({
            type: "website",
            value: data.url,
            confidence: "high",
            source: sourceUrl,
          });
        }
      }

      // Handle ProfilePage schema
      if (data["@type"] === "ProfilePage" && data.mainEntity) {
        const entity = data.mainEntity;
        if (entity.sameAs && Array.isArray(entity.sameAs)) {
          for (const url of entity.sameAs) {
            if (typeof url === "string") {
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
      }
    } catch {
      // Invalid JSON, skip
    }
  }

  return identifiers;
}

// ============================================================================
// OUTBOUND LINK EXTRACTION
// ============================================================================

/**
 * Extracts outbound links from HTML content.
 */
function extractOutboundLinks(html: string, sourceUrl: string): OutboundLink[] {
  const links: OutboundLink[] = [];
  const seenUrls = new Set<string>();
  const sourceDomain = extractDomain(sourceUrl);

  // Match href attributes
  const hrefPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
  const matches = html.matchAll(hrefPattern);

  for (const match of matches) {
    let url = match[1];
    const text = decodeHtmlEntities(match[2] || "").trim();

    // Skip anchors, javascript, and mailto
    if (url.startsWith("#") || url.startsWith("javascript:") || url.startsWith("mailto:")) {
      continue;
    }

    // Convert relative URLs to absolute
    if (url.startsWith("/")) {
      try {
        const baseUrl = new URL(sourceUrl);
        url = `${baseUrl.protocol}//${baseUrl.host}${url}`;
      } catch {
        continue;
      }
    }

    // Skip if not HTTP(S)
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      continue;
    }

    // Skip if same domain (internal link)
    const linkDomain = extractDomain(url);
    if (linkDomain === sourceDomain) {
      continue;
    }

    // Skip if already seen
    if (seenUrls.has(url)) {
      continue;
    }
    seenUrls.add(url);

    // Check if it's a social profile link
    const platform = detectPlatformFromUrl(url);
    const isSocialProfile = !!platform;

    links.push({
      url,
      text,
      isSocialProfile,
      platform,
    });
  }

  return links;
}

// ============================================================================
// SECOND WAVE INPUT GENERATION
// ============================================================================

/**
 * Aggregates extracted identifiers from multiple page fetch results
 * and prepares input for second-wave searches.
 */
export function prepareSecondWaveInput(
  fetchResults: PageFetchResult[],
  existingUsernames: Set<string>,
  existingUrls: Set<string>
): SecondWaveInput {
  const discoveredUsernames = new Set<string>();
  const discoveredSocialLinks = new Set<string>();
  const discoveredDomains = new Set<string>();
  const sources: string[] = [];

  for (const result of fetchResults) {
    if (!result.success) continue;

    sources.push(result.url);

    // Collect usernames
    for (const identifier of result.extractedIdentifiers) {
      if (identifier.type === "username" && identifier.confidence !== "low") {
        const username = identifier.value.toLowerCase();
        if (!existingUsernames.has(username)) {
          discoveredUsernames.add(username);
        }
      }

      if (identifier.type === "social_link") {
        if (!existingUrls.has(identifier.value)) {
          discoveredSocialLinks.add(identifier.value);
        }
      }

      if (identifier.type === "website") {
        const domain = extractDomain(identifier.value);
        if (domain) {
          discoveredDomains.add(domain);
        }
      }
    }

    // Collect social links from outbound links
    for (const link of result.outboundLinks) {
      if (link.isSocialProfile && !existingUrls.has(link.url)) {
        discoveredSocialLinks.add(link.url);
      }
    }

    // Extract Twitter handle from metadata
    if (result.extractedMetadata.twitterHandle) {
      const handle = result.extractedMetadata.twitterHandle.toLowerCase().replace(/^@/, "");
      if (!existingUsernames.has(handle)) {
        discoveredUsernames.add(handle);
      }
    }
  }

  const secondWaveInput: SecondWaveInput = {
    discoveredUsernames: Array.from(discoveredUsernames),
    discoveredSocialLinks: Array.from(discoveredSocialLinks),
    discoveredDomains: Array.from(discoveredDomains),
    sources,
  };

  console.log("[PageFetcher] Second wave input prepared:", {
    newUsernames: secondWaveInput.discoveredUsernames.length,
    newSocialLinks: secondWaveInput.discoveredSocialLinks.length,
    newDomains: secondWaveInput.discoveredDomains.length,
  });

  return secondWaveInput;
}

// ============================================================================
// SECOND-WAVE QUERY GENERATION (PRIORITIZED)
// ============================================================================

/**
 * Query priority levels for second-wave searches.
 * Lower number = higher priority (executed first).
 */
export enum SecondWaveQueryPriority {
  USERNAME_ONLY = 1,           // Highest priority: direct username searches
  USERNAME_PLATFORM = 2,       // Username + platform site: queries
  PROFILE_URL_LOOKUP = 3,      // Profile URL lookups and verification
  FORUM_MENTIONS = 4,          // Forum and discussion mentions
  ARCHIVE_MENTIONS = 5,        // Archive and cached page mentions
  DOMAIN_SEARCHES = 6,         // Domain-specific searches
  CONNECTION_VERIFY = 7,       // Connection verification (username + person name)
}

/**
 * A prioritized query with metadata for tracking.
 */
export interface PrioritizedQuery {
  query: string;
  priority: SecondWaveQueryPriority;
  category: string;
  sourceIdentifier: string;
}

/**
 * Result of second-wave query generation with prioritization.
 */
export interface SecondWaveQueryResult {
  queries: string[];
  prioritizedQueries: PrioritizedQuery[];
  stats: {
    usernameOnly: number;
    usernamePlatform: number;
    profileLookup: number;
    forumMentions: number;
    archiveMentions: number;
    domainSearches: number;
    connectionVerify: number;
    total: number;
  };
}

/** Forum and discussion platforms for username mentions */
const FORUM_PLATFORMS = [
  "reddit.com",
  "quora.com",
  "stackoverflow.com",
  "hackernews.com",
  "news.ycombinator.com",
  "discord.com",
  "telegram.org",
  "4chan.org",
  "kiwifarms.net",
  "lipstickalley.com",
  "tattle.life",
  "guru-gossip.com",
  "fishbowlapp.com",
  "blind.com",
];

/** Archive and cache sites for historical lookups */
const ARCHIVE_SITES = [
  "web.archive.org",
  "archive.is",
  "archive.ph",
  "archive.today",
  "webcache.googleusercontent.com",
  "cachedview.com",
  "ghostarchive.org",
];

/**
 * Generates prioritized search queries based on second-wave discovered identifiers.
 *
 * Priority order:
 * 1. Username-only queries (highest signal)
 * 2. Username + platform site: queries
 * 3. Profile URL lookups
 * 4. Forum and discussion mentions
 * 5. Archive mentions
 * 6. Domain searches
 * 7. Connection verification
 */
export function generateSecondWaveQueries(
  input: SecondWaveInput,
  personName: string
): string[] {
  const result = generatePrioritizedSecondWaveQueries(input, personName);
  return result.queries;
}

/**
 * Generates prioritized second-wave queries with full metadata.
 * Returns queries sorted by priority.
 */
export function generatePrioritizedSecondWaveQueries(
  input: SecondWaveInput,
  personName: string
): SecondWaveQueryResult {
  const prioritizedQueries: PrioritizedQuery[] = [];
  const seenQueries = new Set<string>();

  const addQuery = (query: string, priority: SecondWaveQueryPriority, category: string, sourceIdentifier: string) => {
    const normalizedQuery = query.toLowerCase().trim();
    if (!seenQueries.has(normalizedQuery)) {
      seenQueries.add(normalizedQuery);
      prioritizedQueries.push({ query, priority, category, sourceIdentifier });
    }
  };

  // ============================================================
  // PRIORITY 1: Username-only queries (highest priority)
  // ============================================================
  for (const username of input.discoveredUsernames.slice(0, 8)) {
    // Exact username in quotes
    addQuery(`"${username}"`, SecondWaveQueryPriority.USERNAME_ONLY, "username_exact", username);

    // Username without quotes (catches variations)
    addQuery(username, SecondWaveQueryPriority.USERNAME_ONLY, "username_bare", username);

    // @username format
    addQuery(`"@${username}"`, SecondWaveQueryPriority.USERNAME_ONLY, "username_at", username);
  }

  // ============================================================
  // PRIORITY 2: Username + platform site: queries
  // ============================================================
  const primaryPlatforms = [
    "instagram.com",
    "twitter.com",
    "x.com",
    "facebook.com",
    "linkedin.com",
    "tiktok.com",
    "github.com",
    "youtube.com",
  ];

  const secondaryPlatforms = [
    "pinterest.com",
    "tumblr.com",
    "reddit.com",
    "snapchat.com",
    "threads.net",
    "mastodon.social",
    "twitch.tv",
    "soundcloud.com",
    "spotify.com",
    "behance.net",
    "dribbble.com",
    "medium.com",
  ];

  for (const username of input.discoveredUsernames.slice(0, 5)) {
    // Primary platforms (most likely to have profiles)
    for (const platform of primaryPlatforms) {
      addQuery(
        `"${username}" site:${platform}`,
        SecondWaveQueryPriority.USERNAME_PLATFORM,
        "username_primary_platform",
        username
      );
    }

    // Secondary platforms
    for (const platform of secondaryPlatforms.slice(0, 6)) {
      addQuery(
        `${username} site:${platform}`,
        SecondWaveQueryPriority.USERNAME_PLATFORM,
        "username_secondary_platform",
        username
      );
    }
  }

  // ============================================================
  // PRIORITY 3: Profile URL lookups
  // ============================================================
  for (const socialLink of input.discoveredSocialLinks.slice(0, 8)) {
    const username = extractUsernameFromSocialUrl(socialLink);
    const domain = extractDomain(socialLink);
    const platform = detectPlatformFromUrl(socialLink);

    if (username) {
      // Search for the profile URL directly
      addQuery(
        `"${socialLink}"`,
        SecondWaveQueryPriority.PROFILE_URL_LOOKUP,
        "profile_url_direct",
        socialLink
      );

      // Username on the specific platform
      if (domain) {
        addQuery(
          `"${username}" site:${domain}`,
          SecondWaveQueryPriority.PROFILE_URL_LOOKUP,
          "profile_username_site",
          socialLink
        );
      }

      // Profile verification with platform name
      if (platform) {
        addQuery(
          `"${username}" ${platform} profile`,
          SecondWaveQueryPriority.PROFILE_URL_LOOKUP,
          "profile_platform_verify",
          socialLink
        );
      }
    }
  }

  // ============================================================
  // PRIORITY 4: Forum and discussion mentions
  // ============================================================
  for (const username of input.discoveredUsernames.slice(0, 4)) {
    // Reddit mentions
    addQuery(
      `"${username}" site:reddit.com`,
      SecondWaveQueryPriority.FORUM_MENTIONS,
      "forum_reddit",
      username
    );
    addQuery(
      `"u/${username}" OR "/u/${username}"`,
      SecondWaveQueryPriority.FORUM_MENTIONS,
      "forum_reddit_user",
      username
    );

    // Other forum platforms
    for (const forum of FORUM_PLATFORMS.slice(1, 6)) {
      addQuery(
        `"${username}" site:${forum}`,
        SecondWaveQueryPriority.FORUM_MENTIONS,
        "forum_general",
        username
      );
    }

    // General forum/discussion mentions
    addQuery(
      `"${username}" forum OR discussion OR thread`,
      SecondWaveQueryPriority.FORUM_MENTIONS,
      "forum_general_search",
      username
    );
  }

  // ============================================================
  // PRIORITY 5: Archive and cached page mentions
  // ============================================================
  for (const username of input.discoveredUsernames.slice(0, 3)) {
    // Wayback Machine
    addQuery(
      `"${username}" site:web.archive.org`,
      SecondWaveQueryPriority.ARCHIVE_MENTIONS,
      "archive_wayback",
      username
    );

    // Archive.is / archive.ph
    addQuery(
      `"${username}" site:archive.is OR site:archive.ph`,
      SecondWaveQueryPriority.ARCHIVE_MENTIONS,
      "archive_is",
      username
    );

    // General cached/archived mentions
    addQuery(
      `"${username}" cached OR archived OR snapshot`,
      SecondWaveQueryPriority.ARCHIVE_MENTIONS,
      "archive_general",
      username
    );
  }

  // Archive lookups for discovered social links
  for (const socialLink of input.discoveredSocialLinks.slice(0, 3)) {
    addQuery(
      `"${socialLink}" site:web.archive.org`,
      SecondWaveQueryPriority.ARCHIVE_MENTIONS,
      "archive_url_wayback",
      socialLink
    );
  }

  // ============================================================
  // PRIORITY 6: Domain-specific searches
  // ============================================================
  for (const domain of input.discoveredDomains.slice(0, 4)) {
    // Person name on discovered domain
    addQuery(
      `"${personName}" site:${domain}`,
      SecondWaveQueryPriority.DOMAIN_SEARCHES,
      "domain_person",
      domain
    );

    // Domain mentioned with person name
    addQuery(
      `"${personName}" "${domain}"`,
      SecondWaveQueryPriority.DOMAIN_SEARCHES,
      "domain_mention",
      domain
    );

    // Discovered usernames on domain
    for (const username of input.discoveredUsernames.slice(0, 2)) {
      addQuery(
        `"${username}" site:${domain}`,
        SecondWaveQueryPriority.DOMAIN_SEARCHES,
        "domain_username",
        `${domain}:${username}`
      );
    }
  }

  // ============================================================
  // PRIORITY 7: Connection verification (lowest priority)
  // ============================================================
  for (const username of input.discoveredUsernames.slice(0, 5)) {
    // Username + person name (to confirm connection)
    addQuery(
      `"${username}" "${personName}"`,
      SecondWaveQueryPriority.CONNECTION_VERIFY,
      "connection_name",
      username
    );

    // Username + person name variations
    const nameParts = personName.split(/\s+/);
    if (nameParts.length >= 2) {
      const firstName = nameParts[0];
      const lastName = nameParts[nameParts.length - 1];
      addQuery(
        `"${username}" ${firstName} ${lastName}`,
        SecondWaveQueryPriority.CONNECTION_VERIFY,
        "connection_name_parts",
        username
      );
    }
  }

  // Sort by priority
  prioritizedQueries.sort((a, b) => a.priority - b.priority);

  // Calculate stats
  const stats = {
    usernameOnly: prioritizedQueries.filter(q => q.priority === SecondWaveQueryPriority.USERNAME_ONLY).length,
    usernamePlatform: prioritizedQueries.filter(q => q.priority === SecondWaveQueryPriority.USERNAME_PLATFORM).length,
    profileLookup: prioritizedQueries.filter(q => q.priority === SecondWaveQueryPriority.PROFILE_URL_LOOKUP).length,
    forumMentions: prioritizedQueries.filter(q => q.priority === SecondWaveQueryPriority.FORUM_MENTIONS).length,
    archiveMentions: prioritizedQueries.filter(q => q.priority === SecondWaveQueryPriority.ARCHIVE_MENTIONS).length,
    domainSearches: prioritizedQueries.filter(q => q.priority === SecondWaveQueryPriority.DOMAIN_SEARCHES).length,
    connectionVerify: prioritizedQueries.filter(q => q.priority === SecondWaveQueryPriority.CONNECTION_VERIFY).length,
    total: prioritizedQueries.length,
  };

  console.log("[SecondWave] Query generation stats:", stats);

  return {
    queries: prioritizedQueries.map(q => q.query),
    prioritizedQueries,
    stats,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extracts domain from URL.
 */
function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Decodes HTML entities.
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/**
 * Detects if page uses JS framework for rendering.
 */
function detectJsFramework(html: string): boolean {
  const jsIndicators = [
    "window.__INITIAL_STATE__",
    "window.__PRELOADED_STATE__",
    "__NEXT_DATA__",
    "window.__NUXT__",
    'id="__next"',
    'id="app"',
    "react-root",
    "ng-app",
    "data-reactroot",
    '<div id="root"></div>',
  ];

  const lowerHtml = html.toLowerCase();
  return jsIndicators.some(indicator => lowerHtml.includes(indicator.toLowerCase()));
}

/**
 * Validates if a string looks like a valid username.
 */
function isValidUsername(username: string): boolean {
  // Too short or too long
  if (username.length < 2 || username.length > 30) return false;

  // Common words that aren't usernames
  const commonWords = [
    "the", "and", "for", "are", "but", "not", "you", "all", "can",
    "had", "her", "was", "one", "our", "out", "has", "his", "how",
    "its", "let", "may", "new", "now", "old", "see", "way", "who",
    "did", "get", "come", "made", "find", "here", "home", "https",
    "http", "www", "com", "org", "net", "html", "page", "site",
    "link", "click", "share", "follow", "like", "post", "view",
  ];
  if (commonWords.includes(username.toLowerCase())) return false;

  // Must contain at least one letter
  if (!/[a-zA-Z]/.test(username)) return false;

  return true;
}

/**
 * Checks if email is a common/generic one to skip.
 */
function isCommonEmail(email: string): boolean {
  const commonDomains = [
    "example.com", "test.com", "localhost", "email.com",
    "noreply", "no-reply", "donotreply", "support@",
  ];
  return commonDomains.some(d => email.includes(d));
}

/**
 * Detects platform from regex pattern source.
 */
function detectPlatformFromPattern(pattern: RegExp): string | undefined {
  const source = pattern.source.toLowerCase();
  if (source.includes("twitter") || source.includes("x.com")) return "Twitter";
  if (source.includes("instagram")) return "Instagram";
  if (source.includes("tiktok")) return "TikTok";
  if (source.includes("github")) return "GitHub";
  if (source.includes("reddit")) return "Reddit";
  if (source.includes("linkedin")) return "LinkedIn";
  return undefined;
}

/**
 * Detects platform from URL.
 */
function detectPlatformFromUrl(url: string): string | undefined {
  const domain = extractDomain(url);
  if (!domain) return undefined;

  for (const [platformDomain, platformName] of Object.entries(SOCIAL_PLATFORMS)) {
    if (domain.includes(platformDomain)) {
      return platformName;
    }
  }
  return undefined;
}

/**
 * Extracts username from social URL.
 */
function extractUsernameFromSocialUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // Remove leading/trailing slashes and split
    const parts = pathname.replace(/^\/|\/$/g, "").split("/");

    // Handle different URL patterns
    const domain = urlObj.hostname.toLowerCase();

    if (domain.includes("linkedin.com") && parts[0] === "in") {
      return parts[1] || null;
    }

    if (domain.includes("reddit.com") && (parts[0] === "user" || parts[0] === "u")) {
      return parts[1] || null;
    }

    if (domain.includes("tiktok.com") && parts[0]?.startsWith("@")) {
      return parts[0].slice(1);
    }

    if (domain.includes("medium.com") && parts[0]?.startsWith("@")) {
      return parts[0].slice(1);
    }

    // Default: first path segment is username
    if (parts[0] && parts[0].length > 0 && !["search", "explore", "settings", "about"].includes(parts[0])) {
      return parts[0].replace(/^@/, "");
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Determines confidence level for extracted username.
 */
function determineConfidence(username: string, html: string): "high" | "medium" | "low" {
  const lowerHtml = html.toLowerCase();
  const lowerUsername = username.toLowerCase();

  // Count occurrences
  const occurrences = (lowerHtml.match(new RegExp(lowerUsername, "g")) || []).length;

  // High confidence: appears multiple times or in profile-related context
  if (occurrences >= 3) return "high";

  // Check if in profile context
  const profileIndicators = [
    `@${lowerUsername}`,
    `username: ${lowerUsername}`,
    `user/${lowerUsername}`,
    `/${lowerUsername}`,
  ];

  if (profileIndicators.some(indicator => lowerHtml.includes(indicator))) {
    return "high";
  }

  // Medium confidence: appears at least twice
  if (occurrences >= 2) return "medium";

  return "low";
}

// ============================================================================
// EXPORTS FOR INTEGRATION
// ============================================================================

export {
  MAX_PAGES_TO_FETCH,
  SOCIAL_PLATFORMS,
  JS_HEAVY_DOMAINS,
  FORUM_PLATFORMS,
  ARCHIVE_SITES,
};
