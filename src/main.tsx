import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Gracefully intercept and suppress benign WebSocket connection failures and Vite HMR errors in the platform sandbox
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (reason) {
      const reasonStr = String(reason);
      const message = reason.message || '';
      if (
        reasonStr.toLowerCase().includes('websocket') ||
        reasonStr.toLowerCase().includes('vite') ||
        reasonStr.toLowerCase().includes('ws://') ||
        reasonStr.toLowerCase().includes('wss://') ||
        message.toLowerCase().includes('websocket') ||
        message.toLowerCase().includes('vite')
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  });

  window.addEventListener('error', (event) => {
    const message = event.message || '';
    const errorStr = event.error ? String(event.error) : '';
    if (
      message.toLowerCase().includes('websocket') ||
      message.toLowerCase().includes('vite') ||
      message.toLowerCase().includes('ws://') ||
      message.toLowerCase().includes('wss://') ||
      errorStr.toLowerCase().includes('websocket') ||
      errorStr.toLowerCase().includes('vite')
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

