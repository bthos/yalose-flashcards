# Implementation Plan: On-Demand RAE Definition Loading

## Overview

This plan addresses the performance issue of loading the large `vocabulary.json` file (~75,000 lines) by implementing lazy-loading of RAE definitions. Definitions will only be fetched when a user explicitly requests them by clicking "See definitions" on a flipped card.

## Goals

1. **Reduce initial payload** by 60-70% by removing definitions from the vocabulary file loaded at startup
2. **Improve perceived performance** by loading definitions on-demand
3. **Support offline mode** by caching fetched definitions in IndexedDB
4. **Maintain full vocabulary** for RAE scraper updates (Option B)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Build Time                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  vocabulary.json ──► build_slim_vocabulary.js ──┬──► vocabulary-slim.json (public/)
│  (full, 75K lines)                              │    (no definitions, ~25K lines)
│                                                 │
│                                                 └──► definitions.json (api/data/)
│                                                      (ID → definitions map)
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         Runtime                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  App.jsx                                                         │
│    │                                                             │
│    ├──► Load vocabulary-slim.json (initial, cached)             │
│    │                                                             │
│    └──► FlashCard.jsx                                            │
│           │                                                      │
│           ├──► Front: Spanish word                               │
│           │                                                      │
│           └──► Back (on flip):                                   │
│                 ├── Translation (immediate)                      │
│                 ├── Tags (immediate)                             │
│                 └── "See definitions" button                     │
│                       │                                          │
│                       └──► Click ──► Check IndexedDB cache       │
│                                        │                         │
│                                        ├── Hit ──► Show cached   │
│                                        │                         │
│                                        └── Miss ──► Fetch API    │
│                                                      │           │
│                                             /api/definition.js   │
│                                                      │           │
│                                             ┌────────┴────────┐  │
│                                             │ definitions.json │  │
│                                             └─────────────────┘  │
│                                                      │           │
│                                             ◄────────┘           │
│                                             Cache in IndexedDB   │
│                                             Show definitions     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Build Script for Slim Vocabulary

### File: `scripts/build_slim_vocabulary.js`

**Purpose:** Generate two output files from the full `vocabulary.json`:

1. `public/vocabulary-slim.json` - For app loading (no definitions)
2. `api/data/definitions.json` - For serverless function lookup

**Implementation Details:**

```javascript
// Input
{
  "version": "hash",
  "words": [
    {
      "id": "abc123",
      "word": "correr",
      "frequency_rank": 450,
      "rae_link": "https://dle.rae.es/correr",
      "definitions": ["Desplazarse rápidamente..."],
      "translations": { "en": "to run" },
      "tags": ["verb"]
    }
  ]
}

// Output 1: vocabulary-slim.json
{
  "version": "hash",
  "words": [
    {
      "id": "abc123",
      "word": "correr",
      "frequency_rank": 450,
      "translations": { "en": "to run" },
      "tags": ["verb"]
    }
  ]
}

// Output 2: definitions.json
{
  "abc123": {
    "definitions": ["Desplazarse rápidamente..."],
    "rae_link": "https://dle.rae.es/correr"
  }
}
```

**Tasks:**

- [ ] Create `scripts/build_slim_vocabulary.js`
- [ ] Add npm script: `"build:vocabulary": "node scripts/build_slim_vocabulary.js"`
- [ ] Add to CI workflow to run before build
- [ ] Create `api/data/` directory structure

---

## Phase 2: Vercel Serverless Function

### File: `api/definition.js`

**Purpose:** Return definitions for a given word ID with CDN caching.

**Implementation Details:**

```javascript
// GET /api/definition?wordId=abc123

// Response (200 OK)
{
  "definitions": ["Desplazarse rápidamente..."],
  "rae_link": "https://dle.rae.es/correr"
}

// Response (404 Not Found)
{
  "error": "Word not found",
  "definitions": []
}
```

**Headers:**

```
Cache-Control: public, s-maxage=86400, stale-while-revalidate=604800
```

- CDN caches for 24 hours
- Serves stale content for up to 7 days while revalidating

**Tasks:**

- [ ] Create `api/definition.js` serverless function
- [ ] Create `api/data/definitions.json` (generated by build script)
- [ ] Update `vercel.json` with function configuration
- [ ] Add error handling for missing words
- [ ] Test locally with `vercel dev`

### File: `vercel.json` (updated)

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npm run build:vocabulary && npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm ci",
  "framework": "vite",
  "functions": {
    "api/definition.js": {
      "memory": 256,
      "maxDuration": 5
    }
  }
}
```

---

## Phase 3: IndexedDB Caching Layer

### File: `src/utils/definitionsCache.js`

**Purpose:** Provide offline-first caching for definitions using IndexedDB.

**Implementation Details:**

```javascript
// Database structure
const DB_NAME = 'yalose-definitions';
const DB_VERSION = 1;
const STORE_NAME = 'definitions';

