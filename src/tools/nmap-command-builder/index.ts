import { defineTool } from '../tool';

export const tool = defineTool({
  name: 'Nmap Command Builder',
  path: '/nmap-command-builder',
  description: 'A simple command builder for generating Nmap scan commands.',
  keywords: ['nmap', 'command', 'builder', 'scan', 'generator'],
  component: () => import('./nmap-command-builder.vue'),
  icon: defineAsyncComponent(() => import('@vicons/tabler/es/ShieldCheck')),
  createdAt: new Date('2026-05-11'),
  category: 'Forensic',
});
