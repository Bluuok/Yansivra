import React, { useEffect, useState } from 'react';
import { TitleBar } from './TitleBar';
import { KernelBridge } from '../kernel/KernelBridge';
import { WorkbenchShell } from './WorkbenchShell';
import { OnboardingOverlay } from '../onboarding/OnboardingOverlay';
import { CommandPalette } from '../command/CommandPalette';
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
import type { LongBridgeStatus } from '@finagent/core';
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
              <LongBridgeBanner />
              <WorkbenchShell />
            </div>
            <OnboardingOverlay />
            <CommandPalette />
            <Toaster closeButton richColors={false} />
          </TooltipProvider>
        </ThemeProvider>
      </I18nProvider>
    </FinagentClientProvider>
  );
};

const LongBridgeBanner: React.FC = () => {
  const { t } = useTranslation();
  const setSection = useSetAtom(navSectionAtom);
  const setSettingsTab = useSetAtom(settingsTabAtom);
  const [status, setStatus] = useState<LongBridgeStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const client = useFinagentClient();

  useEffect(() => {
    let mounted = true;
    client.longbridge.getStatus().then((result) => {
      if (!mounted) return;
      if (result.ok) {
        setStatus(result.data);
        setError(null);
      } else {
        setStatus(null);
        setError(result.error.message);
      }
    });
    return () => {
      mounted = false;
    };
  }, [client]);

  if (!error && (!status || status.available)) {
    return null;
  }

  return (
    <div className="folio-banner flex items-center justify-between gap-3 border-b px-4 py-2 text-xs">
      <span className="text-text-muted">{t('navigation.dataConnectionNotice')}</span>
      <button type="button" onClick={() => { setSettingsTab('connections'); setSection('settings'); }} className="shrink-0 font-medium text-accent">{t('navigation.openConnections')} →</button>
    </div>
  );
};
