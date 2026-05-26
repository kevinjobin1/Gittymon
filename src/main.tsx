import {StrictMode} from 'react';
import {createRoot, hydrateRoot} from 'react-dom/client';
import App from './App.tsx';
import { IdentityProvider } from './lib/IdentityContext';
import './index.css';

const rootElement = document.getElementById('root')!;

const app = (
  <StrictMode>
    <IdentityProvider>
      <App />
    </IdentityProvider>
  </StrictMode>
);

if (rootElement.hasChildNodes()) {
  // SSR-rendered content exists — hydrate instead of re-render
  hydrateRoot(rootElement, app);
} else {
  // Client-only rendering (e.g. dev mode without SSR)
  createRoot(rootElement).render(app);
}
