import { useState } from 'react';
import { HUD } from './components/HUD';
import { Login } from './components/Login';
import { Toasts } from './components/ui';
import { act, useGameMaybe } from './game/store';
import { SuspensionModal } from './modals/SuspensionModal';
import { CultureTab } from './tabs/CultureTab';
import { FreezerTab } from './tabs/FreezerTab';
import { IncubatorsTab } from './tabs/IncubatorsTab';
import { LabTab } from './tabs/LabTab';
import { ResearchTab } from './tabs/ResearchTab';
import { ShopTab } from './tabs/ShopTab';

type Tab = 'culture' | 'incubators' | 'freezer' | 'shop' | 'research' | 'lab';

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'culture', icon: '🧫', label: 'Cultura' },
  { id: 'incubators', icon: '🌡️', label: 'Estufas' },
  { id: 'freezer', icon: '❄️', label: 'Freezer' },
  { id: 'shop', icon: '🛒', label: 'Loja' },
  { id: 'research', icon: '🔬', label: 'Pesquisa' },
  { id: 'lab', icon: '📓', label: 'Lab' },
];

function Game() {
  const s = useGameMaybe()!;
  const [tab, setTab] = useState<Tab>('culture');
  const running = s.experiments.length;

  return (
    <div className="app">
      <HUD />
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
        {tab === 'shop' && <ShopTab />}
        {tab === 'research' && <ResearchTab />}
        {tab === 'lab' && <LabTab />}
      </main>
      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
            <span>{t.icon}</span>
            {t.label}
            {t.id === 'research' && running > 0 && <i className="badge">{running}</i>}
            {t.id === 'freezer' && s.vials.length > 0 && <i className="badge muted">{s.vials.length}</i>}
          </button>
        ))}
      </nav>
      {s.suspension && <SuspensionModal />}
      <Toasts />
    </div>
  );
}

export default function App() {
  const s = useGameMaybe();
  return s ? <Game /> : <Login />;
}
