import { useState } from 'react';
import { HUD } from './components/HUD';
import { LessonModal } from './components/LessonModal';
import { Login } from './components/Login';
import { Toasts } from './components/ui';
import { queueLesson } from './game/lessons';
import { act, useGameMaybe } from './game/store';
import { t, usePrefs } from './i18n';
import { SuspensionModal } from './modals/SuspensionModal';
import { CultureTab } from './tabs/CultureTab';
import { FreezerTab } from './tabs/FreezerTab';
import { GamesTab } from './tabs/GamesTab';
import { IncubatorsTab } from './tabs/IncubatorsTab';
import { LabTab } from './tabs/LabTab';
import { ResearchTab } from './tabs/ResearchTab';
import { ShopTab } from './tabs/ShopTab';

type Tab = 'culture' | 'incubators' | 'freezer' | 'games' | 'shop' | 'research' | 'lab';

const TABS: { id: Tab; icon: string }[] = [
  { id: 'culture', icon: '🧫' },
  { id: 'incubators', icon: '🌡️' },
  { id: 'freezer', icon: '❄️' },
  { id: 'games', icon: '🎮' },
  { id: 'shop', icon: '🛒' },
  { id: 'research', icon: '🔬' },
  { id: 'lab', icon: '📓' },
];

function Game() {
  const s = useGameMaybe()!;
  const [tab, setTabRaw] = useState<Tab>('culture');
  const setTab = (tb: Tab) => {
    setTabRaw(tb);
    if (tb === 'shop' || tb === 'freezer' || tb === 'games' || tb === 'research') act((st) => queueLesson(st, tb), true);
    if (tb === 'incubators') act((st) => queueLesson(st, 'co2'), true);
  };
  const running = s.experiments.length;

  return (
    <div className="app">
      <HUD />
      <div className="body">
        <nav className="tabs">
          {TABS.map((tb) => (
            <button key={tb.id} className={tab === tb.id ? 'on' : ''} onClick={() => setTab(tb.id)}>
              <span>{tb.icon}</span>
              {t(`tab.${tb.id}`)}
              {tb.id === 'research' && running > 0 && <i className="badge">{running}</i>}
              {tb.id === 'freezer' && s.vials.length > 0 && <i className="badge muted">{s.vials.length}</i>}
            </button>
          ))}
        </nav>
        <main>
          {tab === 'culture' && <CultureTab goTo={setTab} />}
          {tab === 'incubators' && (
            <IncubatorsTab
              openFlask={(id) => {
                act((st) => void (st.selectedFlaskId = id), true);
                setTab('culture');
              }}
            />
          )}
          {tab === 'freezer' && <FreezerTab onThaw={() => setTab('culture')} />}
          {tab === 'games' && <GamesTab />}
          {tab === 'shop' && <ShopTab />}
          {tab === 'research' && <ResearchTab />}
          {tab === 'lab' && <LabTab />}
        </main>
      </div>
      {s.suspension && <SuspensionModal />}
      {tab !== 'games' && s.lessonQueue.length > 0 && <LessonModal />}
      <Toasts />
    </div>
  );
}

export default function App() {
  usePrefs(); // re-renderiza tudo ao trocar idioma ou tema
  const s = useGameMaybe();
  return s ? <Game /> : <Login />;
}
