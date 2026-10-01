import React from 'react';
import { useAtom } from 'jotai';
import { useTranslation } from 'react-i18next';
import { reviewTabAtom } from '../../atoms/journalAtoms';
import { ThesisPanel } from '../thesis/ThesisPanel';
import { JournalView } from './JournalView';

export const ReviewWorkspace: React.FC = () => {
  const { t } = useTranslation(); const [tab, setTab] = useAtom(reviewTabAtom);
  return <div className="flex h-full min-h-0 flex-col"><nav className="flex shrink-0 gap-3 border-b border-border bg-surface px-6 py-3" aria-label={t('navigation.review')}>{(['journal', 'thesis'] as const).map((value) => <button type="button" key={value} aria-pressed={tab === value} onClick={() => setTab(value)} className={tab === value ? 'desk-primary' : 'desk-secondary'}>{value === 'journal' ? t('journal.records') : t('navigation.thesis')}</button>)}</nav><div className="min-h-0 flex-1">{tab === 'journal' ? <JournalView /> : <ThesisPanel />}</div></div>;
};
