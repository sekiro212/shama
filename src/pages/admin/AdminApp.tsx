import { BrowserRouter as Router } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import AdminPage from "@/pages/admin/AdminPage";
import AdminLayout from "@/pages/admin/AdminLayout";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import "@/App.css";

export default function AdminApp() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AdminAuthProvider>
          <Router>
            <AdminLayout>
              <AdminPage />
            </AdminLayout>
            <Toaster />
          </Router>
        </AdminAuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
