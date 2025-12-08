# Translations

This directory contains translation files managed by Crowdin.

## Structure

- `source.json` - Source strings (English) for Crowdin
- `<locale>/translations.json` - Translated strings downloaded from Crowdin

## Supported Locales

Crowdin will create subdirectories for each language as translations are completed:

- `en/` - English (source)
- `es/` - Spanish (UI translations)
- `fr/` - French
- `de/` - German
- etc.

## Adding New Strings

1. Add the new string to `source.json`
2. Push to the repository
3. Crowdin will automatically detect the new string
4. Translators can then provide translations

## Syncing Translations

Translations are automatically synced via the `update_content.yml` GitHub Action:

- Runs weekly (Sunday midnight UTC)
- Can be triggered manually

Or manually via Crowdin CLI:

```bash
crowdin download
```
