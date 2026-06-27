/**
 * =============================================================================
 * نقطة الدخول الرئيسية للتطبيق (main entry point)
 * -----------------------------------------------------------------------------
 * هذا الملف هو الذي يُحمّل أولاً ويُركّب تطبيق React داخل عنصر DOM الجذري.
 * يقوم بالتفريق بين تطبيق المتجر العادي (App) وتطبيق لوحة الإدارة (AdminApp)
 * اعتماداً على اسم النطاق (hostname) الذي يفتح منه المستخدم الموقع.
 * =============================================================================
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import AdminApp from './pages/admin/AdminApp.tsx';
import './index.css';

// تحديد ما إذا كان الموقع مفتوحاً عبر نطاق لوحة الإدارة:
// إمّا أن يبدأ النطاق بـ "admin." أو يكون نطاق التطوير المحلي admin.localhost
// أو أن يكون متغيّر البيئة VITE_FORCE_ADMIN مفعّلاً لفرض وضع الإدارة يدوياً.
const hostname = window.location.hostname;
const isAdminHost =
  hostname.startsWith('admin.') ||
  hostname === 'admin.localhost' ||
  import.meta.env.VITE_FORCE_ADMIN === 'true';

// تركيب الجذر داخل StrictMode (الذي يساعد على كشف المشكلات أثناء التطوير)،
// واختيار التطبيق المناسب: لوحة الإدارة عند نطاق الإدارة، وإلا متجر العملاء.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAdminHost ? <AdminApp /> : <App />}
  </StrictMode>
);
