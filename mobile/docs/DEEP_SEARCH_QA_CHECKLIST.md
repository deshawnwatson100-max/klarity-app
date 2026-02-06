# Deep Search QA Checklist

## Overview
This checklist verifies that Deep Search behaves thoroughly and correctly across all search passes, categories, and edge cases.

---

## 1. Query Volume (Minimum 10 Queries)

| Test ID | Test Case | Expected Result | Pass/Fail |
|---------|-----------|-----------------|-----------|
| QV-01 | Run search with name + location only | `passResults[].queriesUsed` total >= 10 | |
| QV-02 | Run search with name + username | `passResults[].queriesUsed` total >= 15 | |
| QV-03 | Run search with all optional fields (county, middle initial, aliases) | `passResults[].queriesUsed` total >= 20 | |
| QV-04 | Check console logs for `[MultiPass]` query count | Logs show cumulative query execution | |

**How to verify:**
```typescript
const result = await executeMultiPassSearch(input, personContextId);
const totalQueries = result.passResults.reduce((sum, p) => sum + p.queriesUsed.length, 0);
console.log(`Total queries: ${totalQueries}`); // Should be >= 10
```

---

## 2. Username-First Behavior

| Test ID | Test Case | Expected Result | Pass/Fail |
|---------|-----------|-----------------|-----------|
| UF-01 | Provide username in input | Pass 1 (USERNAME_FIRST) executes first | |
| UF-02 | Username generates variations | Queries include variations (no underscore, no numbers, etc.) | |
| UF-03 | Username searches multiple platforms | Queries include `site:instagram.com`, `site:twitter.com`, `site:linkedin.com`, etc. | |
| UF-04 | No username provided | Pass 1 (USERNAME_FIRST) is skipped | |
| UF-05 | Username from anchor type | `anchor: { type: "username", value: "@handle" }` triggers USERNAME_FIRST | |

**How to verify:**
```typescript
// With username
const result = await executeMultiPassSearch({ name: "John Doe", username: "johndoe123" }, id);
const firstPass = result.passResults[0];
console.log(firstPass.passName); // Should be "Username First"
console.log(firstPass.queriesUsed); // Should include username variations

// Without username
const result2 = await executeMultiPassSearch({ name: "John Doe", location: "NYC" }, id);
const firstPass2 = result2.passResults[0];
console.log(firstPass2.passName); // Should be "Name + Location", NOT "Username First"
```

---

## 3. Platform-Targeting Works

| Test ID | Test Case | Expected Result | Pass/Fail |
|---------|-----------|-----------------|-----------|
| PT-01 | Pass 3 (PLATFORM_TARGETED) generates site: queries | Queries include `site:linkedin.com`, `site:instagram.com`, etc. | |
| PT-02 | Social platforms covered | Instagram, Facebook, Twitter/X, TikTok, Reddit searched | |
| PT-03 | Professional platforms covered | LinkedIn, GitHub, Behance, Dribbble searched | |
| PT-04 | Writing platforms covered | Medium, Substack, Quora, WordPress searched | |
| PT-05 | Location added to platform queries | Queries include `"Name" location site:platform.com` | |

**How to verify:**
```typescript
const result = await executeMultiPassSearch({ name: "Jane Smith", location: "Austin, TX" }, id);
const platformPass = result.passResults.find(p => p.passName === "Platform Targeted");
const queries = platformPass.queriesUsed;

// Check for site: queries
const hasSiteQueries = queries.some(q => q.includes("site:"));
const hasLinkedIn = queries.some(q => q.includes("site:linkedin.com"));
const hasInstagram = queries.some(q => q.includes("site:instagram.com"));
console.log({ hasSiteQueries, hasLinkedIn, hasInstagram }); // All should be true
```

---

## 4. Dating Mirrors/Caches Searched

