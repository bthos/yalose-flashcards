import { useState, useEffect, useRef } from 'react';
import { getCachedDefinition, cacheDefinition } from '../utils/definitionsCache';
import './FlashCard.css';

// Match the CSS transition duration (0.6s)
const FLIP_TRANSITION_DURATION = 600;

// API endpoint for fetching definitions
const API_BASE_URL = import.meta.env.PROD ? '' : '';

function FlashCard({ word, onKnown, onReview, exitDirection, hasTransitioned }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef(null);
  
  // Track current word ID to prevent stale updates from async operations
  const currentWordIdRef = useRef(word.id);
  
  // Definitions state
  const [showDefinitions, setShowDefinitions] = useState(false);
  const [definitions, setDefinitions] = useState(null);
  const [definitionsLoading, setDefinitionsLoading] = useState(false);
  const [definitionsError, setDefinitionsError] = useState(null);
  const [raeLink, setRaeLink] = useState(null);

  // Reset definitions state when word changes
  useEffect(() => {
    currentWordIdRef.current = word.id;
    setShowDefinitions(false);
    setDefinitions(null);
    setDefinitionsLoading(false);
    setDefinitionsError(null);
    setRaeLink(null);
  }, [word.id]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape' && showDefinitions) {
        setShowDefinitions(false);
      }
    };

    if (showDefinitions) {
      document.addEventListener('keydown', handleEscKey);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = '';
    };
  }, [showDefinitions]);

  // Check if definitions are placeholder text
  const isPlaceholder = (defs) => {
    if (!defs || defs.length === 0) return true;
    if (defs.length === 1 && defs[0] === 'Definition pending...') return true;
    return false;
  };

  const fetchDefinitions = async () => {
    if (definitionsLoading || definitions) return;
    
    // Capture the word ID at the start to detect stale updates
    const requestedWordId = word.id;
    
    setDefinitionsLoading(true);
    setDefinitionsError(null);

    try {
      // First, check IndexedDB cache
      const cached = await getCachedDefinition(requestedWordId);
      
      // Check if word changed during await - abort if stale
      if (currentWordIdRef.current !== requestedWordId) {
        return;
      }
      
      // Only use cache if definitions are not placeholders
      if (cached && !isPlaceholder(cached.definitions)) {
        setDefinitions(cached.definitions);
        setRaeLink(cached.rae_link);
        setDefinitionsLoading(false);
        setShowDefinitions(true);
        return;
      }

      // Cache miss - fetch from API
      const response = await fetch(`${API_BASE_URL}/api/definition?wordId=${encodeURIComponent(requestedWordId)}`);
      
      // Check if word changed during await - abort if stale
      if (currentWordIdRef.current !== requestedWordId) {
        return;
      }
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('No definitions available');
        }
        throw new Error('Failed to load definitions');
      }

      const data = await response.json();
      
      // Check if word changed during await - abort if stale
      if (currentWordIdRef.current !== requestedWordId) {
        return;
      }
      
      // Only cache if definitions are not placeholders
      if (!isPlaceholder(data.definitions)) {
        await cacheDefinition(requestedWordId, {
          definitions: data.definitions,
          rae_link: data.rae_link
        });
      }
      
      // Final check before setting state
      if (currentWordIdRef.current !== requestedWordId) {
        return;
      }

      setDefinitions(data.definitions);
      setRaeLink(data.rae_link);
      setShowDefinitions(true);
    } catch (error) {
      // Only set error if still on the same word
      if (currentWordIdRef.current === requestedWordId) {
        console.error('Error fetching definitions:', error);
        setDefinitionsError(error.message || 'Could not load definitions');
      }
    } finally {
      // Only clear loading if still on the same word
      if (currentWordIdRef.current === requestedWordId) {
        setDefinitionsLoading(false);
      }
    }
  };

  const handleDefinitionsClick = (e) => {
    e.stopPropagation();
    
    if (definitions) {
      // Toggle visibility if already loaded
      setShowDefinitions(!showDefinitions);
    } else {
      // Fetch definitions
      fetchDefinitions();
    }
  };

  const handleCloseModal = () => {
    setShowDefinitions(false);
  };

  const handleRetry = (e) => {
    e.stopPropagation();
    setDefinitionsError(null);
    fetchDefinitions();
  };

  const handleCardClick = (e) => {
    // Don't flip if clicking on buttons, definitions area, or during animation
    if (e.target.closest('.flashcard-actions') || 
        e.target.closest('.definitions-section') || 
        isAnimating) {
      return;
    }
    setIsFlipped(!isFlipped);
  };

  // Helper function to handle card actions with flip-back animation
  const handleCardAction = (callback) => {
    if (!callback || isAnimating) return;
    
    const wordId = word.id; // Capture the current word ID
    
    // If card is flipped, flip it back first and wait for animation
    if (isFlipped) {
      setIsAnimating(true);
      setIsFlipped(false);
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(wordId);
        setIsAnimating(false);
        timeoutRef.current = null;
      }, FLIP_TRANSITION_DURATION);
    } else {
      callback(wordId);
    }
  };

  const handleKnown = (e) => {
    e.stopPropagation();
    handleCardAction(onKnown);
  };

  const handleReview = (e) => {
    e.stopPropagation();
    handleCardAction(onReview);
  };

  const renderDefinitionsButton = () => {
    if (definitionsLoading) {
      return (
        <button className="definitions-button loading" disabled>
          <span className="definitions-spinner"></span>
          Fetching from RAE...
        </button>
      );
    }

    if (definitionsError) {
      return (
        <div className="definitions-error">
          <span>❌ {definitionsError}</span>
          <button className="definitions-retry" onClick={handleRetry}>
            Retry
          </button>
        </div>
      );
    }

    return (
      <button 
        className="definitions-button" 
        onClick={handleDefinitionsClick}
      >
        📖 See definitions
      </button>
    );
  };

  const renderDefinitionsModal = () => {
    if (!showDefinitions || !definitions) return null;

    const isPending = isPlaceholder(definitions);

    return (
      <div className="definitions-modal-backdrop" onClick={handleCloseModal}>
        <div className="definitions-modal" onClick={(e) => e.stopPropagation()}>
          <div className="definitions-modal-header">
            <h3>{word.word}</h3>
            <button className="modal-close" onClick={handleCloseModal} aria-label="Close">
              ✕
            </button>
          </div>
          <div className="definitions-modal-body">
            {isPending ? (
              <div className="definitions-pending">
                <p>📝 Definitions not yet available in our database.</p>
                {raeLink && (
                  <a 
                    href={raeLink} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="rae-link-prominent"
                  >
                    🔗 View definition on RAE website
                  </a>
                )}
              </div>
            ) : (
              <>
                <ol className="definitions-list">
                  {definitions.map((def, index) => (
                    <li key={index} className="definition-item">{def}</li>
                  ))}
                </ol>
                {raeLink && (
                  <a 
                    href={raeLink} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="rae-link"
                  >
                    🔗 Ver en RAE
                  </a>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className={`flashcard-wrapper ${exitDirection ? `exit-${exitDirection}` : (hasTransitioned ? 'fade-in' : '')}`}>
        <div className="flashcard-container" onClick={handleCardClick}>
          <div className={`flashcard ${isFlipped ? 'flipped' : ''}`}>
            <div className="flashcard-front">
              <h2>{word.word}</h2>
              <p className="hint">Click to flip</p>
            </div>
            <div className="flashcard-back">
              <h2>{word.translations.en}</h2>
              {word.tags && word.tags.length > 0 && (
                <div className="tags">
                  {word.tags.map((tag, index) => (
                    <span key={index} className="tag">{tag}</span>
                  ))}
                </div>
              )}
              <div className="definitions-section">
                {renderDefinitionsButton()}
              </div>
            </div>
          </div>
        </div>
        <div className="flashcard-actions">
          <button 
            className="action-button review-button" 
            onClick={handleReview}
            disabled={isAnimating}
          >
            Repasar
          </button>
          <button 
            className="action-button known-button" 
            onClick={handleKnown}
            disabled={isAnimating}
          >
            Ya lo sé
          </button>
        </div>
      </div>
      
      {renderDefinitionsModal()}
    </>
  );
}

export default FlashCard;
