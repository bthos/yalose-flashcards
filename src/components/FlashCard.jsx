import { useState } from 'react';
import './FlashCard.css';

function FlashCard({ word, definitions, translations }) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="flashcard-container" onClick={handleFlip}>
      <div className={`flashcard ${isFlipped ? 'flipped' : ''}`}>
        <div className="flashcard-front">
          <h2>{word}</h2>
        </div>
        <div className="flashcard-back">
          <div className="translation">
            <h3>Translations:</h3>
            <p>EN: {translations?.en}</p>
            <p>FR: {translations?.fr}</p>
          </div>
          <div className="definition">
            <h3>Definition:</h3>
            {definitions && definitions.map((def, index) => (
              <p key={index}>{def}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FlashCard;
