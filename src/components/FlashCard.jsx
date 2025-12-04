import { useState } from 'react';
import './FlashCard.css';

function FlashCard({ word }) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleClick = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="flashcard-container" onClick={handleClick}>
      <div className={`flashcard ${isFlipped ? 'flipped' : ''}`}>
        <div className="flashcard-front">
          <h2>{word.spanish}</h2>
          <p className="hint">Click to flip</p>
        </div>
        <div className="flashcard-back">
          <h2>{word.english}</h2>
          <p className="definition">{word.definition}</p>
          {word.examples && word.examples.length > 0 && (
            <div className="examples">
              <p className="example-label">Examples:</p>
              {word.examples.map((example, index) => (
                <p key={index} className="example">• {example}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FlashCard;
