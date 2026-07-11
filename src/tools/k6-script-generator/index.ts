import { defineTool } from '../tool';

export const tool = defineTool({
  name: 'K6 Load Testing Script Generator',
  path: '/k6-script-generator',
  description: 'Generate k6 load testing scripts with common presets',
  keywords: ['k6', 'script', 'generator', 'load', 'testing', 'performance'],
  component: () => import('./k6-script-generator.vue'),
  icon: defineAsyncComponent(() => import('@vicons/tabler/es/Speedboat')),
  createdAt: new Date('2026-07-05'),
  category: 'Development',
});
