/**
 * IndexedDB caching layer for RAE definitions
 * Provides offline-first caching with LRU eviction
 */

const DB_NAME = 'yalose-definitions';
const DB_VERSION = 1;
const STORE_NAME = 'definitions';
const MAX_ENTRIES = 1000;
const MAX_AGE_DAYS = 30;

let dbPromise = null;

/**
 * Opens or creates the IndexedDB database
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.warn('IndexedDB error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create the definitions store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'wordId' });
        store.createIndex('cachedAt', 'cachedAt', { unique: false });
      }
    };
  });

  return dbPromise;
}

/**
 * Retrieves a cached definition by word ID
 * @param {string} wordId - The word ID to look up
 * @returns {Promise<{definitions: string[], rae_link: string} | null>}
 */
export async function getCachedDefinition(wordId) {
  try {
    const db = await openDB();
    
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(wordId);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          // Update access time for LRU (we update cachedAt to track "last used")
          result.cachedAt = Date.now();
          const putRequest = store.put(result);
          
          // Handle put errors gracefully - LRU update is not critical
          putRequest.onerror = () => {
            console.warn('Failed to update LRU timestamp for:', wordId);
          };
          
          // Return cached data regardless of LRU update success
          resolve({
            definitions: result.definitions,
            rae_link: result.rae_link
          });
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        // Cache read failed - resolve null to fall through to API fetch
        console.warn('Error reading from cache:', request.error);
        resolve(null);
      };
    });
  } catch (error) {
    console.warn('IndexedDB not available:', error);
    return null;
  }
}

/**
 * Caches a definition for a word
 * @param {string} wordId - The word ID
 * @param {{definitions: string[], rae_link: string}} data - The definition data
 * @returns {Promise<void>}
 */
export async function cacheDefinition(wordId, data) {
  try {
    const db = await openDB();
    
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const entry = {
        wordId,
        definitions: data.definitions,
        rae_link: data.rae_link,
        cachedAt: Date.now()
      };
      
      const request = store.put(entry);

      request.onsuccess = () => {
        // Check if we need to evict old entries (non-critical, don't fail the main operation)
        evictIfNeeded(db)
          .then(resolve)
          .catch((err) => {
            console.warn('Cache eviction failed:', err);
            resolve(); // Still resolve - eviction failure shouldn't fail caching
          });
      };

      request.onerror = () => {
        // Cache write failed - resolve anyway since caching is optional
        console.warn('Error writing to cache:', request.error);
        resolve();
      };
    });
  } catch (error) {
    // IndexedDB not available - caching is optional, don't break the app
    console.warn('IndexedDB not available for caching:', error);
    return; // Explicitly return to make the void return clear
  }
}

/**
 * Evicts entries if cache exceeds max size (LRU)
 * @param {IDBDatabase} db
 * @returns {Promise<void>}
 */
async function evictIfNeeded(db) {
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const countRequest = store.count();

    countRequest.onsuccess = () => {
      const count = countRequest.result;
      
      if (count > MAX_ENTRIES) {
        // Delete oldest entries until we're under the limit
        const toDelete = count - MAX_ENTRIES;
        const index = store.index('cachedAt');
        let deleted = 0;
        
        const cursorRequest = index.openCursor();
        cursorRequest.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor && deleted < toDelete) {
            const deleteRequest = store.delete(cursor.primaryKey);
            deleteRequest.onerror = () => {
              console.warn('Failed to delete cache entry during eviction:', cursor.primaryKey);
            };
            deleted++;
            cursor.continue();
          } else {
            resolve();
          }
        };
        cursorRequest.onerror = () => resolve();
      } else {
        resolve();
      }
    };
    
    countRequest.onerror = () => resolve();
  });
}

/**
 * Clears entries older than the specified max age
 * @param {number} maxAgeDays - Maximum age in days (default: 30)
 * @returns {Promise<number>} - Number of entries cleared
 */
export async function clearOldEntries(maxAgeDays = MAX_AGE_DAYS) {
  try {
    const db = await openDB();
    const cutoffTime = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
    
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('cachedAt');
      let deleted = 0;
      
      const range = IDBKeyRange.upperBound(cutoffTime);
      const cursorRequest = index.openCursor(range);
      
      cursorRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const deleteRequest = store.delete(cursor.primaryKey);
          deleteRequest.onerror = () => {
            console.warn('Failed to delete old cache entry:', cursor.primaryKey);
          };
          deleted++;
          cursor.continue();
        } else {
          resolve(deleted);
        }
      };
      
      cursorRequest.onerror = () => resolve(0);
    });
  } catch (error) {
    console.warn('IndexedDB not available:', error);
    return 0;
  }
}

/**
 * Gets the current number of cached entries
 * @returns {Promise<number>}
 */
export async function getCacheSize() {
  try {
    const db = await openDB();
    
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    });
  } catch (error) {
    console.warn('IndexedDB not available:', error);
    return 0;
  }
}

/**
 * Clears all cached definitions
 * @returns {Promise<void>}
 */
export async function clearCache() {
  try {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('IndexedDB not available:', error);
  }
}

