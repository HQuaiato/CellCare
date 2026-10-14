import { fmtClock } from '../components/ui';
import { exportSave, logout, resetGame, useGame } from '../game/store';

export function LabTab() {
  const s = useGame();

  const download = () => {
    const blob = new Blob([exportSave()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cellcare-${s.player}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="stack">
      <section className="card">
        <h3>🧑‍🔬 {s.player}</h3>
        <p className="muted small">Perfil local (convidado). O login com conta e o save na nuvem vêm numa próxima versão.</p>
        <div className="row wrap">
          <button className="btn small" onClick={download}>💾 Exportar save</button>
          <button className="btn small" onClick={logout}>🚪 Trocar de perfil</button>
          <button
            className="btn small danger"
            onClick={() => {
              if (window.confirm('Apagar todo o progresso e recomeçar?')) resetGame();
            }}
          >
            ♻️ Recomeçar
          </button>
        </div>
      </section>

      <details className="card" open={s.time < 30}>
        <summary>📘 Como jogar</summary>
        <ul className="guide">
          <li><b>Tempo:</b> 1 minuto real = 1 hora no lab. Use ⏸/▶/⏩ no topo.</li>
          <li><b>Meio:</b> as células consomem glicose e liberam lactato e amônia. O lactato consome o bicarbonato e o vermelho de fenol vai do rosa para o amarelo. Troque o meio antes disso.</li>
          <li><b>CO₂:</b> o pH depende do bicarbonato do meio e do CO₂ da estufa (Henderson–Hasselbalch). Meios com mais bicarbonato (DMEM) pedem mais CO₂. Sem CO₂ o meio fica roxo.</li>
          <li><b>Repique:</b> acima de ~85% de confluência, tripsinize. Com a suspensão, semeie novos frascos, congele criotubos ou venda o excesso.</li>
          <li><b>Congelar:</b> cada criotubo usa 0,9 mL de SFB + 0,1 mL de DMSO e guarda 10⁶ células.</li>
          <li><b>Transdução:</b> marcadores (H2B-GFP, FUCCI, 53BP1, LC3, luciferase) valorizam as células e liberam experimentos de imagem.</li>
          <li><b>Pesquisa:</b> trate células saudáveis com quimio ou radiação. Três réplicas boas viram um artigo, com XP e financiamento.</li>
        </ul>
      </details>

      <section className="card">
        <h3>📓 Caderno de laboratório</h3>
        <ul className="log">
          {s.log.map((e) => (
            <li key={e.seq} className={`log-${e.kind}`}>
              <small>{fmtClock(e.t)}</small>
              {e.msg}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