| Test ID | Test Case | Expected Result | Pass/Fail |
|---------|-----------|-----------------|-----------|
| DM-01 | Pass 5 (DATING_MIRRORS) executes | Dating-specific queries generated | |
| DM-02 | Dating profile keywords used | Queries include "dating profile", "tinder bio", "hinge profile" | |
| DM-03 | Dating platforms searched | Tinder, Bumble, Hinge, OkCupid, Match, POF covered | |
| DM-04 | Dating archive queries generated | Queries include `site:web.archive.org` for dating platforms | |
| DM-05 | "Met on" keywords searched | Queries include "met on tinder", "matched on bumble", etc. | |
| DM-06 | Username + dating platforms | If username provided, searches `username tinder`, `username bumble` | |

**How to verify:**
```typescript
const result = await executeMultiPassSearch({ name: "Sarah Johnson", location: "Denver, CO" }, id);
const datingPass = result.passResults.find(p => p.passName === "Dating Mirrors");
const queries = datingPass.queriesUsed;

const hasDatingKeywords = queries.some(q => q.includes("dating profile") || q.includes("tinder"));
const hasArchiveQueries = queries.some(q => q.includes("site:web.archive.org") && q.includes("dating"));
console.log({ hasDatingKeywords, hasArchiveQueries }); // Both should be true
```

---

## 5. Legal Portal Discovery Works

| Test ID | Test Case | Expected Result | Pass/Fail |
|---------|-----------|-----------------|-----------|
| LP-01 | Pass 6 (LEGAL_RECORDS) executes | Legal portal queries generated | |
| LP-02 | Court case searches generated | Queries include "court case", "court records" | |
| LP-03 | Jail/inmate searches generated | Queries include "jail roster", "inmate search", "booking" | |
| LP-04 | .gov domain prioritization | Queries include `site:*.gov` searches | |
| LP-05 | State DOC searches | Queries include "state corrections", "DOC inmate" | |
| LP-06 | County-specific searches | If county provided, queries include county name + court | |
| LP-07 | Legal portals parsed from response | `result.legalPortals` array populated | |
| LP-08 | .gov results sorted first | Legal portals with `isGovDomain: true` appear first | |

**How to verify:**
```typescript
const result = await executeMultiPassSearch({
  name: "Michael Brown",
  location: "Harris County, TX",
  county: "Harris County"
}, id);

const legalPass = result.passResults.find(p => p.passName === "Legal Records");
const hasCourtQueries = legalPass.queriesUsed.some(q => q.includes("court"));
const hasGovQueries = legalPass.queriesUsed.some(q => q.includes("site:") && q.includes(".gov"));

console.log({ hasCourtQueries, hasGovQueries }); // Both should be true
console.log(`Legal portals found: ${result.legalPortals.length}`);
```

---

## 6. Archive Pass Runs

| Test ID | Test Case | Expected Result | Pass/Fail |
|---------|-----------|-----------------|-----------|
| AP-01 | Pass 8 (ARCHIVED_CACHED) executes | Archive queries generated | |
| AP-02 | Wayback Machine searched | Queries include `site:web.archive.org` | |
| AP-03 | Archive.is searched | Queries include `site:archive.is`, `site:archive.ph` | |
| AP-04 | Deleted profile searches | Queries include "deleted profile", "old profile" | |
| AP-05 | Platform-specific archives | Queries search archives of social/dating platforms | |
| AP-06 | Archived pages parsed | `result.archivedPages` array populated | |
| AP-07 | Snapshot labels correct | `archivedPages[].snapshotLabel` contains "Archived snapshot" | |
| AP-08 | Original URLs extracted | `archivedPages[].originalUrl` differs from `archiveUrl` for Wayback results | |

**How to verify:**
```typescript
const result = await executeMultiPassSearch({ name: "Alex Turner", username: "alexturner" }, id);

const archivePass = result.passResults.find(p => p.passName === "Archived & Cached");
const hasWayback = archivePass.queriesUsed.some(q => q.includes("site:web.archive.org"));
const hasArchiveIs = archivePass.queriesUsed.some(q => q.includes("site:archive.is"));

console.log({ hasWayback, hasArchiveIs }); // Both should be true
console.log(`Archived pages found: ${result.archivedPages.length}`);

// Check snapshot labeling
result.archivedPages.forEach(p => {
  console.log(`Label: ${p.snapshotLabel}`); // Should include "Archived snapshot"
});
```

