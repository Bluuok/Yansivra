import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ApiError } from '@finagent/core';

export const JournalError: React.FC<{ error: ApiError }> = ({ error }) => {
  const { t } = useTranslation();
  return <p role="alert" className="rounded-lg border border-negative/25 bg-negative/5 p-3 text-sm text-negative">{t(`journal.errors.${error.code}`, { defaultValue: error.message })}</p>;
};
