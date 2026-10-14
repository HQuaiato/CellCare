import { useState } from 'react';
import { fmtMoney } from '../components/ui';
import { gameCoins, gamePlaysToday, rewardGame } from '../game/actions';
import { GAMES, gameMult } from '../game/data';
import { act, getGame, useGame } from '../game/store';
import type { GameId } from '../game/types';
import { CountGame } from '../games/CountGame';
import { DropGame } from '../games/DropGame';
import { MemoryGame } from '../games/MemoryGame';
import { WhackGame } from '../games/WhackGame';
import { t } from '../i18n';

const COMPONENTS: Record<GameId, (p: { onFinish: (score: number) => void }) => JSX.Element> = {
  drop: DropGame,
  whack: WhackGame,
  memory: MemoryGame,
  count: CountGame,
};

export function GamesTab() {
  const s = useGame();
  const [playing, setPlaying] = useState<GameId | null>(null);
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<{ score: number; coins: number } | null>(null);

  if (playing) {
    const Game = COMPONENTS[playing];
    return (
      <div className="stack game-stage">
        <div className="row between">
          <h3>
            {GAMES.find((g) => g.id === playing)!.icon} {t(`game.${playing}`)}
          </h3>
          <button
            className="btn small"
            onClick={() => {
              setPlaying(null);
              setResult(null);
            }}
          >
            ✕ {t('game.exit')}
          </button>
        </div>
        {result ? (
          <section className="card center result">
            <div className="big">🎉</div>
            <h3>{t('game.score', { n: result.score })}</h3>
            <p className="coins">+ {fmtMoney(result.coins)}</p>
            <div className="row center-row">
              <button
                className="btn primary"
                onClick={() => {
                  setResult(null);
                  setRound(round + 1);
                }}
              >
                🔁 {t('game.again')}
              </button>
              <button
                className="btn"
                onClick={() => {
                  setPlaying(null);
                  setResult(null);
                }}
              >
                {t('game.exit')}
              </button>
            </div>
          </section>
        ) : (
          <Game
            key={round}
            onFinish={(score) => {
              const coins = gameCoins(getGame()!, playing, score);
              act((st) => rewardGame(st, playing, score), true);
              setResult({ score, coins });
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="stack">
      <p className="muted small">{t('games.intro')}</p>
      <div className="grid-2">
        {GAMES.map((g) => {
          const plays = gamePlaysToday(s, g.id);
          const mult = gameMult(plays);
          return (
            <section key={g.id} className="card game-card">
              <div className="game-icon">{g.icon}</div>
              <div className="grow">
                <h3>{t(`game.${g.id}`)}</h3>
                <p className="small muted">{t(`game.${g.id}.desc`)}</p>
                <p className="small">
                  🏆 {s.bestScores[g.id] ?? 0} · {t('games.today', { n: plays })} · {t('games.mult', { pct: Math.round(mult * 100) })}
                </p>
                <p className="small muted">{t('games.cap', { c: fmtMoney(g.cap) })}</p>
              </div>
              <button
                className="btn primary"
                onClick={() => {
                  setPlaying(g.id);
                  setResult(null);
                  setRound(round + 1);
                }}
              >
                ▶ {t('game.play')}
              </button>
            </section>
          );
        })}
      </div>
    </div>
  );
}
