import { LANGS, THEMES, setPrefs, t, usePrefs } from '../i18n';

/** Seletores de idioma e de tema de cores. */
export function PrefsPicker() {
  const prefs = usePrefs();
  return (
    <div className="prefs">
      <div className="seg small">
        {LANGS.map((l) => (
          <button key={l.id} className={prefs.lang === l.id ? 'on' : ''} onClick={() => setPrefs({ lang: l.id })}>
            {l.label}
          </button>
        ))}
      </div>
      <div className="seg small">
        {THEMES.map((th) => (
          <button key={th} className={prefs.theme === th ? 'on' : ''} onClick={() => setPrefs({ theme: th })}>
            <i className={`swatch swatch-${th}`} /> {t(`theme.${th}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
