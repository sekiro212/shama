import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import AdminApp from './pages/admin/AdminApp.tsx';
import './index.css';

const hostname = window.location.hostname;
const isAdminHost =
  hostname.startsWith('admin.') ||
  hostname === 'admin.localhost' ||
  import.meta.env.VITE_FORCE_ADMIN === 'true';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAdminHost ? <AdminApp /> : <App />}
  </StrictMode>
);
