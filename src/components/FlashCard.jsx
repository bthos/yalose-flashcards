import { useState, useEffect, useRef } from 'react';
import { getCachedDefinition, cacheDefinition } from '../utils/definitionsCache';
import {
  createSwipeState,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  computeProgress,
} from '../utils/swipeGesture';
// eslint-disable-next-line no-unused-vars -- used as JSX elements
import { BookIcon, LinkIcon, NoteIcon, AlertIcon, CloseIcon } from './icons';
import './FlashCard.css';

// Match the CSS transition duration (0.6s)
const FLIP_TRANSITION_DURATION = 600;

function FlashCard({
  word,
  translation,
  onKnown,
  onReview,
  exitDirection,
  hasTransitioned,
  boxNumber = 0,
  cardMode = 'translation',
}) {
  // Which parts of the back face this mode shows (FR-07).
  const showTranslation = cardMode === 'translation' || cardMode === 'mixed';
  const showInlineDefinitions = cardMode === 'definition' || cardMode === 'mixed';

  const [isFlipped, setIsFlipped] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef(null);

  // Swipe gesture state
  const swipeStateRef = useRef(createSwipeState());
  const cardContainerRef = useRef(null);
  // Suppresses the click event that fires after a completed swipe on pointer devices.
  const swipeDidFire = useRef(false);

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

  // Auto-load definitions inline when the card is flipped to the back in
  // definition/mixed mode — and when the mode changes while already flipped
  // (AC3, AC4, AC7 immediate switch, AC8 spinner/error).
  useEffect(() => {
    if (
      isFlipped &&
      showInlineDefinitions &&
      !definitions &&
      !definitionsLoading &&
      !definitionsError
    ) {
      fetchDefinitions({ openModal: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFlipped, cardMode]);

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

  const fetchDefinitions = async ({ openModal = true } = {}) => {
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
        if (openModal) setShowDefinitions(true);
        return;
      }

      // Cache miss - fetch from API
      const response = await fetch(`/api/definition?wordId=${encodeURIComponent(requestedWordId)}`);
      
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
      if (openModal) setShowDefinitions(true);
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

  // Read --swipe-threshold from the CSS custom property (default 60 px).
  const getSwipeThreshold = () => {
    if (!cardContainerRef.current) return 60;
    const val = parseFloat(
      getComputedStyle(cardContainerRef.current).getPropertyValue('--swipe-threshold')
    );
    return isNaN(val) ? 60 : val;
  };

  const handlePointerDown = (e) => {
    // AC6: don't start a swipe when tapping the definitions area.
    if (e.target.closest('.definitions-section')) return;
    swipeStateRef.current = onPointerDown(e.clientX, e.clientY);
    // Capture keeps pointermove/pointerup firing even if the pointer leaves the element.
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.setAttribute('data-swiping', '');
  };

  const handlePointerMove = (e) => {
    if (!swipeStateRef.current.active) return;
    swipeStateRef.current = onPointerMove(swipeStateRef.current, e.clientX, e.clientY);
    const threshold = getSwipeThreshold();
    const progress = computeProgress(swipeStateRef.current, threshold);
    e.currentTarget.style.setProperty('--swipe-progress', progress);
  };

  const handlePointerUp = (e) => {
    if (!swipeStateRef.current.active) return;
    const threshold = getSwipeThreshold();
    const { state, action } = onPointerUp(swipeStateRef.current, threshold);
    swipeStateRef.current = state;

    // Remove swiping class and reset progress — CSS transition springs it back.
    e.currentTarget.removeAttribute('data-swiping');
    e.currentTarget.style.setProperty('--swipe-progress', 0);

    if (action) {
      swipeDidFire.current = true;
      // Clear the flag after pointer-event → click propagation window (AC5/pointer compat).
      setTimeout(() => { swipeDidFire.current = false; }, 300);
      if (action === 'known') handleCardAction(onKnown);
      else handleCardAction(onReview);
    }
  };

  const handlePointerCancel = (e) => {
    swipeStateRef.current = onPointerCancel();
    e.currentTarget.removeAttribute('data-swiping');
    e.currentTarget.style.setProperty('--swipe-progress', 0);
  };

  const handleCardClick = (e) => {
    // Suppress the synthetic click that fires right after a completed swipe.
    if (swipeDidFire.current) {
      swipeDidFire.current = false;
      return;
    }
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
          <span className="definitions-error__msg">
            <AlertIcon size={18} /> {definitionsError}
          </span>
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
        <BookIcon size={18} /> See definitions
      </button>
    );
  };

  const handleInlineRetry = (e) => {
    e.stopPropagation();
    setDefinitionsError(null);
    fetchDefinitions({ openModal: false });
  };

  // Inline definitions block for definition / mixed modes (AC3, AC4, AC8).
  const renderInlineDefinitions = () => {
    if (definitionsLoading) {
      return (
        <div className="inline-definitions inline-definitions--loading" aria-live="polite">
          <span className="definitions-spinner" aria-hidden="true"></span>
          <span>Fetching from RAE...</span>
        </div>
      );
    }

    if (definitionsError) {
      return (
        <div className="inline-definitions inline-definitions--error" aria-live="polite">
          <span className="definitions-error__msg">
            <AlertIcon size={18} /> Definition unavailable — check connection.
          </span>
          <button className="definitions-retry" onClick={handleInlineRetry}>
            Retry
          </button>
        </div>
      );
    }

    if (definitions) {
      if (isPlaceholder(definitions)) {
        return (
          <div className="inline-definitions inline-definitions--pending">
            <p><NoteIcon size={18} /> Definitions not yet available.</p>
            {raeLink && (
              <a href={raeLink} target="_blank" rel="noopener noreferrer" className="rae-link">
                <LinkIcon size={16} /> Ver en RAE
              </a>
            )}
          </div>
        );
      }
      return (
        <div className="inline-definitions">
          <ol className="definitions-list definitions-list--inline">
            {definitions.map((def, index) => (
              <li key={index} className="definition-item">{def}</li>
            ))}
          </ol>
          {raeLink && (
            <a href={raeLink} target="_blank" rel="noopener noreferrer" className="rae-link">
              <LinkIcon size={16} /> Ver en RAE
            </a>
          )}
        </div>
      );
    }

    // Not yet loaded — the flip effect will trigger the fetch.
    return null;
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
              <CloseIcon size={20} />
            </button>
          </div>
          <div className="definitions-modal-body">
            {isPending ? (
              <div className="definitions-pending">
                <p><NoteIcon size={18} /> Definitions not yet available in our database.</p>
                {raeLink && (
                  <a
                    href={raeLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rae-link-prominent"
                  >
                    <LinkIcon size={18} /> View definition on RAE website
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
                    <LinkIcon size={16} /> Ver en RAE
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
        <div
          ref={cardContainerRef}
          className="flashcard-container"
          onClick={handleCardClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          <div className="swipe-overlay" aria-hidden="true" />
          <div className={`flashcard ${isFlipped ? 'flipped' : ''}`}>
            <div className="flashcard-front">
              <h2>{word.word}</h2>
              <p className="hint">Click to flip</p>
              {boxNumber > 0 && (
                <span className="box-badge" title={`Leitner box ${boxNumber}`}>
                  Box {boxNumber}
                </span>
              )}
            </div>
            <div className={`flashcard-back flashcard-back--${cardMode}`}>
              {showTranslation && <h2>{translation ?? word.translations.en}</h2>}
              {word.tags && word.tags.length > 0 && (
                <div className="tags">
                  {word.tags.map((tag, index) => (
                    <span key={index} className="tag">{tag}</span>
                  ))}
                </div>
              )}
              {showInlineDefinitions ? (
                <>
                  <div className="definitions-section inline-definitions-wrap">
                    {renderInlineDefinitions()}
                  </div>
                  {/* Modal is kept available in every mode (UAT decision) */}
                  <div className="definitions-section">
                    <button className="definitions-button" onClick={handleDefinitionsClick}>
                      <BookIcon size={18} /> See definitions
                    </button>
                  </div>
                </>
              ) : (
                <div className="definitions-section">
                  {renderDefinitionsButton()}
                </div>
              )}
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
