import { useState, useEffect } from 'react'
import FlashCard from './components/FlashCard'
import './App.css'

const KNOWN_WORDS_KEY = 'yalose-known-words';
const SLIDE_ANIMATION_DURATION = 500; // milliseconds

function App() {
  const [vocabulary, setVocabulary] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exitDirection, setExitDirection] = useState(null);
  const [knownWords, setKnownWords] = useState(() => {
    // Load known words from localStorage on initialization
    const stored = localStorage.getItem(KNOWN_WORDS_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}vocabulary.json`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load vocabulary data');
        }
        return response.json();
      })
      .then(data => {
        // Filter out known words from the vocabulary
        const filteredWords = data.words.filter(
          word => !knownWords.includes(word.id)
        );
        setVocabulary(filteredWords);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [knownWords]);

  const handleKnown = (wordId) => {
    // Prevent multiple clicks during animation
    if (exitDirection) return;
    
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
          <h1>YaLoSé</h1>
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
        <h1>YaLoSé</h1>
        <p className="tagline">"I already know it!"</p>
      </header>
      <main className="app-main">
        <FlashCard 
          key={currentWord.id}
          word={currentWord} 
          onKnown={handleKnown}
          onReview={handleReview}
          exitDirection={exitDirection}
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
