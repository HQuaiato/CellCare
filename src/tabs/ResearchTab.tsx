import { fmtDuration, fmtMoney, fmtNum } from '../components/ui';
import { LEVELS, levelOf, unlocksAt } from '../game/data';
import { REPLICATES_FOR_PAPER, describeKey, readoutName } from '../game/research';
import { useGame } from '../game/store';

export function ResearchTab() {
  const s = useGame();
  const lv = levelOf(s.xp);
  const keys = Object.keys(s.replicates).sort((a, b) => (s.replicates[b] ?? 0) - (s.replicates[a] ?? 0));
  const next = [lv + 1, lv + 2].filter((l) => l <= LEVELS.length);

  return (
    <div className="stack">
      <section className="card">
        <h3>⏳ Experimentos em andamento</h3>
        {s.experiments.length === 0 && <p className="muted">Nenhum. Escolha um frasco saudável e clique em 🧪 Experimento.</p>}
        {s.experiments.map((e) => {
          const total = e.readyAt - e.startedAt;
          const done = (s.time - e.startedAt) / total;
          return (
            <div key={e.id} className="exp">
              <div className="row between">
                <b>{describeKey(e.key)}</b>
                <span className="muted small">{fmtDuration(e.readyAt - s.time)}</span>
              </div>
              <div className="bar-track">
                <div className="bar-fill tone-neutral" style={{ width: `${done * 100}%` }} />
              </div>
              <small className="muted">
                {e.flaskName} · leitura {readoutName(e.readout)}
              </small>
            </div>
          );
        })}
      </section>

      <section className="card">
        <h3>📊 Projetos (réplicas)</h3>
        {keys.length === 0 && <p className="muted">Seus resultados aparecem aqui. {REPLICATES_FOR_PAPER} réplicas viram um artigo.</p>}
        {keys.map((k) => (
          <div key={k} className="project">
            <div className="row between">
              <b>{describeKey(k)}</b>
              <span className={`pill ${s.replicates[k] >= REPLICATES_FOR_PAPER ? 'done' : ''}`}>
                {Math.min(s.replicates[k], REPLICATES_FOR_PAPER)}/{REPLICATES_FOR_PAPER}
              </span>
            </div>
            <small className="muted">{s.results[k]}</small>
          </div>
        ))}
      </section>

      <section className="card">
        <h3>📄 Publicações ({s.papers.length})</h3>
        {s.papers.length === 0 && <p className="muted">Ainda nenhuma. Bora pra bancada!</p>}
        {s.papers.map((p) => (
          <div key={p.id} className="paper">
            <b>“{p.title}”</b>
            <small>
              <i>{p.journal}</i> · impacto {fmtNum(p.impact * 10)} · {fmtMoney(p.reward)} de financiamento
            </small>
          </div>
        ))}
      </section>

      <section className="card">
        <h3>🗺️ Próximos níveis</h3>
        {next.map((l) => (
          <p key={l} className="small">
            <b>Nível {l}</b> ({LEVELS[l - 1]} XP): {unlocksAt(l).join(', ') || 'mais prestígio'}
          </p>
        ))}
      </section>
    </div>
  );
}
