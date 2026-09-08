import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { store } from './store';
import App from './App';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: '12px',
              fontSize: '14px',
              maxWidth: '380px',
              padding: '12px 16px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.08)',
            },
            success: { iconTheme: { primary: '#4F46E5', secondary: '#fff' } },
            error: { iconTheme: { primary: '#DC2626', secondary: '#fff' } },
          }}
        />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
