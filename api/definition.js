import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load definitions map at cold start
let definitions = null;

function loadDefinitions() {
  if (definitions === null) {
    const definitionsPath = join(__dirname, 'data', 'definitions.json');
    definitions = JSON.parse(readFileSync(definitionsPath, 'utf-8'));
  }
  return definitions;
}

export default function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wordId } = req.query;

  // Validate wordId parameter
  if (!wordId || typeof wordId !== 'string') {
    return res.status(400).json({ 
      error: 'Missing required parameter: wordId',
      definitions: []
    });
  }

  try {
    const definitionsMap = loadDefinitions();
    const wordData = definitionsMap[wordId];

    if (!wordData) {
      return res.status(404).json({
        error: 'Word not found',
        definitions: []
      });
    }

    // Set caching headers - CDN caches for 24 hours, serves stale for 7 days
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    
    return res.status(200).json({
      definitions: wordData.definitions,
      rae_link: wordData.rae_link
    });
  } catch (error) {
    console.error('Error loading definitions:', error);
    return res.status(500).json({
      error: 'Internal server error',
      definitions: []
    });
  }
}
