import { afterEach, beforeEach } from 'vitest';

beforeEach(() => {
  if (window.__erpApp?.destroy) window.__erpApp.destroy();
  window.localStorage.clear();
  window.sessionStorage.clear();
  document.body.innerHTML = '';
  document.title = '';
  window.location.hash = '';
});

afterEach(() => {
  if (window.__erpApp?.destroy) window.__erpApp.destroy();
  window.localStorage.clear();
  window.sessionStorage.clear();
  document.body.innerHTML = '';
});
