import { readdirSync, statSync } from 'node:fs';
import { basename, relative, resolve } from 'node:path';
import { normalizePath, type Plugin } from 'vite';

function listFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = resolve(directory, entry);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

function getLocaleFilter({ availableLocales, isVitest }: { availableLocales?: string; isVitest: boolean }) {
  if (isVitest) {
    return new Set(['en']);
  }
  if (!availableLocales || availableLocales === '*' || availableLocales === 'all') {
    return null;
  }

  return new Set(
    availableLocales
      .split(',')
      .map((locale) => locale.trim())
      .filter(Boolean),
  );
}

function getLocaleFiles({ root, localeFilter }: { root: string; localeFilter: Set<string> | null }) {
  return [
    ...listFiles(resolve(root, 'locales')),
    ...listFiles(resolve(root, 'src/tools')).filter((path) => normalizePath(path).includes('/locales/')),
  ]
    .filter((path) => /\.ya?ml$/.test(path))
    .filter((path) => {
      if (!localeFilter) {
        return true;
      }

      const locale = basename(path).replace(/\.ya?ml$/, '');
      return localeFilter.has(locale);
    });
}

export function itToolsLocalesPlugin({
  root,
  availableLocales,
  isVitest,
}: {
  root: string;
  availableLocales?: string;
  isVitest: boolean;
}): Plugin {
  const virtualModuleId = 'virtual:it-tools-locales';
  const resolvedVirtualModuleId = `\0${virtualModuleId}`;
  const localeFilter = getLocaleFilter({ availableLocales, isVitest });

  return {
    name: 'it-tools-locales',
    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
    },
    load(id) {
      if (id !== resolvedVirtualModuleId) {
        return;
      }

      const loaders = getLocaleFiles({ root, localeFilter })
        .map((file) => {
          const importPath = `/${normalizePath(relative(root, file))}`;
          return `${JSON.stringify(importPath)}: () => import(${JSON.stringify(importPath)})`;
        })
        .join(',\n');

      return `export default {\n${loaders}\n};`;
    },
  };
}
