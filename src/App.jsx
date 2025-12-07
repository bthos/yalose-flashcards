import { useState, useEffect } from 'react'
import FlashCard from './components/FlashCard'
import './App.css'

const KNOWN_WORDS_KEY = 'yalose-known-words';
const VOCABULARY_VERSION_KEY = 'yalose-vocabulary-version';
const VOCABULARY_CACHE_KEY = 'yalose-vocabulary-cache';
const SLIDE_ANIMATION_DURATION = 500; // milliseconds

// GitHub repository configuration
const GITHUB_REPO_OWNER = 'bthos';
const GITHUB_REPO_NAME = 'yalose-flashcards';
const GITHUB_BRANCH = 'main';
const VOCABULARY_FILE_PATH = 'public/vocabulary.json';

// Construct the GitHub raw URL
const GITHUB_RAW_URL = `https://raw.githubusercontent.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/${GITHUB_BRANCH}/${VOCABULARY_FILE_PATH}`;

function App() {
  const [vocabulary, setVocabulary] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exitDirection, setExitDirection] = useState(null);
  const [hasTransitioned, setHasTransitioned] = useState(false);
  const [knownWords, setKnownWords] = useState(() => {
    // Load known words from localStorage on initialization
    const stored = localStorage.getItem(KNOWN_WORDS_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    // Function to load and process vocabulary data
    const loadVocabulary = (data) => {
      // Filter out known words from the vocabulary
      const filteredWords = data.words.filter(
        word => !knownWords.includes(word.id)
      );
      setVocabulary(filteredWords);
      setLoading(false);
    };

    // Function to fetch vocabulary from GitHub
    const fetchFromGitHub = async () => {
      const storedVersion = localStorage.getItem(VOCABULARY_VERSION_KEY);
      const cachedData = localStorage.getItem(VOCABULARY_CACHE_KEY);

      // If we have a cached version, use it while checking for updates in background
      if (storedVersion && cachedData) {
        try {
          loadVocabulary(JSON.parse(cachedData));
        } catch {
          // Cache corrupted, continue with fetch
        }
      }

      try {
        const response = await fetch(GITHUB_RAW_URL);
        if (!response.ok) {
          throw new Error('Failed to fetch from GitHub');
        }
        const data = await response.json();

        // Only update if version changed
        if (data.version && data.version !== storedVersion) {
          localStorage.setItem(VOCABULARY_VERSION_KEY, data.version);
          localStorage.setItem(VOCABULARY_CACHE_KEY, JSON.stringify(data));
          loadVocabulary(data);
        }
      } catch {
        // Fall back to local version if no cache and GitHub fails
        if (!cachedData) {
          fetchLocalVocabulary();
        }
      }
    };

    // Function to fetch vocabulary from local bundle
    const fetchLocalVocabulary = async () => {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}vocabulary.json`);
        if (!response.ok) {
          throw new Error('Failed to load vocabulary data');
        }
        const data = await response.json();
        
        // Check if we should cache this
        const storedVersion = localStorage.getItem(VOCABULARY_VERSION_KEY);
        if (!storedVersion && data.version) {
          localStorage.setItem(VOCABULARY_VERSION_KEY, data.version);
          localStorage.setItem(VOCABULARY_CACHE_KEY, JSON.stringify(data));
        }
        
        loadVocabulary(data);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    // Try GitHub first, fall back to local
    fetchFromGitHub();
  }, [knownWords]);

  const handleKnown = (wordId) => {
    // Prevent multiple clicks during animation
    if (exitDirection) return;
    
    // Mark that a transition has occurred
    setHasTransitioned(true);
    
    // Set exit direction for animation
    setExitDirection('right');
    
    // Wait for animation to complete before updating state
    setTimeout(() => {
      // Add word to known words list
      const updatedKnownWords = [...knownWords, wordId];
      setKnownWords(updatedKnownWords);
      
      // Save to localStorage
      localStorage.setItem(KNOWN_WORDS_KEY, JSON.stringify(updatedKnownWords));
      
      // Remove word from current vocabulary
      const filteredWords = vocabulary.filter(word => word.id !== wordId);
      setVocabulary(filteredWords);
      
      // Reset index if needed - if we removed the last word, go back to start
      if (filteredWords.length > 0 && currentIndex >= filteredWords.length) {
        setCurrentIndex(0);
      }
      
      // Reset exit direction
      setExitDirection(null);
    }, SLIDE_ANIMATION_DURATION);
  };

  const handleReview = () => {
    // Prevent multiple clicks during animation
    if (exitDirection) return;
    
    // Mark that a transition has occurred
    setHasTransitioned(true);
    
    // Set exit direction for animation
    setExitDirection('left');
    
    // Wait for animation to complete before updating state
    setTimeout(() => {
      // Move to next word (keeping current word in rotation)
      if (vocabulary && vocabulary.length > 1) {
        setCurrentIndex((currentIndex + 1) % vocabulary.length);
      }
      
      // Reset exit direction
      setExitDirection(null);
    }, SLIDE_ANIMATION_DURATION);
  };

  if (loading) {
    return <div className="app-container"><p className="status">Loading...</p></div>;
  }

  if (error) {
    return <div className="app-container"><p className="status error">Error: {error}</p></div>;
  }

  if (!vocabulary || vocabulary.length === 0) {
    return (
      <div className="app-container">
        <header className="app-header">
          <h1>Yalosé</h1>
          <p className="tagline">"I already know it!"</p>
        </header>
        <main className="app-main">
          <p className="status">🎉 ¡Felicidades! You know all the words!</p>
          {knownWords.length > 0 && (
            <button 
              className="reset-button"
              onClick={() => {
                localStorage.removeItem(KNOWN_WORDS_KEY);
                setKnownWords([]);
              }}
            >
              Reset Progress
            </button>
          )}
        </main>
      </div>
    );
  }

  const currentWord = vocabulary[currentIndex];

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Yalosé</h1>
        <p className="tagline">"I already know it!"</p>
      </header>
      <main className="app-main">
        <FlashCard 
          key={currentWord.id}
          word={currentWord} 
          onKnown={handleKnown}
          onReview={handleReview}
          exitDirection={exitDirection}
          hasTransitioned={hasTransitioned}
        />
        {vocabulary.length > 1 && (
          <div className="navigation">
            <p className="word-counter">
              Word {currentIndex + 1} of {vocabulary.length}
            </p>
          </div>
        )}
        {knownWords.length > 0 && (
          <div className="progress-info">
            <p className="progress-text">
              Known: {knownWords.length} word{knownWords.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
