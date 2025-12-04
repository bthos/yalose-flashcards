import { useState, useEffect } from 'react'
import FlashCard from './components/FlashCard'
import './App.css'

function App() {
  const [vocabulary, setVocabulary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/yalose-flashcards/vocabulary.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load vocabulary data');
        }
        return response.json();
      })
      .then(data => {
        setVocabulary(data.words);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="app-container"><p className="status">Loading...</p></div>;
  }

  if (error) {
    return <div className="app-container"><p className="status error">Error: {error}</p></div>;
  }

  if (!vocabulary || vocabulary.length === 0) {
    return <div className="app-container"><p className="status">No vocabulary data available</p></div>;
  }

  const currentWord = vocabulary[0];

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>YaLoSé</h1>
        <p className="tagline">"I already know it!"</p>
      </header>
      <main className="app-main">
        <FlashCard word={currentWord} />
        {vocabulary.length > 1 && (
          <div className="navigation">
            <p className="word-counter">
              Word 1 of {vocabulary.length}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
