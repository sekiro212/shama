/**
 * =============================================================================
 * المكوّن الجذري لتطبيق المتجر (App)
 * -----------------------------------------------------------------------------
 * يُعرّف هذا الملف هيكل التطبيق العام: تسلسل مزوّدي السياق (Providers)،
 * ونظام التوجيه (Routing)، والعناصر الثابتة المشتركة بين الصفحات مثل
 * الرأس (Header) والتذييل (Footer) والسلة وزر المحادثة الآلية.
 * تُحمَّل معظم الصفحات بأسلوب التحميل الكسول (lazy) لتحسين الأداء.
 * =============================================================================
 */
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { useState, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AnimatePresence, motion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HomePage from "@/pages/HomePage";
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

// تحميل كسول (lazy loading) لصفحات التطبيق: كل صفحة تُجلب في حزمة منفصلة
// عند زيارتها فقط، مما يقلّل حجم الحزمة الأولية ويسرّع أول تحميل للموقع.
const ProductPage = lazy(() => import("@/pages/ProductPage"));
const CollectionPage = lazy(() => import("@/pages/CollectionPage"));
const GiftSetsPage = lazy(() => import("@/pages/GiftSetsPage"));
const AdminRedirect = lazy(() => import("@/pages/AdminRedirect"));
const FragranceQuizPage = lazy(() => import("@/pages/FragranceQuizPage"));
const WishlistPage = lazy(() => import("@/pages/WishlistPage"));
const SamplesPage = lazy(() => import("@/pages/SamplesPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const AIFinderPage = lazy(() => import("@/pages/AIFinderPage"));
const EmailPreferencesPage = lazy(() => import("@/pages/EmailPreferencesPage"));
const MyOrdersPage = lazy(() => import("@/pages/MyOrdersPage"));
const PrivacyPage = lazy(() => import("@/pages/PrivacyPage"));
const TermsPage = lazy(() => import("@/pages/TermsPage"));
const CookiesPage = lazy(() => import("@/pages/CookiesPage"));
const ShippingPage = lazy(() => import("@/pages/ShippingPage"));
const ReturnsPage = lazy(() => import("@/pages/ReturnsPage"));
const FAQPage = lazy(() => import("@/pages/FAQPage"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const ContactPage = lazy(() => import("@/pages/ContactPage"));
const ReviewsPage = lazy(() => import("@/pages/ReviewsPage"));
const CheckoutPage = lazy(() => import("@/pages/CheckoutPage"));
const OrderSuccessPage = lazy(() => import("@/pages/OrderSuccessPage"));

/**
 * مكوّن غلاف يضيف حركة انتقالية ناعمة عند الدخول والخروج من كل صفحة.
 * يُستخدم مع AnimatePresence لإظهار الصفحة بتأثير تلاشٍ وانزلاق رأسي خفيف.
 */
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

/**
 * المكوّن المسؤول عن عرض المسارات (Routes) مع تطبيق الحركات الانتقالية.
 * يدير أيضاً ظهور نافذة البحث، ويخفي الرأس والتذييل وشريط الكوكيز
 * في مسارات لوحة الإدارة لأنها تملك واجهتها الخاصة.
 */
function AnimatedRoutes({ isCartOpen, setIsCartOpen }: { isCartOpen: boolean; setIsCartOpen: (v: boolean) => void }) {
  const location = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  // تحديد ما إذا كان المسار الحالي يخص لوحة الإدارة لإخفاء عناصر المتجر العامة.
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
        {/* AnimatePresence بوضع "wait" ينتظر انتهاء حركة خروج الصفحة قبل دخول الجديدة */}
        <AnimatePresence mode="wait">
          {/* Suspense يعرض عنصراً بديلاً (placeholder) ريثما تُجلب حزمة الصفحة المحمّلة كسولياً */}
          <Suspense fallback={<div className="min-h-[60dvh]" aria-hidden="true" />}>
            {/* مفتاح key المرتبط بالمسار يجبر React على إعادة التركيب عند تغيّر الصفحة لتشغيل الحركة */}
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
              <Route path="/product/:id" element={<PageTransition><ProductPage /></PageTransition>} />
              <Route path="/collection" element={<PageTransition><CollectionPage /></PageTransition>} />
              <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
              <Route path="/gift-sets" element={<PageTransition><GiftSetsPage /></PageTransition>} />
              <Route path="/quiz" element={<PageTransition><FragranceQuizPage /></PageTransition>} />
              <Route path="/wishlist" element={<PageTransition><WishlistPage /></PageTransition>} />
              <Route path="/samples" element={<PageTransition><SamplesPage /></PageTransition>} />
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
              <Route path="/checkout" element={<PageTransition><CheckoutPage /></PageTransition>} />
              <Route path="/order-success/:orderId" element={<PageTransition><OrderSuccessPage /></PageTransition>} />
            </Routes>
          </Suspense>
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

/**
 * المكوّن الجذري الذي يركّب تسلسل مزوّدي السياق ثم نظام التوجيه.
 * يحتفظ بحالة فتح/إغلاق سلة المشتريات ويمرّرها للمسارات.
 */
function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    // تسلسل مزوّدي السياق (Provider hierarchy) — الترتيب مقصود:
    // المصادقة (Auth) تغلّف الكل، ثم السمة (Theme)، ثم اللغة (Language)،
    // ثم السلة (Cart)، ثم قائمة الأمنيات (Wishlist)، ثم الموجّه (Router).
    // كل مزوّد داخلي يستطيع الوصول إلى السياقات الأعلى منه.
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider>
          <CartProvider>
            <WishlistProvider>
              <Router>
                <div className="min-h-dvh bg-[#F8F9FB] dark:bg-[#1a2235] text-[#323D50] dark:text-[#F5F5F5] w-full overflow-x-hidden">
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
