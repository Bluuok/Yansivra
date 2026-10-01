import React, { useState } from 'react';
import { Info, Minus, Square, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '../primitives/Dialog';
import { AboutView } from '../about/AboutView';
import { useFinagentClient } from '../../client';

const folioLogoUrl = new URL('../../assets/desk-logo.svg', import.meta.url).href;

export const TitleBar: React.FC = () => {
  const { t } = useTranslation();
  const [aboutOpen, setAboutOpen] = useState(false);
  const client = useFinagentClient();
  const nativeMacControls = typeof navigator !== 'undefined' && /Mac/.test(navigator.userAgent);

  return (
    <header className="mac-titlebar z-titlebar flex items-center justify-between">
      {/* BrowserWindow owns the native macOS traffic lights. Reserve their area
          instead of drawing a second set inside the renderer. */}
      <div className="h-full w-20 shrink-0" aria-hidden="true" />

      <div
        data-tauri-drag-region
        className="flex flex-1 items-center justify-center self-stretch"
      >
        <div className="flex items-center gap-2">
          <img
            src={folioLogoUrl}
            alt=""
            className="h-[18px] w-[18px] rounded-[5px] shadow-sm"
            draggable={false}
          />
          <span className="text-[13px] font-semibold text-foreground/78">Folio Desk</span>
        </div>
      </div>

      <div className="flex h-full shrink-0 items-center justify-end">
        <button
          type="button"
          onClick={() => setAboutOpen(true)}
          aria-label={t('navigation.aboutAria')}
          className="flex h-5 w-5 items-center justify-center rounded text-foreground/50 transition-smooth hover:bg-black/5 hover:text-foreground"
        >
          <Info className="h-3.5 w-3.5" strokeWidth={1.7} />
        </button>
        {!nativeMacControls && <div className="flex h-full items-stretch ml-3">
          <button type="button" data-testid="window-minimize" disabled={!client.window} aria-label={t('navigation.minimize')} onClick={() => void client.window?.minimize()} className="px-4 text-text-muted hover:bg-surface-hover"><Minus className="h-3.5 w-3.5" /></button>
          <button type="button" data-testid="window-maximize" disabled={!client.window} aria-label={t('navigation.maximize')} onClick={() => void client.window?.maximize()} className="px-4 text-text-muted hover:bg-surface-hover"><Square className="h-3 w-3" /></button>
          <button type="button" data-testid="window-close" disabled={!client.window} aria-label={t('common.close')} onClick={() => void client.window?.close()} className="px-4 text-text-muted hover:bg-negative hover:text-white"><X className="h-4 w-4" /></button>
        </div>}
      </div>

      <Dialog open={aboutOpen} onClose={() => setAboutOpen(false)} title={t('navigation.aboutTitle')}>
        <AboutView />
      </Dialog>
    </header>
  );
};
