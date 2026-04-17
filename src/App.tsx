import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AnimatePresence, motion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HomePage from "@/pages/HomePage";
import ProductPage from "@/pages/ProductPage";
import CollectionPage from "@/pages/CollectionPage";
import GiftSetsPage from "@/pages/GiftSetsPage";
import AdminRedirect from "@/pages/AdminRedirect";
import FragranceQuizPage from "@/pages/FragranceQuizPage";
import WishlistPage from "@/pages/WishlistPage";
import OrderTrackingPage from "@/pages/OrderTrackingPage";
import SamplesPage from "@/pages/SamplesPage";
import LoginPage from "@/pages/LoginPage";
import AIFinderPage from "@/pages/AIFinderPage";
import EmailPreferencesPage from "@/pages/EmailPreferencesPage";
import MyOrdersPage from "@/pages/MyOrdersPage";
import PrivacyPage from "@/pages/PrivacyPage";
import TermsPage from "@/pages/TermsPage";
import CookiesPage from "@/pages/CookiesPage";
import ShippingPage from "@/pages/ShippingPage";
import ReturnsPage from "@/pages/ReturnsPage";
import FAQPage from "@/pages/FAQPage";
import AboutPage from "@/pages/AboutPage";
import ContactPage from "@/pages/ContactPage";
import ReviewsPage from "@/pages/ReviewsPage";
import CartSidebar from "@/components/CartSidebar";
import SearchDialog from "@/components/SearchDialog";
import CookieBanner from "@/components/CookieBanner";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ChatbotButton } from "@/components/ui/ChatbotButton";
import "./App.css";

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

function AnimatedRoutes({ isCartOpen, setIsCartOpen }: { isCartOpen: boolean; setIsCartOpen: (v: boolean) => void }) {
  const location = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <>
      {!isAdminRoute && (
        <Header
          onCartClick={() => setIsCartOpen(true)}
          onSearchClick={() => setIsSearchOpen(true)}
        />
      )}
      <SearchDialog open={isSearchOpen} onOpenChange={setIsSearchOpen} />
      <main>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
            <Route path="/product/:id" element={<PageTransition><ProductPage /></PageTransition>} />
            <Route path="/collection" element={<PageTransition><CollectionPage /></PageTransition>} />
            <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
            <Route path="/gift-sets" element={<PageTransition><GiftSetsPage /></PageTransition>} />
            <Route path="/quiz" element={<PageTransition><FragranceQuizPage /></PageTransition>} />
            <Route path="/wishlist" element={<PageTransition><WishlistPage /></PageTransition>} />
            <Route path="/samples" element={<PageTransition><SamplesPage /></PageTransition>} />
            <Route path="/track-order" element={<PageTransition><OrderTrackingPage /></PageTransition>} />
            <Route path="/my-orders" element={<PageTransition><MyOrdersPage /></PageTransition>} />
            <Route path="/admin" element={<PageTransition><AdminRedirect /></PageTransition>} />
            <Route path="/ai-finder" element={<PageTransition><AIFinderPage /></PageTransition>} />
            <Route path="/settings" element={<PageTransition><EmailPreferencesPage /></PageTransition>} />
            <Route path="/shipping" element={<PageTransition><ShippingPage /></PageTransition>} />
            <Route path="/returns" element={<PageTransition><ReturnsPage /></PageTransition>} />
            <Route path="/privacy" element={<PageTransition><PrivacyPage /></PageTransition>} />
            <Route path="/terms" element={<PageTransition><TermsPage /></PageTransition>} />
            <Route path="/cookies" element={<PageTransition><CookiesPage /></PageTransition>} />
            <Route path="/faq" element={<PageTransition><FAQPage /></PageTransition>} />
            <Route path="/about" element={<PageTransition><AboutPage /></PageTransition>} />
            <Route path="/contact" element={<PageTransition><ContactPage /></PageTransition>} />
            <Route path="/reviews" element={<PageTransition><ReviewsPage /></PageTransition>} />
          </Routes>
        </AnimatePresence>
      </main>
      {!isAdminRoute && <Footer />}
      <CartSidebar
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
      />
      <ChatbotButton />
      {!isAdminRoute && <CookieBanner />}
      <Toaster />
    </>
  );
}

function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider>
          <CartProvider>
            <WishlistProvider>
              <Router>
                <div className="min-h-screen bg-[#F8F9FB] dark:bg-[#1a2235] text-[#323D50] dark:text-[#F5F5F5] w-full overflow-x-hidden">
                  <AnimatedRoutes isCartOpen={isCartOpen} setIsCartOpen={setIsCartOpen} />
                </div>
              </Router>
            </WishlistProvider>
          </CartProvider>
        </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
