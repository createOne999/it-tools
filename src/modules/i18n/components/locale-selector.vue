<script setup lang="ts">
import { availableLocales as supportedLocales, setLocale } from '@/plugins/i18n.plugin';

const { locale, t } = useI18n();
const selectedLocale = computed({
  get: () => locale.value,
  set: (value: string) => {
    void setLocale(value);
  },
});

const localesLong: Record<string, string> = {
  en: 'English',
  de: 'Deutsch',
  da: 'Dansk',
  es: 'Español',
  fr: 'Français',
  ga: 'Gaeilge',
  it: 'Italiano',
  nl: 'Nederlands',
  no: 'Norwegian',
  pl: 'Polski',
  pt: 'Português',
  ru: 'Русский',
  tr: 'Türkçe',
  el: 'ελληνικά',
  uk: 'Українська',
  ko: '한국인',
  zh: '中文',
  vi: 'Tiếng Việt',
  ar: 'عربي',
};

const localeOptions = computed(() =>
  supportedLocales.map((locale) => ({
    label: localesLong[locale] ?? locale,
    value: locale,
  })),
);
</script>

<template>
  <c-select
    v-model:value="selectedLocale"
    :options="localeOptions"
    :placeholder="t('locale-selector.select-a-language')"
    w-100px
  />
</template>
