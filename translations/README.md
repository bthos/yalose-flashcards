# Translations

This directory contains translation files managed by Crowdin.

## Source Language

Spanish (es) is the source language. Source strings are original Spanish content
extracted from RAE (Real Academia Española).

## Structure

- `source.json` — Spanish UI strings (Crowdin source)
- `vocabulary/source.json` — Spanish vocabulary words with RAE context (Crowdin source, chrome_json format)
- `<locale>/translations.json` — Translated UI strings downloaded from Crowdin
- `vocabulary/<locale>/source.json` — Translated vocabulary words downloaded from Crowdin

## Vocabulary Source Format

`vocabulary/source.json` is a flat key-value JSON where each key is the word's MD5 hash and the value is the Spanish word:

```json
{
  "5f02f0889301fd7b": "de",
  "ec5e1e94c042dda3": "ella"
}
```

To look up context for a word during translation, use the RAE dictionary:
`https://dle.rae.es/{word}` (e.g. `https://dle.rae.es/de`).

## Supported Locales

Crowdin creates subdirectories for each target language as translations are completed:

- `en/` — English (with fallback to vocabulary.json `translations.en` field)
- `fr/` — French
- `de/` — German
- etc.

## Adding New Strings

1. Add the new Spanish string to `source.json`
2. Push to the repository
3. Crowdin automatically detects the new string
4. Translators provide translations in their language

## Syncing Translations

Translations are automatically synced via the `update_content.yml` GitHub Action:

- Runs weekly (Sunday midnight UTC)
- Can be triggered manually

Or manually via Crowdin CLI:

```bash
crowdin download
```
