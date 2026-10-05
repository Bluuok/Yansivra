// Embedded benchmark datasets (spec §22). Add new datasets here to ship with the app.
import type { EmbeddedDataset } from '../datasets.ts';
import { yansivraAgentV1Dataset } from './yansivra-agent-v1.ts';
import { yansivraAgentV1ZhDataset } from './yansivra-agent-v1-zh.ts';
import { deepResearchGoldV1Dataset } from './deep-research-gold-v1.ts';

export const embeddedDatasets: EmbeddedDataset[] = [
  {
    id: 'yansivra-agent-v1',
    version: '1.0.0',
    load: () => yansivraAgentV1Dataset,
  },
  {
    id: 'yansivra-agent-v1-zh',
    version: '1.0.0',
    load: () => yansivraAgentV1ZhDataset,
  },
  {
    id: 'deep-research-gold-v1',
    version: '1.0.0',
    load: () => deepResearchGoldV1Dataset,
  },
];
