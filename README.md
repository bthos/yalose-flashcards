# yalose-flashcards
Yalosé ("I already know it") is a lightweight, offline-first Flashcards Word Memory PWA designed to help users master Spanish vocabulary. The app focuses on high-frequency words, utilizing data from the Real Academia Española (RAE) and community translations via Crowdin. It is architected to be hosted 100% free on GitHub Pages.

## Features

### Phase 1: The Skeleton ✅
- React + Vite setup
- JSON schema for vocabulary data
- Card Component with flip animation
- localStorage logic for "Known/Unknown" words tracking

### Phase 2: The Content ✅
- **5000 Spanish words** populated in vocabulary.json, including the top 100 most frequent words
- **GitHub vocabulary fetching** with automatic update detection:
  - Fetches vocabulary from GitHub repository on app launch
  - Compares version hashes to detect updates
  - Caches vocabulary in localStorage for offline use
  - Falls back to bundled version if GitHub is unavailable
- **Smart caching**: Only updates when a new version is detected

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

The vocabulary data is stored in `public/vocabulary.json` with the following structure:

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
