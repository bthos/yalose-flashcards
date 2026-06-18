import { useState, useEffect, useCallback, useRef } from 'react'
// eslint-disable-next-line no-unused-vars -- used as JSX element
import FlashCard from './components/FlashCard'
// eslint-disable-next-line no-unused-vars -- used as JSX element
import LanguagePicker from './components/LanguagePicker'
import { clearOldEntries } from './utils/definitionsCache'
import {
  buildDeck,
  markKnown,
  markReview,
  migrateKnownWords,
  getEarliestNextReview,
} from './utils/srsEngine'
import { detectLocale, resolveTranslation } from './utils/translationsLoader'
import './App.css'

const SRS_STATE_KEY = 'yalose-srs-state';
const LEGACY_KNOWN_WORDS_KEY = 'yalose-known-words';
const VOCABULARY_VERSION_KEY = 'yalose-vocabulary-version';
const VOCABULARY_CACHE_KEY = 'yalose-vocabulary-slim-cache';
const SLIDE_ANIMATION_DURATION = 500; // milliseconds

// Locale / translation storage keys (AC13, AC8, AC9)
const LOCALE_KEY = 'yalose-locale';
const MANIFEST_CACHE_KEY = 'yalose-translations-manifest-cache';

// GitHub repository configuration - uses full vocabulary.json for version checking
const GITHUB_REPO_OWNER = 'bthos';
const GITHUB_REPO_NAME = 'yalose-flashcards';
const GITHUB_BRANCH = 'main';
const GITHUB_VOCABULARY_PATH = 'public/vocabulary-slim.json';
const GITHUB_MANIFEST_PATH = 'public/vocabulary-translations-manifest.json';

// Construct the GitHub raw URLs
const GITHUB_RAW_URL = `https://raw.githubusercontent.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/${GITHUB_BRANCH}/${GITHUB_VOCABULARY_PATH}`;
const GITHUB_MANIFEST_URL = `https://raw.githubusercontent.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/${GITHUB_BRANCH}/${GITHUB_MANIFEST_PATH}`;

/**
 * Build the translation file URL for a given locale.
 */
function translationFileUrl(locale) {
  return `https://raw.githubusercontent.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/${GITHUB_BRANCH}/public/vocabulary-translations-${locale}.json`;
}

/**
 * Load and migrate SRS state from localStorage.
 * - Migrates legacy yalose-known-words on first run (AC7).
 * - Returns merged srsState object.
 */
function loadAndMigrateSrsState() {
  const now = Date.now();

  // Load current SRS state (may be empty)
  let srsState = {};
  const stored = localStorage.getItem(SRS_STATE_KEY);
  if (stored) {
    try {
      srsState = JSON.parse(stored);
    } catch {
      srsState = {};
    }
  }

  // Migrate legacy known words if present (AC7)
  const legacyRaw = localStorage.getItem(LEGACY_KNOWN_WORDS_KEY);
  if (legacyRaw) {
    try {
      const legacyWords = JSON.parse(legacyRaw);
      if (Array.isArray(legacyWords) && legacyWords.length > 0) {
        const migrated = migrateKnownWords(legacyWords, now);
        // Merge — do not overwrite existing SRS entries
        for (const [id, entry] of Object.entries(migrated)) {
          if (!srsState[id]) {
            srsState[id] = entry;
          }
        }
        localStorage.setItem(SRS_STATE_KEY, JSON.stringify(srsState));
      }
    } catch {
      // Legacy data corrupt — ignore, still remove
    }
    localStorage.removeItem(LEGACY_KNOWN_WORDS_KEY);
  }

  return srsState;
}

/**
 * Format milliseconds remaining as a human-readable countdown string.
 * e.g. "2 h 14 min" or "3 days"
 */
