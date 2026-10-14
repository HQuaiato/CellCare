import { useState } from 'react';
import { Info, Paras, fmtMoney } from '../components/ui';
import { gameCap, gameCoins, gamePlaysToday, mixMedium, rewardGame } from '../game/actions';
import { GAMES, MIX_VOLUME, gameMult } from '../game/data';
import { bump } from '../game/econ';
import { act, getGame, useGame } from '../game/store';
import type { GameId, MediumId } from '../game/types';
import { CountGame } from '../games/CountGame';
import { DropGame } from '../games/DropGame';
import { MemoryGame } from '../games/MemoryGame';
import { MixGame } from '../games/MixGame';
import { PipetteGame } from '../games/PipetteGame';
import { TipsGame } from '../games/TipsGame';
import { WhackGame } from '../games/WhackGame';
import { t } from '../i18n';

type Finish = (score: number, extra?: { medium: MediumId }) => void;
const COMPONENTS: Record<GameId, (p: { onFinish: Finish }) => JSX.Element> = {
  drop: DropGame,
  whack: WhackGame,
  memory: MemoryGame,
  count: CountGame,
  tips: TipsGame,
  pipette: PipetteGame,
  mix: MixGame as (p: { onFinish: Finish }) => JSX.Element,
};

/** Texto do ⓘ / da tela de introdução de cada jogo. */
function gameInfo(id: GameId) {
  const reward = id === 'mix' ? t('game.mix.reward', { v: MIX_VOLUME }) : `${t('games.cap', { c: fmtMoney(gameCap(getGame()!, id)) })} ${t('games.levelBonus')}`;
  return `${t(`game.${id}.desc`)}\n${t(`game.${id}.how`)}\n${reward}`;
}

export function GamesTab() {
  const s = useGame();
  const [playing, setPlaying] = useState<GameId | null>(null);
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<{ score: number; line: string } | null>(null);
  const [intro, setIntro] = useState(false);

  if (playing) {
    const Game = COMPONENTS[playing];
    const icon = GAMES.find((g) => g.id === playing)!.icon;
    return (
      <div className="stack game-stage">
        <div className="row between">
          <h3>
            {icon} {t(`game.${playing}`)} <Info text={gameInfo(playing)} title={t(`game.${playing}`)} />
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
        {intro ? (
          <section className="card game-intro">
            <div className="big">{icon}</div>
            <Paras text={gameInfo(playing)} />
            <button
              className="btn primary block"
              onClick={() => {
                act((st) => bump(st, `intro_${playing}`), true);
                setIntro(false);
                setRound(round + 1);
              }}
            >
              ▶ {t('game.start')}
            </button>
          </section>
        ) : result ? (
          <section className="card center result">
            <div className="big">{playing === 'mix' && result.score < 50 ? '😬' : '🎉'}</div>
            <h3>{playing === 'mix' ? t('game.mix.accuracy', { n: result.score }) : t('game.score', { n: result.score })}</h3>
            <p className="coins">{result.line}</p>
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
            onFinish={(score, extra) => {
              if (playing === 'mix' && extra) {
                const before = getGame()!.inventory[`cmed_${extra.medium}`] ?? 0;
                if (!act((st) => mixMedium(st, extra.medium, score / 100), true)) return;
                const ml = (getGame()!.inventory[`cmed_${extra.medium}`] ?? 0) - before;
                setResult({ score, line: ml > 0 ? `+ ${ml} mL ${t(`medium.${extra.medium}.short`)}` : t('ok.mixFailed') });
                return;
              }
              const coins = gameCoins(getGame()!, playing, score);
              act((st) => rewardGame(st, playing, score), true);
              setResult({ score, line: `+ ${fmtMoney(coins)}` });
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="stack">
      <h3>
        🎮 {t('games.title')} <Info k="games.intro" title={t('games.title')} />
      </h3>
      <div className="grid-2">
        {GAMES.map((g) => {
          const plays = gamePlaysToday(s, g.id);
          const mult = gameMult(plays);
          return (
            <section key={g.id} className={`card game-card ${g.id === 'mix' ? 'workshop' : ''}`}>
              <div className="game-icon">{g.icon}</div>
              <div className="grow">
                <h3>
                  {t(`game.${g.id}`)} <Info text={gameInfo(g.id)} title={t(`game.${g.id}`)} />
                </h3>
                <p className="small">
                  {g.id === 'mix'
                    ? t('game.mix.cardLine')
                    : `🏆 ${s.bestScores[g.id] ?? 0} · ${t('games.today', { n: plays })} · ${t('games.mult', { pct: Math.round(mult * 100) })}`}
                </p>
              </div>
              <button
                className="btn primary"
                onClick={() => {
                  setPlaying(g.id);
                  setResult(null);
                  setIntro(!s.stats[`intro_${g.id}`]);
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