// Schema
{
  wordId: string,        // Primary key
  definitions: string[], // Array of definition strings
  rae_link: string,      // Link to RAE page
  cachedAt: number,      // Timestamp for LRU eviction
}

// API
export async function getCachedDefinition(wordId): Promise<CachedDefinition | null>
export async function cacheDefinition(wordId, data): Promise<void>
export async function clearOldEntries(maxAge: number): Promise<void>
export async function getCacheSize(): Promise<number>
```

**Cache Eviction Strategy:**

- Maximum 1000 entries (configurable)
- LRU (Least Recently Used) eviction when limit reached
- Optional: Clear entries older than 30 days on app startup

**Tasks:**

- [ ] Create `src/utils/definitionsCache.js`
- [ ] Implement IndexedDB wrapper with async/await
- [ ] Add LRU eviction logic
- [ ] Handle IndexedDB errors gracefully (fallback to memory-only)
- [ ] Add cache cleanup on app startup

---

## Phase 4: Update App.jsx for Slim Vocabulary

### File: `src/App.jsx`

**Changes Required:**

1. Update GitHub raw URL to point to `vocabulary-slim.json`
2. Update localStorage cache key to avoid conflicts with old cache
3. Remove references to `definitions` in initial data processing

**Before:**

```javascript
const VOCABULARY_FILE_PATH = 'public/vocabulary.json';
```

**After:**

```javascript
const VOCABULARY_FILE_PATH = 'public/vocabulary-slim.json';
const VOCABULARY_CACHE_KEY = 'yalose-vocabulary-slim-cache';
```

**Tasks:**

- [ ] Update vocabulary file path constant
- [ ] Update cache key to force re-fetch of slim version
- [ ] Update version comparison logic if needed
- [ ] Test that app loads correctly without definitions in initial data

---

## Phase 5: Update FlashCard Component

### File: `src/components/FlashCard.jsx`

**Changes Required:**

1. Add "See definitions" button on card back
2. Add loading state for definitions
3. Add definition display area (expandable)
4. Integrate with IndexedDB cache
5. Fetch from API on cache miss

**New Component State:**

```javascript
const [showDefinitions, setShowDefinitions] = useState(false);
const [definitions, setDefinitions] = useState(null);
const [definitionsLoading, setDefinitionsLoading] = useState(false);
const [definitionsError, setDefinitionsError] = useState(null);
```

**UI Flow:**

```
┌─────────────────────────────┐
│        Card Back            │
├─────────────────────────────┤
│                             │
│   Translation: "to run"     │
│                             │
│   Tags: [verb] [movement]   │
│                             │
│   ┌───────────────────────┐ │
│   │  📖 See definitions   │ │  ◄── Button (clickable)
│   └───────────────────────┘ │
│                             │
└─────────────────────────────┘

         ▼ (after click)

┌─────────────────────────────┐
│        Card Back            │
├─────────────────────────────┤
│                             │
│   Translation: "to run"     │
│                             │
│   Tags: [verb] [movement]   │
│                             │
│   ┌───────────────────────┐ │
│   │  📖 Definitions ▲     │ │  ◄── Expanded header
│   ├───────────────────────┤ │
│   │ 1. Desplazarse        │ │
│   │    rápidamente...     │ │
│   │                       │ │
│   │ 2. Dicho de un        │ │
│   │    líquido...         │ │
│   │                       │ │
│   │ 🔗 Ver en RAE         │ │  ◄── Link to full RAE page
│   └───────────────────────┘ │
│                             │
└─────────────────────────────┘
```

**Loading States:**

```
[📖 See definitions]     → Initial state
[⏳ Loading...]          → Fetching from API
[📖 Definitions ▲]       → Loaded, expanded
[❌ Could not load]      → Error state with retry option
```

**Tasks:**

- [ ] Add "See definitions" button component
- [ ] Add definitions display area (collapsible)
- [ ] Implement `fetchDefinitions()` function
- [ ] Integrate with `definitionsCache.js`
- [ ] Add loading spinner/skeleton
- [ ] Add error state with retry button
- [ ] Add RAE link at bottom of definitions
- [ ] Style new elements to match existing design
- [ ] Prevent card flip when clicking definitions area

---

## Phase 6: Update FlashCard CSS

### File: `src/components/FlashCard.css`

**New Styles Needed:**

```css
/* Definitions button */
.definitions-button { }
.definitions-button:hover { }
.definitions-button.loading { }

/* Definitions panel */
.definitions-panel { }
.definitions-panel.expanded { }
.definitions-header { }
.definitions-list { }
.definition-item { }

/* Loading state */
.definitions-loading { }
.definitions-spinner { }

/* Error state */
.definitions-error { }
.definitions-retry { }

