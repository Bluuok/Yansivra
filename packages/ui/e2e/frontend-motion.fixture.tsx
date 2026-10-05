import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { I18nextProvider } from 'react-i18next';
import { createSyncI18n } from '@finagent/i18n';
import type { ResearchRunSummary } from '@finagent/core';
import { ResearchFlowMap } from '../src/components/research/ResearchFlowMap';
import '../src/styles/yansivra-desk.css';

// Browser fixture uses the production component, not a copied animation.
const root = createRoot(document.getElementById('root')!);
const i18n = createSyncI18n({ locale:'zh-CN' });
const show = (run: ResearchRunSummary) => flushSync(() => root.render(<I18nextProvider i18n={i18n}><main className="yansivra-finance-workspace" style={{ padding:24, background:'var(--background)', color:'var(--foreground)' }}><h1>采集动效验收 · 明确标注的组件样例</h1><p>此窗口不连接行情、模型或应用账户。</p><ResearchFlowMap run={run} /></main></I18nextProvider>));
Object.assign(window,{ yansivraMotionFixture:{ show } });
show({ id:'initial', symbol:'TEST.US', status:'fetching', startedAt:1, plannedCapabilities:[], completedCapabilities:[], failedCapabilities:[] });
