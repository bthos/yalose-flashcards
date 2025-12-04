# Product Requirements Document: YaLoSé

## 1. Executive Summary
**YaLoSé** ("I already know it") is a lightweight, offline-first Flash Memory PWA designed to help users master Spanish vocabulary. The app focuses on high-frequency words, utilizing data from the Real Academia Española (RAE) and community translations via Crowdin. It is architected to be hosted 100% free on GitHub Pages.

## 2. Technical Architecture
*   **Type:** Progressive Web App (PWA).
*   **Framework:** React.js (Vite) or Vue.js (lightweight, fast).
*   **Hosting:** GitHub Pages (Static site hosting).
*   **Database (Content):** JSON files hosted in the GitHub Repository.
*   **Database (User Progress):** Browser `localStorage` and `IndexedDB` (for persistence without a login server).
*   **CI/CD:** GitHub Actions (to build the PWA and fetch latest Crowdin translations).

## 3. Data Structure (The "Source of Truth")
The app relies on a specific file structure hosted in the repository.

### 3.1. `vocabulary.json`
This is the master file.
```json
[
  {
    "id": "unique_hash_001",
    "word": "correr",
    "frequency_rank": 450,
    "rae_link": "https://dle.rae.es/correr",
    "definitions": [
      "Desplazarse rápidamente con pasos largos."
    ],
    "translations": {
      "en": "to run",
      "fr": "courir"
    },
    "tags": ["verb", "movement"]
  }
]
```

## 4. Functional Requirements

### 4.1. Core Gameplay (The Flashcard)
*   **FR-01: Card Display:**
    *   **Front:** Displays the Spanish word in large, bold typography.
    *   **Back:** Displays the Translation OR the RAE Definition (toggleable by user).
*   **FR-02: Interaction:**
    *   Tap to flip.
    *   Swipe Right (or "Ya lo sé" button): Marks word as Known.
    *   Swipe Left (or "Repasar" button): Keeps word in the rotation.
*   **FR-03: Spaced Repetition (Lite):**
    *   Since there is no backend, the app uses a simplified Leitner system stored in `localStorage`.
    *   Words marked "Known" appear less frequently.

### 4.2. Data Sources & Integration
*   **FR-04: GitHub Source:**
    *   On app launch, the app fetches the raw `vocabulary.json` from the GitHub repository URL.
    *   It compares the version hash to the local version to determine if an update is needed.
*   **FR-05: RAE Integration (The "Frequency" Logic):**
    *   *Constraint:* Direct scraping of `dle.rae.es` from a client-side browser is blocked by CORS and security policies.
    *   *Solution:* The app includes a **"Frequency Filter"**. The `vocabulary.json` must be pre-populated with the top 5,000 words from the CREA (Corpus de Referencia del Español Actual).
    *   **Feature:** "Deep Dive" button. When viewing a card, clicking an RAE icon opens `dle.rae.es/[word]` in a new tab or iframe (if permitted) for deep study.
*   **FR-06: Crowdin Integration:**
    *   The app supports multiple interface languages and translation targets.
    *   **Mechanism:** A GitHub Action runs nightly. It uses the Crowdin CLI to pull approved translations and updates `vocabulary.json` automatically. The app does not query Crowdin API at runtime (to save API limits and speed).

### 4.3. User Configuration
*   **FR-07: Mode Toggle:** User can switch the "Back of Card" content between:
    1.  Translation (English/Native).
    2.  Definition (Spanish - for advanced immersion).
    3.  Mixed (Both).
*   **FR-08: Difficulty Filter:** User can select "Top 100 words", "Top 1000 words", etc., based on the `frequency_rank` field.

## 5. UI/UX Design Guidelines
*   **Theme:** "Flash" aesthetic. High contrast.
    *   *Primary Color:* Electric Yellow / Amber (Energy).
    *   *Secondary:* Deep Purple or Dark Mode Black (Focus).
*   **Animations:** Fast, snappy CSS transitions (0.2s). No sluggish fades.
*   **Mobile First:** Large touch targets for thumbs.

## 6. GitHub Actions Workflow (Automation)
To maintain the "No Hosting Required" requirement, logic moves to the build pipeline.

**Workflow File: `.github/workflows/update_content.yml`**
1.  **Trigger:** Schedule (Weekly) or Manual Dispatch.
2.  **Step 1:** Checkout code.
3.  **Step 2:** Run script `fetch_rae_definitions.js`.
    *   *Logic:* Iterates through `vocabulary.json`. If a word lacks a definition, it uses a server-side scraper (Puppeteer) to fetch the definition from RAE and save it to the JSON.
4.  **Step 3:** Run Crowdin CLI to fetch translations.
5.  **Step 4:** Commit updated `vocabulary.json` back to the repo.
6.  **Step 5:** Rebuild and Deploy to GitHub Pages.

## 7. Implementation Roadmap

### Phase 1: The Skeleton
*   Setup React + Vite repo.
*   Create the JSON schema.
*   Build the Card Component (Flip animation).
*   Implement `localStorage` logic for "Known/Unknown".

### Phase 2: The Content
*   Populate the initial JSON with the top 100 most frequent Spanish words.
*   Implement the "Fetch from GitHub" logic in the app.

### Phase 3: The Integrations
*   Set up the GitHub Action to scrape RAE definitions (server-side build step).
*   Set up Crowdin project and link it to the repo.

### Phase 4: PWA Polish
*   Add `manifest.json` (Icon, Name "YaLoSé", Theme Color).
*   Register Service Worker for offline caching.