import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AdminLayout from "./AdminLayout";
import OverviewPage from "./pages/OverviewPage";
import OrdersPage from "./pages/OrdersPage";
import PerfumesPage from "./pages/PerfumesPage";
import ReviewsPage from "./pages/ReviewsPage";
import GiftOrdersPage from "./pages/GiftOrdersPage";
import MemoriesPage from "./pages/MemoriesPage";
import CouponsPage from "./pages/CouponsPage";
import "@/App.css";

export default function AdminApp() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AdminAuthProvider>
          <Router>
            <Routes>
              <Route element={<AdminLayout />}>
                <Route index element={<OverviewPage />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="perfumes" element={<PerfumesPage />} />
                <Route path="reviews" element={<ReviewsPage />} />
                <Route path="gift-orders" element={<GiftOrdersPage />} />
                <Route path="memories" element={<MemoriesPage />} />
                <Route path="coupons" element={<CouponsPage />} />
              </Route>
            </Routes>
            <Toaster />
          </Router>
        </AdminAuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
