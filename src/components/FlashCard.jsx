import { useState } from 'react';
import './FlashCard.css';

function FlashCard({ word, onKnown, onReview }) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleCardClick = (e) => {
    // Don't flip if clicking on buttons
    if (e.target.closest('.flashcard-actions')) {
      return;
    }
    setIsFlipped(!isFlipped);
  };

  const handleKnown = (e) => {
    e.stopPropagation();
    if (onKnown) {
      onKnown(word.id);
    }
  };

  const handleReview = (e) => {
    e.stopPropagation();
    if (onReview) {
      onReview(word.id);
    }
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
            <p className="definition">{word.definitions[0]}</p>
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
