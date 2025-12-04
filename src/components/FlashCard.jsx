import { useState, useEffect, useRef } from 'react';
import './FlashCard.css';

// Match the CSS transition duration (0.6s)
const FLIP_TRANSITION_DURATION = 600;

function FlashCard({ word, onKnown, onReview }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCardClick = (e) => {
    // Don't flip if clicking on buttons or during animation
    if (e.target.closest('.flashcard-actions') || isAnimating) {
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

  return (
    <div className="flashcard-wrapper">
      <div className="flashcard-container" onClick={handleCardClick}>
        <div className={`flashcard ${isFlipped ? 'flipped' : ''}`}>
          <div className="flashcard-front">
            <h2>{word.word}</h2>
            <p className="hint">Click to flip</p>
          </div>
          <div className="flashcard-back">
            <h2>{word.translations.en}</h2>
            <p className="definition">{word.definitions && word.definitions.length > 0 ? word.definitions[0] : 'No definition available'}</p>
            {word.tags && word.tags.length > 0 && (
              <div className="tags">
                {word.tags.map((tag, index) => (
                  <span key={index} className="tag">{tag}</span>
                ))}
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
  );
}

export default FlashCard;
