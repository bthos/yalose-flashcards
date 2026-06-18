/**
 * build_vocabulary_source.js
 *
 * Build-time script (AC1, AC2).
 * Reads public/vocabulary.json and writes translations/vocabulary/source.json
 * as a flat { wordId: "spanish word" } map for Crowdin.
 *
 * The source language is Spanish (es). Translators see the Spanish word and
 * provide a translation in their target language.
 *
 * Usage:
 *   node scripts/build_vocabulary_source.js
 *
 * Exports:
 *   buildVocabularySource(words) → { [id]: string }
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

/**
 * Build the Crowdin source map from vocabulary words.
 * Keys are word ids; values are the Spanish words (source strings).
 *
 * @param {Array<{ id: string, word: string }>} words
 * @returns {{ [id: string]: string }}
 */
export function buildVocabularySource(words) {
  const result = {};
  for (const word of words) {
    result[word.id] = word.word;
  }
  return result;
}

/**
 * Main entry point — reads vocabulary.json, writes source.json.
 */
function main() {
  const vocabPath = join(PROJECT_ROOT, 'public', 'vocabulary.json');
  const outDir = join(PROJECT_ROOT, 'translations', 'vocabulary');
  const outPath = join(outDir, 'source.json');

  console.log('Reading vocabulary from:', vocabPath);
  const raw = readFileSync(vocabPath, 'utf-8');
  const data = JSON.parse(raw);
  const words = data.words;

  if (!Array.isArray(words) || words.length === 0) {
    console.error('No words found in vocabulary.json');
    process.exit(1);
  }

  const source = buildVocabularySource(words);

  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, JSON.stringify(source, null, 2), 'utf-8');

  console.log(`Wrote ${Object.keys(source).length} entries to ${outPath}`);
}

// Run main only when this file is executed directly (not imported by tests)
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
