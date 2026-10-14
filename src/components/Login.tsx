import { useState } from 'react';
import { listProfiles, login } from '../game/store';
import { t } from '../i18n';
import { PrefsPicker } from './Prefs';

export function Login() {
  const [name, setName] = useState('');
  const profiles = listProfiles();

  return (
    <div className="login">
      <div className="login-card">
        <img src="./icon.svg" alt="" width={96} height={96} />
        <h1>CellCare</h1>
        <p className="muted">{t('login.tagline')}</p>
        <PrefsPicker />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            login(name);
          }}
        >
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('login.name')} maxLength={24} autoFocus />
          <button className="btn primary block" disabled={!name.trim()}>
            {t('login.guest')}
          </button>
        </form>

        {profiles.length > 0 && (
          <div className="profiles">
            <small className="muted">{t('login.continue')}</small>
            {profiles.map((p) => (
              <button key={p} className="btn block" onClick={() => login(p)}>
                🧑‍🔬 {p}
              </button>
            ))}
          </div>
        )}

        <button className="btn block" disabled>
          🔐 {t('login.account')}
        </button>
        <p className="muted small">{t('login.localNote')}</p>
      </div>
    </div>
  );
}
