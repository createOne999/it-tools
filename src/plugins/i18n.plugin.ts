import { get } from '@vueuse/core';
import type { Plugin } from 'vue';
import { createI18n } from 'vue-i18n';
import localeLoaders from 'virtual:it-tools-locales';

type LocaleMessages = Record<string, unknown>;

const DEFAULT_LOCALE = String(import.meta.env.VITE_LANGUAGE || 'en');
const FALLBACK_LOCALE = 'en';

export const availableLocales = Array.from(
  new Set(
    Object.keys(localeLoaders)
      .map((path) => path.match(/\/([^/]+)\.ya?ml$/)?.[1])
      .filter(Boolean) as string[],
  ),
).sort();

function isRecord(value: unknown): value is LocaleMessages {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeMessages(target: LocaleMessages, source: LocaleMessages) {
  Object.entries(source).forEach(([key, value]) => {
    if (isRecord(value) && isRecord(target[key])) {
      mergeMessages(target[key] as LocaleMessages, value);
      return;
    }

    target[key] = value;
  });

  return target;
}

function normalizeLocale(locale: string) {
  if (availableLocales.includes(locale)) {
    return locale;
  }

  return availableLocales.includes(FALLBACK_LOCALE) ? FALLBACK_LOCALE : availableLocales[0] || FALLBACK_LOCALE;
}

const i18n = createI18n({
  legacy: false,
  locale: normalizeLocale(DEFAULT_LOCALE),
  fallbackLocale: FALLBACK_LOCALE,
  messages: {},
});

const loadedLocales = new Set<string>();

export async function ensureLocaleLoaded(locale: string) {
  const normalizedLocale = normalizeLocale(locale);
  if (loadedLocales.has(normalizedLocale)) {
    return normalizedLocale;
  }

  const messages = await Object.entries(localeLoaders)
    .filter(([path]) => path.endsWith(`/${normalizedLocale}.yml`))
    .reduce(
      async (messagesPromise, [, loadLocale]) => {
        const mergedMessages = await messagesPromise;
        const localeModule = await loadLocale();
        return mergeMessages(mergedMessages, localeModule.default ?? localeModule);
      },
      Promise.resolve({} as LocaleMessages),
    );

  i18n.global.setLocaleMessage(normalizedLocale, messages as never);
  loadedLocales.add(normalizedLocale);

  return normalizedLocale;
}

export async function setLocale(locale: string) {
  const normalizedLocale = await ensureLocaleLoaded(locale);
  i18n.global.locale.value = normalizedLocale;

  return normalizedLocale;
}

await ensureLocaleLoaded(get(i18n.global.locale));
if (get(i18n.global.locale) !== FALLBACK_LOCALE && availableLocales.includes(FALLBACK_LOCALE)) {
  await ensureLocaleLoaded(FALLBACK_LOCALE);
}

export const i18nPlugin: Plugin = {
  install: (app) => {
    app.use(i18n);
  },
};

export function getCurrentLocale(): string {
  return get(i18n.global.locale);
}

export const translate = i18n.global.t as typeof i18n.global.t;