/* RAE link */
.rae-link { }
```

**Tasks:**

- [ ] Style "See definitions" button
- [ ] Add expand/collapse animation
- [ ] Style definitions list
- [ ] Add loading spinner animation
- [ ] Style error state
- [ ] Ensure touch-friendly tap targets (min 44px)
- [ ] Test on mobile viewports

---

## Phase 7: Offline Support & PWA

### Service Worker Updates

**Caching Strategy:**

- `vocabulary-slim.json` → Cache First (with background update)
- `/api/definition` → Network First, fall back to IndexedDB
- Static assets → Cache First

**Offline Behavior:**

1. App loads from cache (vocabulary-slim.json)
2. User flips card → Translation/tags show immediately
3. User clicks "See definitions":
   - Check IndexedDB → If found, show cached
   - If not found → Show "Definitions available online only" message
4. When back online → Fetch and cache definitions normally

**Tasks:**

- [ ] Update service worker caching strategy (if exists)
- [ ] Add offline detection in FlashCard component
- [ ] Show appropriate message when offline and no cache
- [ ] Consider pre-caching definitions for "top 100" words

---

## File Structure After Implementation

```
yalose-flashcards/
├── api/
│   ├── data/
│   │   └── definitions.json          # Generated: ID → definitions map
│   └── definition.js                  # Serverless function
├── public/
│   ├── vocabulary.json                # Full vocabulary (for scraper)
│   └── vocabulary-slim.json           # Generated: slim version for app
├── scripts/
│   ├── fetch_rae_definitions.js       # Existing: RAE scraper
│   └── build_slim_vocabulary.js       # New: generates slim + definitions
├── src/
│   ├── components/
│   │   ├── FlashCard.jsx              # Updated: lazy loading
│   │   └── FlashCard.css              # Updated: new styles
│   ├── utils/
│   │   └── definitionsCache.js        # New: IndexedDB cache
│   └── App.jsx                        # Updated: load slim vocabulary
├── vercel.json                        # Updated: function config
└── package.json                       # Updated: new build script
```

---

## Migration & Rollout

### Step 1: Development

1. Implement all phases on `dev` branch
2. Test locally with `vercel dev`
3. Verify IndexedDB caching works
4. Test offline scenarios

### Step 2: QA Testing

1. Merge to `qa` branch
2. Test on Vercel preview deployment
3. Verify API caching headers work
4. Test on various devices/browsers
5. Measure performance improvements

### Step 3: Production

1. Merge to `main` branch
2. Monitor API usage in Vercel dashboard
3. Watch for errors in browser console
4. Gather user feedback

### Rollback Plan

- Keep full `vocabulary.json` as source of truth
- If issues arise, revert to loading full vocabulary
- IndexedDB cache can be cleared via app settings

---

## Performance Expectations

| Metric | Before | After |
|--------|--------|-------|
| Initial vocabulary payload | ~1.5 MB | ~500 KB |
| Time to first card | ~3-5s | ~1-2s |
| Definitions load time | 0 (pre-loaded) | ~200-500ms (API) |
| Offline support | Full | Partial (cached only) |

---

## Testing Checklist

### Unit Tests

- [ ] `build_slim_vocabulary.js` generates correct output
- [ ] `definitionsCache.js` IndexedDB operations work
- [ ] API returns correct definitions for valid IDs
- [ ] API returns 404 for invalid IDs

### Integration Tests

- [ ] App loads with slim vocabulary
- [ ] Card flip shows translation and tags
- [ ] "See definitions" fetches and displays
- [ ] Definitions are cached in IndexedDB
- [ ] Subsequent views use cache
- [ ] RAE link opens correct page

### E2E Tests

- [ ] Full user flow from load to definitions view
- [ ] Offline mode with cached definitions
- [ ] Offline mode without cached definitions
- [ ] Cache eviction works correctly

### Performance Tests

- [ ] Measure initial load time
- [ ] Measure API response time
- [ ] Measure cache hit/miss ratio
- [ ] Verify CDN caching works

---

## Dependencies

No new npm dependencies required. Uses:

- Native `fetch` API
- Native `IndexedDB` API
- Vercel serverless functions (built-in)

---

## Estimated Effort

| Phase | Effort | Priority |
|-------|--------|----------|
| Phase 1: Build Script | 2 hours | High |
| Phase 2: Serverless Function | 2 hours | High |
| Phase 3: IndexedDB Cache | 3 hours | High |
| Phase 4: App.jsx Updates | 1 hour | High |
| Phase 5: FlashCard Updates | 4 hours | High |
| Phase 6: CSS Styling | 2 hours | Medium |
| Phase 7: Offline Support | 2 hours | Medium |
| Testing & QA | 4 hours | High |
| **Total** | **~20 hours** | |

---

## Open Questions

1. **Cache size limit:** Is 1000 definitions enough? Should we increase for power users?

2. **Pre-caching:** Should we pre-fetch definitions for top 100/500 words in the background?

3. **Analytics:** Should we track definition view rates to prioritize scraping?

4. **Translations in definitions:** Current definitions are Spanish-only. Should we consider translating them via Crowdin in the future?