---

## 7. Images Pass Runs

| Test ID | Test Case | Expected Result | Pass/Fail |
|---------|-----------|-----------------|-----------|
| IP-01 | Pass 7 (IMAGES_VISUAL) executes | Image search queries generated | |
| IP-02 | Profile photo searches | Queries include "profile photo", "profile picture", "headshot" | |
| IP-03 | Platform-specific image searches | Queries include "linkedin photo", "instagram photo", etc. | |
| IP-04 | Username image searches | If username provided, searches `username profile photo` | |
| IP-05 | Image results parsed | `result.imageResults` array populated | |
| IP-06 | Image source types detected | `imageResults[].sourceType` correctly categorized | |
| IP-07 | Near-duplicate detection | Similar images not duplicated in results | |

**How to verify:**
```typescript
const result = await executeMultiPassSearch({
  name: "Emily Chen",
  username: "emilychen",
  location: "San Francisco"
}, id);

const imagePass = result.passResults.find(p => p.passName === "Images & Visual");
const hasPhotoQueries = imagePass.queriesUsed.some(q =>
  q.includes("photo") || q.includes("picture") || q.includes("headshot")
);

console.log({ hasPhotoQueries }); // Should be true
console.log(`Image results found: ${result.imageResults.length}`);
```

---

## 8. Correct Category Grouping

| Test ID | Test Case | Expected Result | Pass/Fail |
|---------|-----------|-----------------|-----------|
| CG-01 | Results categorized by type | `categorizedResults` contains grouped sources | |
| CG-02 | Social media grouped correctly | Sources from Instagram, Facebook, Twitter in `socialPresence` | |
| CG-03 | Professional grouped correctly | Sources from LinkedIn, company sites in `professionalFootprint` | |
| CG-04 | Dating grouped correctly | Sources from dating platforms in `datingPresence` | |
| CG-05 | Legal grouped correctly | Court/public records in `legalRecords` | |
| CG-06 | Stats accurate | `categorizedStats.byCategory` counts match actual results | |
| CG-07 | URL deduplication works | Same URL not repeated across categories | |

**How to verify:**
```typescript
const result = await executeMultiPassSearch({ name: "Test Person", location: "NYC" }, id);

console.log("Categories with results:", result.categorizedStats.categoriesWithResults);
console.log("Results by category:", result.categorizedStats.byCategory);

// Verify no duplicate URLs
const allUrls = result.finalResult.sources.map(s => s.url).filter(Boolean);
const uniqueUrls = new Set(allUrls);
console.log(`Total URLs: ${allUrls.length}, Unique: ${uniqueUrls.size}`); // Should be equal
```

---

## 9. "Thin Results" Triggers Retry Passes

| Test ID | Test Case | Expected Result | Pass/Fail |
|---------|-----------|-----------------|-----------|
| TR-01 | < 3 sources with URLs triggers continuation | Search continues to next pass | |
| TR-02 | < 2 categories covered triggers continuation | Search continues to next pass | |
| TR-03 | >= 3 URLs + >= 2 categories = strong | `stoppedEarly: true` with strong results | |
| TR-04 | >= 5 total sources = strong | Can stop early even with fewer URLs | |
| TR-05 | All passes run if results remain thin | `passesExecuted` equals total pass count (8) | |
| TR-06 | Result strength logged per pass | `passResults[].resultStrength` populated | |

**How to verify:**
```typescript
// Test thin results behavior
const result = await executeMultiPassSearch({ name: "Unique Name XYZ123" }, id);

console.log(`Passes executed: ${result.passesExecuted}`);
console.log(`Stopped early: ${result.stoppedEarly}`);
console.log(`Stop reason: ${result.stopReason}`);

// Check result strength progression
result.passResults.forEach(p => {
  console.log(`${p.passName}: Strong=${p.resultStrength.isStrong}, URLs=${p.resultStrength.urlCount}, Categories=${p.resultStrength.categoriesCovered}`);
});
```

