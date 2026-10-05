import React, { useEffect, useState } from 'react';
import { TitleBar } from './TitleBar';
import { KernelBridge } from '../kernel/KernelBridge';
import { WorkbenchShell } from './WorkbenchShell';
import { OnboardingOverlay } from '../onboarding/OnboardingOverlay';
import { CommandPalette } from '../command/CommandPalette';
import { JudgmentDialog } from '../journal/JudgmentDialog';
import { ThemeProvider } from './ThemeProvider';
import { TooltipProvider } from '../ui/tooltip';
import { Toaster } from 'sonner';
import {
  FinagentClientProvider,
  fallbackClient,
  useFinagentClient,
  type FinagentClient,
} from '../../client';
import { I18nProvider } from '../../i18n/I18nProvider';
import type { ConnectionEntry } from '../../client/connections';
import { useTranslation } from 'react-i18next';
import { useSetAtom } from 'jotai';
import { navSectionAtom, settingsTabAtom } from '../../atoms';

interface AppShellProps {
  client?: FinagentClient;
}

export const AppShell: React.FC<AppShellProps> = ({ client = fallbackClient }) => {
  return (
    <FinagentClientProvider client={client}>
      <I18nProvider>
        <ThemeProvider>
          <TooltipProvider delayDuration={450} skipDelayDuration={100}>
            <KernelBridge client={client} />
            <div className="mac-app-window flex h-screen flex-col overflow-hidden bg-background text-foreground">
              <TitleBar />
              <MarketConnectionBanner />
              <WorkbenchShell />
            </div>
            <OnboardingOverlay />
            <CommandPalette />
            <JudgmentDialog />
            <Toaster closeButton richColors={false} />
          </TooltipProvider>
        </ThemeProvider>
      </I18nProvider>
    </FinagentClientProvider>
  );
};

const hasUsableMarketData = (entries: ConnectionEntry[]): boolean => entries.some((entry) =>
  entry.kind === 'financial-data' && entry.enabled !== false && (
    entry.status === 'connected' ||
    (entry.status === 'permission-limited' && (
      entry.recentResult?.ok === true || entry.health?.permissions?.some((permission) => permission.granted)
    ))
  )
);

const MarketConnectionBanner: React.FC = () => {
  const { t } = useTranslation();
  const setSection = useSetAtom(navSectionAtom);
  const setSettingsTab = useSetAtom(settingsTabAtom);
  const [available, setAvailable] = useState<boolean | null>(null);
  const client = useFinagentClient();

  useEffect(() => {
    let mounted = true;
    let changed = false;
    const unsubscribe = client.connections?.onChanged((entries) => {
      changed = true;
      if (mounted) setAvailable(hasUsableMarketData(entries));
    });
    const load = async () => {
      try {
        const connections = await client.connections?.list();
        if (connections?.ok) {
          if (mounted && !changed) setAvailable(hasUsableMarketData(connections.data));
          return;
        }
        const legacy = await client.longbridge.getStatus();
        if (mounted && !changed) setAvailable(legacy.ok && legacy.data.available);
      } catch {
        if (mounted && !changed) setAvailable(false);
      }
    };
    void load();
    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [client]);

  if (available !== false) {
    return null;
  }

  return (
    <div data-testid="market-connection-notice" className="yansivra-banner flex items-center justify-between gap-3 border-b px-4 py-2 text-xs">
      <span className="text-text-muted">{t('navigation.dataConnectionNotice')}</span>
      <button type="button" onClick={() => { setSettingsTab('connections'); setSection('settings'); }} className="shrink-0 font-medium text-accent">{t('navigation.openConnections')} →</button>
    </div>
  );
};
