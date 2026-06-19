import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const protocol = window.location.protocol === "https:" ? "wss" : "ws";
const defaultWsHost = import.meta.env.DEV
  ? `${window.location.hostname}:3001`
  : window.location.host;

const WS_URL =
  import.meta.env.VITE_WS_URL ||
  `${protocol}://${defaultWsHost}`;

const emptyStatus = {
  kind: 'idle',
  message: 'Enter a topic to generate three learning cards.',
};

function App() {
  const socketRef = useRef(null);
  const [topic, setTopic] = useState('');
  const [mode, setMode] = useState('success');
  const [cards, setCards] = useState([]);
  const [status, setStatus] = useState(emptyStatus);
  const [failedCard, setFailedCard] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const upsertCard = useCallback((card) => {
    setCards((currentCards) => {
      const nextCards = currentCards.filter(
        (item) => item.cardNumber !== card.cardNumber,
      );
      return [...nextCards, card].sort((first, second) => (
        first.cardNumber - second.cardNumber
      ));
    });
  }, []);

  useEffect(() => {
    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;

    socket.addEventListener('open', () => {
      setIsConnected(true);
      setStatus(emptyStatus);
    });

    socket.addEventListener('close', () => {
      setIsConnected(false);
      setIsGenerating(false);
      setStatus({
        kind: 'error',
        message: 'WebSocket disconnected. Restart the server and refresh.',
      });
    });

    socket.addEventListener('error', () => {
      setStatus({
        kind: 'error',
        message: 'Unable to connect to the WebSocket server.',
      });
    });

    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'started') {
        setCards([]);
        setFailedCard(null);
        setIsGenerating(true);
        setStatus({
          kind: 'loading',
          message: `Generating cards for ${message.topic}...`,
        });
      }

      if (message.type === 'card') {
        upsertCard(message.card);
        setFailedCard(null);
        setStatus({
          kind: 'loading',
          message: `Card ${message.card.cardNumber} arrived.`,
        });
      }

      if (message.type === 'card-error') {
        setFailedCard({
          cardNumber: message.cardNumber,
          message: message.message,
        });
        setIsGenerating(false);
        setStatus({
          kind: 'error',
          message: message.message,
        });
      }

      if (message.type === 'complete') {
        setIsGenerating(false);
        setFailedCard(null);
        setStatus({
          kind: 'success',
          message: message.message,
        });
      }

      if (message.type === 'error') {
        setIsGenerating(false);
        setStatus({
          kind: 'error',
          message: message.message,
        });
      }
    });

    return () => {
      socket.close();
    };
  }, [upsertCard]);

  const sendMessage = (payload) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      setStatus({
        kind: 'error',
        message: 'WebSocket is not connected yet.',
      });
      return;
    }

    socketRef.current.send(JSON.stringify(payload));
  };

  const handleGenerate = (event) => {
    event.preventDefault();

    const trimmedTopic = topic.trim();
    if (!trimmedTopic) {
      setStatus({
        kind: 'error',
        message: 'Please enter a learning topic.',
      });
      return;
    }

    sendMessage({
      type: 'generate',
      topic: trimmedTopic,
      mode,
    });
  };

  const handleRetry = () => {
    setIsGenerating(true);
    setStatus({
      kind: 'loading',
      message: `Retrying card ${failedCard?.cardNumber || ''} on the same WebSocket connection...`,
    });
    sendMessage({ type: 'retry-card' });
  };

  return (
    <main className="app-shell">
      <section className="workspace">
        <div className="intro">
          <h1>AI Learning Card Generator</h1>
        </div>

        <form className="generator" onSubmit={handleGenerate}>
          <label htmlFor="topic">Learning topic</label>
          <div className="input-row">
            <input
              id="topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Photosynthesis, Newton's Laws, Artificial Intelligence"
              disabled={isGenerating}
            />
            <button type="submit" disabled={!isConnected || isGenerating}>
              {isGenerating ? 'Generating...' : 'Generate'}
            </button>
          </div>

          
        </form>

        <div className={`status ${status.kind}`} role="status">
          {status.message}
        </div>

        <section className="cards" aria-label="Generated learning cards">
          {[1, 2, 3].map((cardNumber) => {
            const card = cards.find((item) => item.cardNumber === cardNumber);
            const isFailed = failedCard?.cardNumber === cardNumber;
            const isWaiting = isGenerating && !card && !isFailed;

            return (
              <article
                className={`learning-card ${isFailed ? 'failed' : ''}`}
                key={cardNumber}
              >
                <div className="card-number">Card {cardNumber}</div>
                {card ? (
                  <>
                    <h2>{card.title}</h2>
                    <h3>Key Concept</h3>
                    <p>{card.keyConcept}</p>
                    <h3>Fun Fact</h3>
                    <p>{card.funFact}</p>
                  </>
                ) : isFailed ? (
                  <div className="card-error">
                    <h2>Card {cardNumber} could not be generated</h2>
                    <p>{failedCard.message}</p>
                    <button type="button" onClick={handleRetry}>
                      Retry Card {cardNumber}
                    </button>
                  </div>
                ) : (
                  <div className="placeholder">
                    {isWaiting ? 'Waiting for this card...' : 'Not generated yet'}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
