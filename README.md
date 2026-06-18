# yalose-flashcards [![Crowdin](https://badges.crowdin.net/yalose/localized.svg)](https://crowdin.com/project/yalose)
Yalosé ("I already know it") is a lightweight, offline-first Flashcards Word Memory PWA designed to help users master Spanish vocabulary. The app focuses on high-frequency words, utilizing data from the Real Academia Española (RAE) and community translations via Crowdin. It is architected to be hosted 100% free on GitHub Pages.

## How spaced repetition works

Yalosé uses a 5-box Leitner system to show you words exactly when you are about to forget them — no more, no less.

### The five boxes

| Box | Review interval | What it means |
|-----|----------------|---------------|
| 1   | Every session  | Brand new or recently forgotten — you will see this word today |
| 2   | 2 days         | Starting to stick |
| 3   | 4 days         | Getting comfortable |
| 4   | 8 days         | Almost mastered |
| 5   | 16 days        | Well known — only an occasional check-in |

Every word starts without a box. The first time you tap "Ya lo sé" it enters box 1. Each subsequent "Ya lo sé" moves it one box higher and pushes the next review further into the future. Tapping "Repasar" sends the word straight back to box 1, due immediately.

The current box is shown as a small **"Box N"** badge on the card so you can always see where a word stands.

### The session counter

The counter below the card reads **"X due / Y total"**:
- **due** — how many words are scheduled for today's session.
- **total** — the full vocabulary size.

Work through the due words at your own pace. There is no penalty for stopping mid-session; your progress is saved automatically.

### When nothing is due

Once you have reviewed all scheduled words the app shows:

> Nothing due — come back later!

A countdown tells you when the next word is due (for example, "Next review in 2 h 14 min"). To keep things interesting, a single word from the full vocabulary is shown for casual practice — answering it still counts toward your SRS progress.

### Resetting your progress

The **Reset progress** button at the bottom of the screen clears all spaced-repetition data after a confirmation prompt. This is useful if you want to start fresh. The action cannot be undone.

### Upgrading from an older version

If you used Yalosé before spaced repetition was added, your previously marked words are migrated automatically on first load. They are placed into box 3 (due in 4 days) so you are not immediately flooded with reviews.

## Features

### Phase 1: The Skeleton
- React + Vite setup
- JSON schema for vocabulary data
- Card Component with flip animation
- localStorage logic for "Known/Unknown" words tracking

### Phase 2: The Content
- **5000 Spanish words** populated in vocabulary.json, including the top 100 most frequent words
- **GitHub vocabulary fetching** with automatic update detection:
  - Fetches `vocabulary-slim.json` (~200 KB) from GitHub on app launch
  - Compares version hashes to detect updates
  - Caches vocabulary in localStorage for offline use (key: `yalose-vocabulary-slim-cache`)
  - Falls back to bundled version if GitHub is unavailable
- **Smart caching**: Only updates when a new version is detected

### Phase 3: Spaced Repetition
- **5-box Leitner system** — words you know well are reviewed less often
- **Session deck** — only words due today are shown
- **Box badge** — current box number visible on every card
- **Empty state** — countdown to next review + one casual word when nothing is due
- **Reset progress** — clear all SRS data with one button

### Phase 4: Multiple languages

