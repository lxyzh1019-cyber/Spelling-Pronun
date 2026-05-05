import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { ensureAuth } from './firebase';
import './index.css';

// Initialize Firebase auth before mounting React
ensureAuth().catch((err) => {
  console.error('Auth initialization failed:', err);
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);

// Register Service Worker for offline support
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(
    import.meta.env.BASE_URL + 'sw.js'
  ).catch((err) => {
    console.warn('Service worker registration failed:', err);
  });
}
