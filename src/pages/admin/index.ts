// ===========================================================================
// index.ts — تصدير مُجمَّع (barrel export) لوحدة الإدارة.
// يعيد تصدير نقاط دخول الإدارة بحيث تستطيع أجزاء أخرى من التطبيق استيرادها من
// مسار واحد (مثل `import { AdminApp } from "@/pages/admin"`).
// ===========================================================================
export { default as AdminApp } from "./AdminApp";
export { default as AdminLayout } from "./AdminLayout";
export { default as AdminPage } from "./AdminPage";
