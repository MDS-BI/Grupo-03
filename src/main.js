import './styles.css';
import { initApp } from './app.js';
import { userConfig } from './module-config.js';

function boot() {
  const root = document.getElementById('app');
  if (root) {
    initApp({ root, rawConfig: userConfig });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
