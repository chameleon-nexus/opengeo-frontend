import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './i18n/config';
import { I18nBootstrap } from './i18n/I18nBootstrap';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <I18nBootstrap>
      <App />
    </I18nBootstrap>
  </React.StrictMode>
);