function formatCountdown(ms) {
  if (ms <= 0) return 'soon';
  const totalMin = Math.ceil(ms / 60000);
  if (totalMin < 60) return `${totalMin} min`;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours < 24) {
    return mins > 0 ? `${hours} h ${mins} min` : `${hours} h`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days} d ${remHours} h` : `${days} day${days !== 1 ? 's' : ''}`;
}

function App() {
  const [fullVocab, setFullVocab] = useState(null); // all words from vocabulary file
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exitDirection, setExitDirection] = useState(null);
  const [hasTransitioned, setHasTransitioned] = useState(false);

  // --- Locale / translation state (AC8, AC9, AC12, AC13) ---
  // manifest: { version, locales: { [code]: { name, coverage } } } | null
  const [translationsManifest, setTranslationsManifest] = useState(null);
  // activeLocale: "en" | "<locale-code>"
  const [activeLocale, setActiveLocale] = useState(() => {
    return localStorage.getItem(LOCALE_KEY) || null; // null = not yet determined
  });
  // translationMap: { [wordId]: string } | null  — null when locale == "en"
  const [translationMap, setTranslationMap] = useState(null);

  // Stable refs so the keyboard effect (registered once) always calls the latest handlers.
  const handleKnownRef = useRef(null);
  const handleReviewRef = useRef(null);
  const currentWordRef = useRef(null);

  // SRS state: { [wordId]: { box, nextReview } }
  const [srsState, setSrsState] = useState(() => loadAndMigrateSrsState());

  // Session deck: words due now (or one casual word when empty)
  const [deck, setDeck] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // True when deck was empty at last build — triggers empty-state UI
  const [isDeckEmpty, setIsDeckEmpty] = useState(false);

  // Total vocabulary size for the "X due / Y total" counter (AC9)
  const [totalWordCount, setTotalWordCount] = useState(0);

  // Earliest upcoming nextReview ms (for empty-state countdown, AC5)
  const [earliestReview, setEarliestReview] = useState(null);

  // Rebuild deck from fullVocab + srsState whenever either changes
  const rebuildDeck = useCallback((vocab, state) => {
    if (!vocab) return;
    const now = Date.now();
    const due = buildDeck(vocab, state, now);
    const earliest = getEarliestNextReview(vocab, state, now);

    setEarliestReview(earliest);

    if (due.length > 0) {
      setIsDeckEmpty(false);
      setDeck(due);
      setCurrentIndex(prev => (prev >= due.length ? 0 : prev));
    } else {
      // Empty deck: pick a random word for casual practice (OQ2 / AC5)
      setIsDeckEmpty(true);
      const randomWord = vocab[Math.floor(Math.random() * vocab.length)];
      setDeck([randomWord]);
      setCurrentIndex(0);
    }
  }, []);

  useEffect(() => {
    // Function to load and process vocabulary data
    const loadVocabulary = (data) => {
      const words = data.words;
      setFullVocab(words);
      setTotalWordCount(words.length);
      rebuildDeck(words, srsState);
      setLoading(false);
    };

    // Function to fetch vocabulary from GitHub
    const fetchFromGitHub = async () => {
      const storedVersion = localStorage.getItem(VOCABULARY_VERSION_KEY);
      const cachedData = localStorage.getItem(VOCABULARY_CACHE_KEY);

      // If we have a cached version, use it while checking for updates in background
      if (storedVersion && cachedData) {
        try {
          loadVocabulary(JSON.parse(cachedData));
        } catch (cacheError) {
          // Cache corrupted, continue with fetch
          if (import.meta.env.DEV) {
            console.warn('Cache corrupted, using fresh data:', cacheError);
          }
        }
      }

      try {
        const response = await fetch(GITHUB_RAW_URL);
        if (!response.ok) {
          throw new Error('Failed to fetch from GitHub');
        }
        const data = await response.json();

        // Only update if version changed
        if (data.version && data.version !== storedVersion) {
          localStorage.setItem(VOCABULARY_VERSION_KEY, data.version);
          localStorage.setItem(VOCABULARY_CACHE_KEY, JSON.stringify(data));
          loadVocabulary(data);
        }
      } catch (fetchError) {
        // Fall back to local version if no cache and GitHub fails
        if (import.meta.env.DEV) {
          console.warn('GitHub fetch failed, falling back to local:', fetchError);
        }
        if (!cachedData) {
          fetchLocalVocabulary();
        }
      }
    };

    // Function to fetch vocabulary from local bundle
    const fetchLocalVocabulary = async () => {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}vocabulary-slim.json`);
        if (!response.ok) {
          throw new Error('Failed to load vocabulary data');
        }
        const data = await response.json();

        // Check if we should cache this
        const storedVersion = localStorage.getItem(VOCABULARY_VERSION_KEY);
        if (!storedVersion && data.version) {
          localStorage.setItem(VOCABULARY_VERSION_KEY, data.version);
          localStorage.setItem(VOCABULARY_CACHE_KEY, JSON.stringify(data));
        }

        loadVocabulary(data);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    // Clear stale IndexedDB entries (fire-and-forget)
    clearOldEntries();

    // Try GitHub first, fall back to local
    fetchFromGitHub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount — srsState is read from localStorage directly

  // AC8 — fetch translations manifest on startup; auto-detect locale
  useEffect(() => {
    const initTranslations = async () => {
      let manifest = null;

      // Try localStorage cache first
      const cached = localStorage.getItem(MANIFEST_CACHE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          manifest = parsed.data;
        } catch {
          // corrupt cache — ignore
        }
      }

      // Fetch fresh manifest from GitHub
      try {
        const res = await fetch(GITHUB_MANIFEST_URL);
        if (res.ok) {
          const fresh = await res.json();
          // Update cache if version changed or no cache existed
          if (!manifest || fresh.version !== manifest.version) {
            localStorage.setItem(MANIFEST_CACHE_KEY, JSON.stringify({ version: fresh.version, data: fresh }));
            manifest = fresh;
          }
        }
      } catch {
        // Network failure — use cached manifest (may be null)
      }

      // AC15 — if manifest is empty or fetch failed, hide picker and use en
      if (!manifest || !manifest.locales || Object.keys(manifest.locales).length === 0) {
        setTranslationsManifest(null);
        setActiveLocale('en');
        return;
      }

      setTranslationsManifest(manifest);

      // AC12 — determine locale: stored preference > auto-detect > en
      const storedLocale = localStorage.getItem(LOCALE_KEY);
      const available = Object.keys(manifest.locales);
      let locale;
      if (storedLocale && (storedLocale === 'en' || available.includes(storedLocale))) {
        locale = storedLocale;
      } else {
        locale = detectLocale(Array.from(navigator.languages || []), available);
      }

      setActiveLocale(locale);

      // AC9 — eager-fetch translation file for non-English locale
      if (locale !== 'en') {
        await loadTranslationFile(locale, manifest.locales[locale]?.version ?? manifest.version);
      }
    };

    initTranslations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  /**
   * Fetch (or load from localStorage cache) the translation file for a locale.
   * Sets translationMap state on success; on failure, silently keeps null (fallback to en).
   *
   * @param {string} locale
   * @param {string} manifestVersion — used as cache invalidation key
   */
  const loadTranslationFile = useCallback(async (locale, manifestVersion) => {
    const cacheKey = `yalose-translations-${locale}-cache`;

    // Check localStorage cache
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.version === manifestVersion) {
          setTranslationMap(parsed.data);
          return;
        }
      } catch {
        // corrupt — re-fetch
      }
    }

    // Fetch from GitHub
    try {
      const res = await fetch(translationFileUrl(locale));
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(cacheKey, JSON.stringify({ version: manifestVersion, data }));
        setTranslationMap(data);
      }
      // if not ok — silent fallback, translationMap stays null
    } catch {
      // silent fallback
    }
  }, []);

  /**
   * AC16 — Handle locale change from the picker.
   * Persists to localStorage, clears/loads translationMap, re-renders immediately.
   */
  const handleLocaleChange = useCallback(async (locale) => {
    if (locale === activeLocale) return;

    // AC13 — persist
    localStorage.setItem(LOCALE_KEY, locale);
    setActiveLocale(locale);

    if (locale === 'en') {
      setTranslationMap(null);
    } else {
      // Load translation file (uses cache when available)
      const manifestVersion = translationsManifest?.locales?.[locale]?.version
        ?? translationsManifest?.version
        ?? 'unknown';
      await loadTranslationFile(locale, manifestVersion);
    }
  }, [activeLocale, translationsManifest, loadTranslationFile]);

  const handleKnown = (wordId) => {
    // Prevent multiple clicks during animation
    if (exitDirection) return;

    // Mark that a transition has occurred
    setHasTransitioned(true);

    // Set exit direction for animation
    setExitDirection('right');

    setTimeout(() => {
      const now = Date.now();
      const newState = markKnown(srsState, wordId, now);
      setSrsState(newState);
      localStorage.setItem(SRS_STATE_KEY, JSON.stringify(newState));

      // Rebuild deck — remove word from session deck (advance index)
      if (fullVocab) {
        const due = buildDeck(fullVocab, newState, now);
        const earliest = getEarliestNextReview(fullVocab, newState, now);
        setEarliestReview(earliest);

        if (due.length > 0) {
          setIsDeckEmpty(false);
          // Remove the just-answered word and advance
          const remaining = due.filter(w => w.id !== wordId);
          if (remaining.length > 0) {
            setDeck(remaining);
            setCurrentIndex(prev => (prev >= remaining.length ? 0 : prev));
          } else {
            // All due words answered — flip to empty state
            setIsDeckEmpty(true);
            const randomWord = fullVocab[Math.floor(Math.random() * fullVocab.length)];
            setDeck([randomWord]);
            setCurrentIndex(0);
          }
        } else {
          setIsDeckEmpty(true);
          const randomWord = fullVocab[Math.floor(Math.random() * fullVocab.length)];
          setDeck([randomWord]);
          setCurrentIndex(0);
        }
      }

      setExitDirection(null);
    }, SLIDE_ANIMATION_DURATION);
  };

  const handleReview = (wordId) => {
    // Prevent multiple clicks during animation
    if (exitDirection) return;

    // Mark that a transition has occurred
    setHasTransitioned(true);

    // Set exit direction for animation
    setExitDirection('left');

    setTimeout(() => {
      const now = Date.now();
      const newState = markReview(srsState, wordId, now);
      setSrsState(newState);
      localStorage.setItem(SRS_STATE_KEY, JSON.stringify(newState));

      // Word stays in session deck — cycle to next card
      if (deck.length > 1) {
        setCurrentIndex((currentIndex + 1) % deck.length);
      }
      // If single-word deck (casual mode), stay on same card

      setExitDirection(null);
    }, SLIDE_ANIMATION_DURATION);
  };

  const handleReset = () => {
    // AC8: confirm dialog before clearing
    if (!window.confirm('Reset all spaced-repetition progress? This cannot be undone.')) return;

    localStorage.removeItem(SRS_STATE_KEY);
    const empty = {};
    setSrsState(empty);
    if (fullVocab) {
      rebuildDeck(fullVocab, empty);
    }
    setCurrentIndex(0);
  };

  // Sync refs every render so the keyboard effect always sees the latest values.
  handleKnownRef.current = handleKnown;
  handleReviewRef.current = handleReview;
  currentWordRef.current = deck[currentIndex] || deck[0];

  // AC7: keyboard arrow navigation alongside swipe.
  // Registered once; always reads the latest handler/word via refs.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'ArrowRight') handleKnownRef.current?.(currentWordRef.current?.id);
      else if (e.key === 'ArrowLeft') handleReviewRef.current?.(currentWordRef.current?.id);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []); // refs are always current — no deps needed

  if (loading) {
    return <div className="app-container"><p className="status">Loading...</p></div>;
  }

  if (error) {
    return <div className="app-container"><p className="status error">Error: {error}</p></div>;
  }

  if (!fullVocab || fullVocab.length === 0) {
    return (
      <div className="app-container">
        <header className="app-header">
          <h1>Yalose</h1>
          <p className="tagline">"I already know it!"</p>
        </header>
        <main className="app-main">
          <p className="status">No vocabulary data available.</p>
        </main>
      </div>
    );
  }

  const currentWord = deck[currentIndex] || deck[0];
  const dueCount = isDeckEmpty ? 0 : deck.length;

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Yalose</h1>
        <p className="tagline">"I already know it!"</p>
        {/* AC14, AC15 — picker only shown when manifest has locales */}
        <LanguagePicker
          manifest={translationsManifest}
          activeLocale={activeLocale || 'en'}
          onSelect={handleLocaleChange}
        />
      </header>
      <main className="app-main">
        {isDeckEmpty && (
          <div className="empty-state-banner">
            <p className="empty-state-message">Nothing due — come back later!</p>
            {earliestReview !== null && (
              <p className="empty-state-countdown">
                Next review in {formatCountdown(earliestReview - Date.now())}
              </p>
            )}
            <p className="empty-state-hint">Here is a word for casual practice:</p>
          </div>
        )}

        {currentWord && (
          <FlashCard
            key={currentWord.id}
            word={currentWord}
            translation={resolveTranslation(currentWord, translationMap)}
            onKnown={handleKnown}
            onReview={handleReview}
            exitDirection={exitDirection}
            hasTransitioned={hasTransitioned}
            boxNumber={srsState[currentWord.id]?.box ?? 0}
          />
        )}

        {/* AC9: "X due / Y total" counter */}
        <div className="navigation">
          <p className="word-counter">
            {dueCount} due / {totalWordCount} total
          </p>
        </div>

        {/* AC8: Reset progress button */}
        <button
          className="reset-button reset-button--subtle"
          onClick={handleReset}
        >
          Reset progress
        </button>
      </main>
    </div>
  );
}

export default App
