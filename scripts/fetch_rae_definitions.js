#!/usr/bin/env node

/**
 * RAE Definition Scraper
 * 
 * This script fetches Spanish word definitions from the Real Academia Española (RAE)
 * dictionary and updates vocabulary.json with the scraped content.
 * 
 * Features:
 * - Incremental processing (configurable batch size)
 * - Rate limiting to respect RAE servers
 * - Progress tracking via state file
 * - Automatic version hash update
 * 
 * Usage:
 *   node scripts/fetch_rae_definitions.js [--batch-size=50] [--delay=2000]
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  vocabularyPath: path.join(__dirname, '../public/vocabulary.json'),
  statePath: path.join(__dirname, '../.rae-scraper-state.json'),
  batchSize: parseInt(process.argv.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '50'),
  delayMs: parseInt(process.argv.find(arg => arg.startsWith('--delay='))?.split('=')[1] || '2000'),
  timeout: 30000, // 30 seconds per page
  retries: 2,
};

/**
 * Load or initialize scraper state
 */
async function loadState() {
  try {
    const data = await fs.readFile(CONFIG.statePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {
      lastProcessedIndex: 0,
      failedWords: [],
      completedCount: 0,
      lastRun: null,
    };
  }
}

/**
 * Save scraper state
 */
async function saveState(state) {
  state.lastRun = new Date().toISOString();
  await fs.writeFile(CONFIG.statePath, JSON.stringify(state, null, 2));
}

/**
 * Generate MD5 hash for version tracking
 */
function generateVersionHash(data) {
  return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
}

/**
 * Extract definitions from RAE page
 */
async function scrapeDefinitions(page, url, word) {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: CONFIG.timeout });
    
    // Wait for definitions to load
    await page.waitForSelector('.c-definitions', { timeout: 5000 }).catch(() => null);
    
    // Extract definitions from the RAE page structure
    const definitions = await page.evaluate(() => {
      const results = [];
      
      // RAE uses <ol class="c-definitions"> with <li class="j"> or <li class="j1"> etc.
      const definitionItems = document.querySelectorAll('.c-definitions li[class^="j"]');
      
      definitionItems.forEach(li => {
        // Get the definition item container
        const defItem = li.querySelector('.c-definitions__item');
        if (!defItem) return;
        
        // Clone to manipulate without affecting the page
        const clone = defItem.cloneNode(true);
        
        // Remove the number prefix element
        const numEl = clone.querySelector('.n_acep');
        if (numEl) numEl.remove();
        
        // Remove abbreviation elements (like "intr.", "tr.", etc.) but keep their context
        const abbrs = clone.querySelectorAll('abbr.d, abbr.g');
        abbrs.forEach(abbr => {
          // Keep the abbreviation text as part of the definition for context
          const text = abbr.getAttribute('title') || abbr.textContent;
          abbr.replaceWith(text + ' ');
        });
        
        // Get clean text
        let text = clone.textContent?.trim();
        if (text) {
          // Clean up extra whitespace
          text = text.replace(/\s+/g, ' ').trim();
          // Remove trailing references and arrows
          text = text.replace(/\s*→.*$/, '');
          // Only include if substantial
          if (text.length > 10) {
            results.push(text);
          }
        }
      });
      
      return results.slice(0, 5); // Limit to 5 definitions per word
    });
    
    return definitions.length > 0 ? definitions : null;
  } catch (error) {
    console.error(`  Error scraping "${word}": ${error.message}`);
    return null;
  }
}

/**
 * Delay helper
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main scraping function
 */
async function main() {
  console.log('🔍 RAE Definition Scraper');
  console.log(`   Batch size: ${CONFIG.batchSize}`);
  console.log(`   Delay: ${CONFIG.delayMs}ms between requests\n`);
  
  // Load vocabulary
  const vocabularyData = JSON.parse(await fs.readFile(CONFIG.vocabularyPath, 'utf-8'));
  const words = vocabularyData.words;
  
  // Load state
  const state = await loadState();
  console.log(`📊 State: ${state.completedCount} words completed, starting from index ${state.lastProcessedIndex}\n`);
  
  // Find words that need definitions
  const wordsNeedingDefinitions = words
    .map((word, index) => ({ ...word, originalIndex: index }))
    .filter(word => 
      word.definitions.length === 0 || 
      word.definitions[0] === 'Definition pending...' ||
      word.definitions[0] === ''
    )
    .slice(0, CONFIG.batchSize);
  
  if (wordsNeedingDefinitions.length === 0) {
    console.log('✅ All words have definitions! Nothing to do.');
    return;
  }
  
  console.log(`📝 Processing ${wordsNeedingDefinitions.length} words...\n`);
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  let successCount = 0;
  let failCount = 0;
  
  try {
    for (const wordData of wordsNeedingDefinitions) {
      const { word, rae_link, originalIndex } = wordData;
      
      console.log(`[${successCount + failCount + 1}/${wordsNeedingDefinitions.length}] Scraping: ${word}`);
      
      let definitions = null;
      let attempts = 0;
      
      while (!definitions && attempts < CONFIG.retries) {
        attempts++;
        definitions = await scrapeDefinitions(page, rae_link, word);
        
        if (!definitions && attempts < CONFIG.retries) {
          console.log(`  Retry ${attempts}/${CONFIG.retries}...`);
          await delay(1000);
        }
      }
      
      if (definitions && definitions.length > 0) {
        words[originalIndex].definitions = definitions;
        successCount++;
        console.log(`  ✅ Found ${definitions.length} definition(s)`);
      } else {
        failCount++;
        state.failedWords.push({ word, rae_link, reason: 'No definitions found' });
        console.log(`  ❌ No definitions found`);
      }
      
      // Rate limiting
      await delay(CONFIG.delayMs);
    }
  } finally {
    await browser.close();
  }
  
  // Update version hash
  vocabularyData.version = generateVersionHash(vocabularyData.words);
  
  // Save updated vocabulary
  await fs.writeFile(CONFIG.vocabularyPath, JSON.stringify(vocabularyData, null, 2));
  
  // Update state
  state.completedCount += successCount;
  state.lastProcessedIndex += wordsNeedingDefinitions.length;
  await saveState(state);
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📁 Total completed: ${state.completedCount}`);
  console.log(`   🔄 Version hash: ${vocabularyData.version}`);
  console.log('='.repeat(50));
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
