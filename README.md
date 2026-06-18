# yalose-flashcards
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

### Phase 3: The Integrations (Planned)
- GitHub Action to scrape RAE definitions
- Crowdin project integration for community translations

### Phase 4: PWA Polish (Planned)
- manifest.json for PWA installation
- Service Worker for offline caching
