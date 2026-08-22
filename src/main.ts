import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createHead } from '@vueuse/head';
import { LoadingPlugin } from 'vue-loading-overlay';

import { installAbortSignalPolyfill } from 'abort-signal-polyfill';

import shadow from 'vue-shadow-dom';
import { plausible } from './plugins/plausible.plugin';
import { appBaseUrl } from '@/utils/base-url';
import '@/utils/json5-bigint';
import '@/utils/json5-bignum';

import Vue3Katex from 'vue3-katex';
import 'katex/dist/katex.min.css';

import 'virtual:uno.css';

import { naive } from './plugins/naive.plugin';

import App from './App.vue';
import router from './router';
import { getCurrentLocale, i18nPlugin, setLocale } from './plugins/i18n.plugin';
import { toolsSettings } from './tools-settings';

import store from './tools/pomodoro-timer/app/store';

window.addEventListener('vite:preloadError', (event: Event) => {
  console.error('Vite preload error, forcing page reload:', event);
  event.preventDefault(); // Prevent the original error from being thrown again
  // Deferred: Firefox also fires this event for preloads cancelled by a user
  // navigation, and an immediate reload would race (and abort) that navigation.
  // If the page is really navigating away, its timers die with it and no reload
  // happens; on a genuine chunk-load failure the reload still runs.
  setTimeout(() => window.location.reload(), 100);
});

installAbortSignalPolyfill();

// Not `registerSW()` from virtual:pwa-register: workbox-window resolves the relative
// `./sw.js` against `location.href` in its bookkeeping (urlsMatch()), so on a route deeper
// than the app root it mistakes its own worker for an external one and reloads the page.
// Registering by absolute URL against `appBaseUrl` avoids that trap. What that costs us is
// the update handling `registerType: 'autoUpdate'` would have wired up, reimplemented below.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  // The worker calls skipWaiting()/clientsClaim() (see vite.config.ts), so a newly deployed
  // one takes over this page while it is still showing the previous build. Reload when that
  // happens -- otherwise the tab keeps running the old bundle until it navigates, and any
  // lazily imported chunk it reaches for has already been swept from the cache. A first
  // install claims the page too, and must not reload: only a *replacement* means the page
  // and its worker have diverged.
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !reloading) {
      reloading = true;
      window.location.reload();
    }
  });

  const registerServiceWorker = () => {
    navigator.serviceWorker
      .register(`${appBaseUrl}sw.js`, { scope: appBaseUrl })
      .catch((error) => console.error('Service worker registration failed:', error));
  };

  // Registering competes with the page's own startup, so it waits for `load` and then idle
  // time. This module sits behind top-level awaits (config fetches in tools-settings.ts and
  // tools/index.ts), so `load` has usually fired long before we get here.
  const registerWhenIdle = () => {
    const requestIdleCallback = (
      window as Window & {
        requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      }
    ).requestIdleCallback;

    if (requestIdleCallback) {
      requestIdleCallback(registerServiceWorker, { timeout: 5000 });
    } else {
      window.setTimeout(registerServiceWorker, 0);
    }
  };

  if (document.readyState === 'complete') {
    registerWhenIdle();
  } else {
    window.addEventListener('load', registerWhenIdle, { once: true });
  }
}

const app = createApp(App);

app.config.globalProperties.$itToolsSettings = toolsSettings;

const configuredLocale = String(toolsSettings.default_locale || getCurrentLocale());
const storedLocale = window.localStorage.getItem('locale');
await setLocale(storedLocale || configuredLocale);

app.use(LoadingPlugin);
app.use(createPinia());
app.use(createHead());
app.use(i18nPlugin);
app.use(router);
app.use(naive);
app.use(plausible);
app.use(shadow);
app.use(store, 'pomodoro-store');
app.use(Vue3Katex);

app.mount('#app');
