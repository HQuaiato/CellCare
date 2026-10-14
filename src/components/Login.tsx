import { useState } from 'react';
import { listProfiles, login } from '../game/store';

export function Login() {
  const [name, setName] = useState('');
  const profiles = listProfiles();

  return (
    <div className="login">
      <div className="login-card">
        <img src="./icon.svg" alt="" width={96} height={96} />
        <h1>CellCare</h1>
        <p className="muted">Cuide das suas células como num laboratório de verdade.</p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            login(name);
          }}
        >
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do(a) cientista" maxLength={24} autoFocus />
          <button className="btn primary block" disabled={!name.trim()}>
            Entrar como convidado
          </button>
        </form>

        {profiles.length > 0 && (
          <div className="profiles">
            <small className="muted">Continuar neste aparelho:</small>
            {profiles.map((p) => (
              <button key={p} className="btn block" onClick={() => login(p)}>
                🧑‍🔬 {p}
              </button>
            ))}
          </div>
        )}

        <button className="btn block" disabled title="Em breve">
          🔐 Entrar com Google / e-mail (em breve)
        </button>
        <p className="muted small">O progresso de convidado fica salvo neste navegador.</p>
      </div>
    </div>
  );
}
