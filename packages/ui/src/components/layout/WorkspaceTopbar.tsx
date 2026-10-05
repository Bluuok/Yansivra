import React from 'react';
import { Moon, Sun, PanelRight } from 'lucide-react';
import { useAtom, useAtomValue } from 'jotai';
import { useTranslation } from 'react-i18next';
import { activeSymbolAtom, activeViewAtom, navSectionAtom, agentPanelVisibleAtom } from '../../atoms';
import type { WorkspaceView } from '@finagent/core';
import { useTheme } from './ThemeProvider';
import { inspectorModeAtom } from '../../atoms/journalAtoms';

const TABS: Array<{ labelKey: string; view: WorkspaceView }> = [
  { labelKey: 'kLines', view: 'chart' },
  { labelKey: 'statements', view: 'financials' },
  { labelKey: 'news', view: 'news' },
  { labelKey: 'reports', view: 'overview' },
];

/** Stitch's persistent center-column header: asset tabs stay available while
 * the existing Yansivra navigation controls the actual page surface below. */
export const WorkspaceTopbar: React.FC = () => {
  const { t } = useTranslation();
  const activeSymbol = useAtomValue(activeSymbolAtom);
  const navSection = useAtomValue(navSectionAtom);
  const [, setNavSection] = useAtom(navSectionAtom);
  const [assistantOpen, setAssistantOpen] = useAtom(agentPanelVisibleAtom);
  const [inspectorMode, setInspectorMode] = useAtom(inspectorModeAtom);
  const { mode, setMode } = useTheme();
  const [activeView, setActiveView] = useAtom(activeViewAtom);
  const showAssetTabs = navSection === 'watchlist' || navSection === 'sessions';
  const titleKey = navSection === 'thesis' ? 'review' : navSection === 'portfolio' ? 'assets' : navSection;

  const selectTab = (view: WorkspaceView) => {
    setActiveView(view);
    setNavSection('watchlist');
  };

  return (
    <header className="yansivra-workspace-topbar flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6">
      <div className="flex min-w-0 items-center gap-7">
        <div className="yansivra-workspace-topbar-title shrink-0">{t(`navigation.${titleKey}`)}</div>
        {showAssetTabs && (
          <nav aria-label={t('navigation.workspaceTabs')} className="yansivra-workspace-topbar-tabs flex h-full items-center gap-5">
            {TABS.map((tab) => (
              <button
                key={tab.labelKey}
                type="button"
                aria-pressed={activeSymbol != null && navSection === 'watchlist' && activeView === tab.view}
                onClick={() => selectTab(tab.view)}
                className={`yansivra-workspace-topbar-tab ${activeSymbol != null && navSection === 'watchlist' && activeView === tab.view ? 'yansivra-workspace-topbar-tab--active' : ''}`}
              >
                {t(`navigation.${tab.labelKey}`)}
              </button>
            ))}
          </nav>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="yansivra-local-label text-xs text-text-muted">{t('navigation.localFirst')}</span>
        <button type="button" onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')} aria-label={t('navigation.toggleTheme')} className="rounded-lg p-2 text-text-muted hover:bg-surface-hover">{mode === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
        <button type="button" data-testid="assistant-toggle" onClick={() => { setAssistantOpen(!(assistantOpen && inspectorMode === 'assistant')); setInspectorMode('assistant'); }} aria-pressed={assistantOpen && inspectorMode === 'assistant'} aria-label={t('navigation.agentPanelLabel')} className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs text-text-muted hover:bg-surface-hover"><PanelRight className="h-4 w-4" /><span>{t('navigation.agentPanel')}</span></button>
      </div>
    </header>
  );
};
