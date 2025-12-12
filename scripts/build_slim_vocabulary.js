import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = join(__dirname, '..');
const inputPath = join(projectRoot, 'public', 'vocabulary.json');
const slimOutputPath = join(projectRoot, 'public', 'vocabulary-slim.json');
const definitionsOutputDir = join(projectRoot, 'api', 'data');
const definitionsOutputPath = join(definitionsOutputDir, 'definitions.json');

console.log('📚 Building slim vocabulary files...');

// Read the full vocabulary
const vocabularyData = JSON.parse(readFileSync(inputPath, 'utf-8'));
console.log(`   Loaded ${vocabularyData.words.length} words from vocabulary.json`);

// Create slim vocabulary (without definitions and rae_link)
const slimVocabulary = {
  version: vocabularyData.version,
  words: vocabularyData.words.map(word => ({
    id: word.id,
    word: word.word,
    frequency_rank: word.frequency_rank,
    translations: word.translations,
    tags: word.tags
  }))
};

// Create definitions map (id -> { definitions, rae_link })
// Keep the first (best) definition for each word ID, skip duplicates with pending definitions
const definitionsMap = {};
for (const word of vocabularyData.words) {
  const existingDef = definitionsMap[word.id];
  const newDefs = word.definitions || [];
  const isPending = newDefs.length === 0 || 
                    (newDefs.length === 1 && newDefs[0] === 'Definition pending...');
  
  // Keep existing if new is pending, or if existing has more definitions
  if (existingDef) {
    const existingIsPending = existingDef.definitions.length === 0 ||
                              (existingDef.definitions.length === 1 && existingDef.definitions[0] === 'Definition pending...');
    
    // Only replace if new has real definitions and existing is pending
    if (!isPending && existingIsPending) {
      definitionsMap[word.id] = {
        definitions: newDefs,
        rae_link: word.rae_link || null
      };
    }
    // Otherwise keep existing (first entry wins, unless it's pending)
  } else {
    definitionsMap[word.id] = {
      definitions: newDefs,
      rae_link: word.rae_link || null
    };
  }
}

// Ensure api/data directory exists
if (!existsSync(definitionsOutputDir)) {
  mkdirSync(definitionsOutputDir, { recursive: true });
  console.log('   Created api/data directory');
}

// Write slim vocabulary
writeFileSync(slimOutputPath, JSON.stringify(slimVocabulary));
const slimSize = (readFileSync(slimOutputPath).length / 1024).toFixed(1);
console.log(`   ✅ Written vocabulary-slim.json (${slimSize} KB)`);

// Write definitions map
writeFileSync(definitionsOutputPath, JSON.stringify(definitionsMap));
const definitionsSize = (readFileSync(definitionsOutputPath).length / 1024).toFixed(1);
console.log(`   ✅ Written definitions.json (${definitionsSize} KB)`);

// Calculate savings
const originalSize = (readFileSync(inputPath).length / 1024).toFixed(1);
const savings = (100 - (parseFloat(slimSize) / parseFloat(originalSize) * 100)).toFixed(1);
console.log(`\n📊 Size comparison:`);
console.log(`   Original vocabulary.json: ${originalSize} KB`);
console.log(`   Slim vocabulary-slim.json: ${slimSize} KB`);
console.log(`   Definitions definitions.json: ${definitionsSize} KB`);
console.log(`   Initial load savings: ${savings}%`);

console.log('\n✨ Build complete!');