**Thin Results Criteria (from code):**
- Strong if: `urlCount >= 3 AND categoriesCovered >= 2`
- Strong if: `totalSources >= 5`
- Strong if: `urlCount >= 2 AND categoriesCovered >= 3`
- Otherwise: thin, continue to next pass

---

## 10. No Claims of Certainty When Identity Unclear

| Test ID | Test Case | Expected Result | Pass/Fail |
|---------|-----------|-----------------|-----------|
| IC-01 | Common name search | Response includes "possible match" or similar | |
| IC-02 | Multiple people found | Response acknowledges multiple results | |
| IC-03 | Identity ambiguity detected | `detectIdentityAmbiguity()` returns `detected: true` | |
| IC-04 | No "confirmed" for uncertain matches | Response avoids "confirmed" when ambiguous | |
| IC-05 | "Could not verify" used appropriately | Uncertain results labeled as unverified | |
| IC-06 | System prompt enforces uncertainty | DEEP_SEARCH_SYSTEM_PROMPT includes uncertainty rules | |

**How to verify:**
```typescript
import { detectIdentityAmbiguity } from "./deepSearchLogger";

// After search, check raw response
const result = await executeMultiPassSearch({ name: "John Smith", location: "California" }, id);
const ambiguity = detectIdentityAmbiguity(result.finalResult.rawResponse);

console.log(`Ambiguity detected: ${ambiguity.detected}`);
console.log(`Signals: ${ambiguity.signals.join(", ")}`);

// Signals to check for:
// - "Possible match mentioned"
// - "Multiple people found"
// - "Could not verify identity"
// - "Common name noted"
// - "Not confirmed"
```

**Ambiguity Phrases (from code):**
- "possible match"
- "may not be the same person"
- "could not verify"
- "unclear if this is"
- "multiple people with"
- "common name"
- "several results"
- "different person"
- "not confirmed"
- "unverified"

---

## Test Execution Summary

| Section | Tests | Passed | Failed | Notes |
|---------|-------|--------|--------|-------|
| 1. Query Volume | 4 | | | |
| 2. Username-First | 5 | | | |
| 3. Platform-Targeting | 5 | | | |
| 4. Dating Mirrors | 6 | | | |
| 5. Legal Portals | 8 | | | |
| 6. Archive Pass | 8 | | | |
| 7. Images Pass | 7 | | | |
| 8. Category Grouping | 7 | | | |
| 9. Thin Results | 6 | | | |
| 10. Identity Uncertainty | 6 | | | |
| **TOTAL** | **62** | | | |

---

## Quick Smoke Test

Run this single test to verify basic thoroughness:

```typescript
const input = {
  name: "Sarah Johnson",
  location: "Austin, TX",
  username: "sarahj_2023",
  county: "Travis County",
  middleInitial: "M",
};

const result = await executeMultiPassSearch(input, "test-person-id");

// Verify thoroughness
const checks = {
  minQueries: result.passResults.reduce((sum, p) => sum + p.queriesUsed.length, 0) >= 10,
  usernameFirst: result.passResults[0]?.passName === "Username First",
  platformPass: result.passResults.some(p => p.passName === "Platform Targeted"),
  datingPass: result.passResults.some(p => p.passName === "Dating Mirrors"),
  legalPass: result.passResults.some(p => p.passName === "Legal Records"),
  imagesPass: result.passResults.some(p => p.passName === "Images & Visual"),
  archivePass: result.passResults.some(p => p.passName === "Archived & Cached"),
  hasCategories: result.categorizedStats.categoriesWithResults.length > 0,
  multiplePassesRun: result.passesExecuted >= 3,
};

console.log("Smoke Test Results:", checks);
const allPassed = Object.values(checks).every(v => v === true);
console.log(`Overall: ${allPassed ? "PASS" : "FAIL"}`);
```

---

## Notes

- All tests assume the search service is properly configured with API keys
- Console logs (`[MultiPass]`) provide real-time debugging information
- Results depend on actual search API responses; mock data may be needed for unit tests
- Identity ambiguity detection runs on raw response text, not parsed results
