/**
 * crowdin_set_context.js
 *
 * After `crowdin upload sources`, sets the RAE dictionary URL as the context
 * field on each vocabulary string in Crowdin so translators have a direct link
 * to the Spanish word's definition.
 *
 * Context format: https://dle.rae.es/{word}
 *
 * Strings already carrying the correct context are skipped (idempotent).
 *
 * Usage:
 *   CROWDIN_PROJECT_ID=<id> CROWDIN_PERSONAL_TOKEN=<token> node scripts/crowdin_set_context.js
 *
 * Exports (for testing):
 *   buildRaeUrl(word)
 *   filterVocabularyStrings(crowdinStrings, sourceMap)
 *   stringsNeedingUpdate(crowdinStrings, sourceMap)
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

const API_BASE = 'https://api.crowdin.com/api/v2';
const PAGE_SIZE = 500;
const PATCH_DELAY_MS = 120; // ~8 req/s, well within Crowdin rate limits

export function buildRaeUrl(word) {
  return `https://dle.rae.es/${encodeURIComponent(word)}`;
}

/**
 * From a page of Crowdin string items, return those whose identifier
 * exists in sourceMap (vocabulary strings only).
 */
export function filterVocabularyStrings(crowdinStrings, sourceMap) {
  return crowdinStrings.filter(item => item.data.identifier in sourceMap);
}

/**
 * From vocabulary strings, return those whose context needs updating.
 */
export function stringsNeedingUpdate(vocabStrings, sourceMap) {
  return vocabStrings.filter(item => {
    const word = sourceMap[item.data.identifier];
    return item.data.context !== buildRaeUrl(word);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchStringsPage(projectId, token, offset) {
  const url = `${API_BASE}/projects/${projectId}/strings?limit=${PAGE_SIZE}&offset=${offset}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`GET /strings failed ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function patchStringContext(projectId, token, stringId, context) {
  const url = `${API_BASE}/projects/${projectId}/strings/${stringId}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{ op: 'replace', path: '/context', value: context }]),
  });
  if (!res.ok) {
    throw new Error(`PATCH /strings/${stringId} failed ${res.status}: ${await res.text()}`);
  }
}

async function main() {
  const projectId = process.env.CROWDIN_PROJECT_ID;
  const token = process.env.CROWDIN_PERSONAL_TOKEN;

  if (!projectId || !token) {
    console.error('CROWDIN_PROJECT_ID and CROWDIN_PERSONAL_TOKEN must be set');
    process.exit(1);
  }

  const sourcePath = join(PROJECT_ROOT, 'translations', 'vocabulary', 'source.json');
  const sourceMap = JSON.parse(readFileSync(sourcePath, 'utf-8'));
  console.log(`Loaded ${Object.keys(sourceMap).length} vocabulary entries`);

  console.log('Fetching strings from Crowdin...');
  const allStrings = [];
  let offset = 0;
  while (true) {
    const page = await fetchStringsPage(projectId, token, offset);
    allStrings.push(...page.data);
    if (page.data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  console.log(`Fetched ${allStrings.length} total strings`);

  const vocab = filterVocabularyStrings(allStrings, sourceMap);
  const toUpdate = stringsNeedingUpdate(vocab, sourceMap);
  console.log(`Vocabulary strings: ${vocab.length}, need update: ${toUpdate.length}`);

  let updated = 0;
  for (const item of toUpdate) {
    const word = sourceMap[item.data.identifier];
    const context = buildRaeUrl(word);
    await patchStringContext(projectId, token, item.data.id, context);
    updated++;
    if (PATCH_DELAY_MS > 0) await sleep(PATCH_DELAY_MS);
    if (updated % 100 === 0) console.log(`  Updated ${updated}/${toUpdate.length}...`);
  }

  console.log(`Done: ${updated} context(s) set, ${vocab.length - updated} already correct`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
