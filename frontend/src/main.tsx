import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { OperationProvider } from './contexts/OperationContext';
import { ToastProvider } from './contexts/ToastContext';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <OperationProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </OperationProvider>
    </HashRouter>
  </React.StrictMode>
);