Yalosé shows the meaning of each Spanish word in your language, not just English. Translations are contributed by community volunteers on [Crowdin](https://crowdin.com) and are updated automatically each week when new translations are approved.

#### Switching language

1. Open Yalosé in your browser.
2. The app detects your browser language automatically on first load (for example, a browser set to `fr-CA` will use French).
3. To change language, tap the language button in the top-right corner of the header. It shows the two-letter code of the active language (for example, `EN`).
4. A dropdown lists all available languages. Select one to switch immediately — no page reload needed.
5. Your choice is saved locally and restored on your next visit.

If the language list is unavailable (for example, you are fully offline with no cached data), the button is hidden and English is used automatically.

#### Coverage

Each community language shows a completion percentage in the picker. This reflects how many of the 5 000 words have a confirmed translation. English is always 100% — it is the authoritative source. Other languages may be partial; the card falls back silently to English for any untranslated word, so you can always study even when a language is incomplete.

## Install as app

Yalosé is a Progressive Web App (PWA). You can add it to your home screen or desktop and use it like a native app — no app store required.

### Android

1. Open Yalosé in Chrome (or any Chromium-based browser).
2. A banner appears at the bottom of the screen after a moment — tap **Install**.
3. Alternatively, tap the browser menu (three dots) and select **Add to Home screen**.
4. Confirm the prompt. The app appears on your home screen and opens in standalone mode (no browser chrome).

### Desktop (Chrome / Edge)

1. Open Yalosé in Chrome or Edge.
2. Look for the install icon in the address bar (a small screen with a plus sign) and click it.
3. Click **Install** in the confirmation dialog.
4. The app opens in its own window and appears in your app launcher.

### iOS (Safari)

1. Open Yalosé in Safari on iPhone or iPad.
2. Tap the **Share** button (the square with an arrow pointing up).
3. Scroll down and tap **Add to Home Screen**.
4. Confirm the name and tap **Add**.
5. The app icon appears on your home screen and opens without the Safari UI.

> iOS does not support the automatic install prompt. You must use the Share sheet.

### Offline use

Once installed (or after your first visit in a browser), Yalosé works without a network connection.

| Feature | Offline? |
|---------|---------|
| All vocabulary cards | Yes — pre-cached |
| Spaced-repetition progress | Yes — stored locally |
| Language translations | Yes — cached on first load |
| RAE definitions (tap-to-reveal) | Cached fallback — last 500 lookups kept for 7 days |
| Vocabulary updates from GitHub | No — requires network |

### App updates

When a new version of Yalosé is published, the Service Worker downloads it in the background. The update activates the next time you close and reopen the app — there is no forced reload while you are studying.

## Contributing translations

Yalosé relies on volunteer translators to make the vocabulary available in languages other than English.

### What you are translating

Each entry is a short word meaning — the kind you would find in a pocket dictionary. You are not writing a definition or an example sentence. The source text is a brief English equivalent of a Spanish word.

| Spanish word | English source (what you see) | Your translation (what you write) |
|---|---|---|
| de | of, from | de, à partir de (French example) |
| ella | she | elle (French example) |
| que | that, which | que, qui (French example) |

Keep translations short and direct. Two or three equivalents separated by a comma are fine; a sentence is too long.

**Format rules:**
- Short, dictionary-style — match the brevity of the source string
- Multiple equivalents are comma-separated: `of, from` not `of or from`
- No trailing punctuation
- No explanations or grammar notes in the translation field itself

### Getting started

1. Visit the project on Crowdin (link added when the Crowdin project is public).
2. Select your language.
3. Translate strings one at a time — you can save a partial session and return later.
4. Approved translations appear in the app within the next scheduled CI run (every Sunday at midnight UTC).

There is no manual step required from you after you submit a translation on Crowdin.

### How the automation cycle works

```
public/vocabulary.json (English meanings)
       │
       ▼  npm run build:vocabulary-source  (runs as part of CI and local prebuild)
translations/vocabulary/source.json        ← Crowdin source file
       │
       │  Crowdin (your translations are saved here)
       ▼
translations/vocabulary/{locale}/source.json   ← Crowdin output per language
       │
       ▼  npm run build:translations  (runs in CI after Crowdin sync)
public/vocabulary-translations-{locale}.json   ← committed to the repo
public/vocabulary-translations-manifest.json   ← locale list + coverage %
       │
       ▼  app loads your translations
```

## Development

### Install dependencies
```bash
npm install
```

### Run development server
```bash
npm run dev
```

### Build for production
```bash
npm run build
```

The `build` command runs a `prebuild` step that regenerates two derived files before compiling:

- `npm run build:vocabulary-source` — reads `public/vocabulary.json` and writes `translations/vocabulary/source.json`, the flat `{ wordId: "english meaning" }` map used as the Crowdin source file.
- `npm run build:vocabulary` — generates the slim vocabulary bundle (`public/vocabulary-slim.json`).

You can also run either step independently.

To regenerate the per-locale translation files from locally synced Crowdin output:

```bash
npm run build:translations
```

This reads all `translations/vocabulary/*/source.json` files and writes `public/vocabulary-translations-{locale}.json` plus `public/vocabulary-translations-manifest.json`. Running it when no locale output is present produces an empty manifest and is safe to do locally.

### Lint code
```bash
npm run lint
```

## Data Structure

The vocabulary data follows an envelope format used in both `public/vocabulary.json` (full, build-time source) and `public/vocabulary-slim.json` (runtime-fetched, ~200 KB subset without definitions):

```json
{
  "version": "hash",
  "words": [
    {
      "id": "unique_hash",
      "word": "correr",
      "frequency_rank": 450,
      "rae_link": "https://dle.rae.es/correr",
      "definitions": ["Desplazarse rápidamente con pasos largos."],
      "translations": {
        "en": "to run",
        "fr": "courir"
      },
      "tags": ["verb", "movement"]
    }
  ]
}
```

## Roadmap

See [PRD.md](.github/PRD.md) for the full product requirements document.

### Phase 3: The Integrations
- GitHub Action to scrape RAE definitions
- Crowdin integration for community vocabulary translations (shipped in v0.3.1)

### Phase 4: PWA Polish
- App is installable on Android, desktop, and iOS as a standalone PWA
- Service Worker (Workbox, via vite-plugin-pwa) pre-caches all app assets
- Offline indicator shown when network is unavailable
- Install prompt surfaced automatically on supported browsers
