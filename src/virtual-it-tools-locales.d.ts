declare module 'virtual:it-tools-locales' {
  type LocaleMessages = Record<string, unknown>;
  const localeLoaders: Record<string, () => Promise<LocaleMessages & { default?: LocaleMessages }>>;
  export default localeLoaders;
}
