import React, { useState } from 'react';
import { GAMES, GameId } from './catalog/games';
import TripleSevensView from './games/tripleSevens/TripleSevensView';
import DoubleUpKenoView from './games/doubleUpKeno/DoubleUpKenoView';
import DiamondRichesView from './games/diamondRiches/DiamondRichesView';
import './styles/index.css';

/**
 * SevenSlot router. The lobby lists every game from the catalog; tapping
 * one mounts that game's view. Each game receives an `onExit` callback
 * that returns the user to the lobby. Visual chrome is deliberately
 * minimal so each game owns its own look.
 */
export default function App() {
  const [activeGame, setActiveGame] = useState<GameId | null>(null);

  if (activeGame === 'tripleSevens') {
    return <TripleSevensView onExit={() => setActiveGame(null)} />;
  }
  if (activeGame === 'doubleUpKeno') {
    return <DoubleUpKenoView onExit={() => setActiveGame(null)} />;
  }
  if (activeGame === 'diamondRiches') {
    return <DiamondRichesView onExit={() => setActiveGame(null)} />;
  }

  return <Lobby onSelect={setActiveGame} />;
}

function Lobby({ onSelect }: { onSelect: (id: GameId) => void }) {
  return (
    <div style={lobbyStyles.stage}>
      <h1 style={lobbyStyles.title}>SEVENSLOT</h1>
      <p style={lobbyStyles.subtitle}>Choose a game</p>
      <div style={lobbyStyles.grid}>
        {GAMES.map((g) => (
          <button
            key={g.id}
            onClick={() => g.playable && onSelect(g.id)}
            disabled={!g.playable}
            style={{
              ...lobbyStyles.card,
              opacity: g.playable ? 1 : 0.5,
              cursor: g.playable ? 'pointer' : 'default',
              borderColor: g.featured ? '#FFD93D' : '#2A56D8',
            }}
            aria-label={`${g.title}${g.featured ? ', featured' : ''}`}
          >
            {g.featured && <span style={lobbyStyles.badge}>NEW</span>}
            <h2 style={lobbyStyles.cardTitle}>{g.title}</h2>
            <p style={lobbyStyles.tagline}>{g.tagline}</p>
            <span style={lobbyStyles.status}>{g.playable ? 'PLAY' : 'COMING SOON'}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const lobbyStyles: Record<string, React.CSSProperties> = {
  stage: {
    width: '100%',
    maxWidth: 720,
    margin: '0 auto',
    padding: 24,
    color: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    textAlign: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 800,
    color: '#FFD93D',
    letterSpacing: 2,
    margin: '12px 0 4px',
  },
  subtitle: { fontSize: 14, opacity: 0.7, marginBottom: 24 },
  grid: { display: 'grid', gridTemplateColumns: '1fr', gap: 12 },
  card: {
    position: 'relative',
    background: '#0e1f6e',
    border: '2px solid #2A56D8',
    borderRadius: 10,
    padding: 18,
    textAlign: 'left',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    background: '#FFD93D',
    color: '#1a1a1a',
    fontSize: 10,
    fontWeight: 800,
    padding: '2px 8px',
    borderRadius: 4,
    letterSpacing: 1,
  },
  cardTitle: { margin: 0, fontSize: 20, fontWeight: 700 },
  tagline: { margin: 0, fontSize: 13, opacity: 0.85 },
  status: { fontSize: 12, fontWeight: 700, color: '#FFD93D', marginTop: 4 },
};
