import { useState } from 'react';
import './FlashCard.css';

// Match the CSS transition duration (0.6s)
const FLIP_TRANSITION_DURATION = 600;

function FlashCard({ word, onKnown, onReview }) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleCardClick = (e) => {
    // Don't flip if clicking on buttons
    if (e.target.closest('.flashcard-actions')) {
      return;
    }
    setIsFlipped(!isFlipped);
  };

  // Helper function to handle card actions with flip-back animation
  const handleCardAction = (callback) => {
    if (!callback) return;
    
    const wordId = word.id; // Capture the current word ID
    // If card is flipped, flip it back first and wait for animation
    if (isFlipped) {
      setIsFlipped(false);
      setTimeout(() => {
        callback(wordId);
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
        >
          Repasar
        </button>
        <button 
          className="action-button known-button" 
          onClick={handleKnown}
        >
          Ya lo sé
        </button>
      </div>
    </div>
  );
}

export default FlashCard;
