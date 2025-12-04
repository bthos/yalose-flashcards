import { useState, useEffect } from 'react';
import FlashCard from './components/FlashCard';
import './App.css';

function App() {
  const [vocabulary, setVocabulary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/vocabulary.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load vocabulary');
        }
        return response.json();
      })
      .then(data => {
        setVocabulary(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="app-container"><p>Loading vocabulary...</p></div>;
  }

  if (error) {
    return <div className="app-container"><p>Error: {error}</p></div>;
  }

  return (
    <div className="app-container">
      <header>
        <h1>YaLoSé Flashcards</h1>
        <p>Master Spanish vocabulary with interactive flashcards</p>
      </header>
      <main>
        {vocabulary.map(item => (
          <FlashCard
            key={item.id}
            word={item.word}
            definitions={item.definitions}
            translations={item.translations}
          />
        ))}
      </main>
    </div>
  );
}

export default App;
