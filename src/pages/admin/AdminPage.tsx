import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Package,
  ShoppingCart,
  Star,
  Gift,
  Heart,
  Ticket,
  Lock,
  LogOut,
  Globe,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  authenticateAdmin,
  isAdminAuthenticated,
  getCurrentAdmin,
  logoutAdmin,
  LoginCredentials,
} from "@/services/authService";
import { useOrders } from "./hooks/useOrders";
import { usePerfumes } from "./hooks/usePerfumes";
import { useReviews } from "./hooks/useReviews";
import { useMemories } from "./hooks/useMemories";
import { useGiftOrders } from "./hooks/useGiftOrders";
import { useCoupons } from "./hooks/useCoupons";
import { OverviewTab } from "./tabs/OverviewTab";
import { PerfumesTab } from "./tabs/PerfumesTab";
import { OrdersTab } from "./tabs/OrdersTab";
import { ReviewsTab } from "./tabs/ReviewsTab";
import { GiftOrdersTab } from "./tabs/GiftOrdersTab";
import { MemoriesTab } from "./tabs/MemoriesTab";
import { CouponsTab } from "./tabs/CouponsTab";
import { LoginDialog } from "./dialogs/LoginDialog";
import { PerfumeFormDialog } from "./dialogs/PerfumeFormDialog";
import { OrderDetailsDialog } from "./dialogs/OrderDetailsDialog";
import { ImageModal } from "./dialogs/ImageModal";
import { CouponFormDialog } from "./dialogs/CouponFormDialog";

export default function AdminPage() {
  const { t, isRTL, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [loginCredentials, setLoginCredentials] = useState<LoginCredentials>({
    username: "",
    password: "",
  });
  const [loginLoading, setLoginLoading] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Lifted hooks
  const perfumesApi = usePerfumes();
  const ordersApi = useOrders({ onStockMutated: () => perfumesApi.loadPerfumes() });
  const reviewsApi = useReviews();
  const memoriesApi = useMemories();
  const giftOrdersApi = useGiftOrders();
  const couponsApi = useCoupons({ perfumes: perfumesApi.perfumes });

  const loadData = async () => {
    await Promise.all([
      perfumesApi.loadPerfumes(),
      ordersApi.loadOrders(),
      ordersApi.loadOrderStats(),
      reviewsApi.loadReviews(),
      giftOrdersApi.fetchGiftOrders(),
      memoriesApi.loadMemories(),
      couponsApi.loadCoupons(),
    ]);
  };

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAdminAuthenticated();
      setIsAuthenticated(authenticated);

      if (authenticated) {
        const admin = getCurrentAdmin();
        setCurrentAdmin(admin);
        loadData();
      } else {
        setShowLoginDialog(true);
      }
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async () => {
    try {
      setLoginLoading(true);
      const result = await authenticateAdmin(loginCredentials);

      if (result.success && result.user) {
        setIsAuthenticated(true);
        setCurrentAdmin(result.user);
        setShowLoginDialog(false);
        setLoginCredentials({ username: "", password: "" });
        toast.success(t("admin.login.loginSuccess"));
        loadData();
      } else {
        toast.error(result.error || t("admin.login.loginFailed"));
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error(t("admin.login.loginFailed"));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    logoutAdmin();
    setIsAuthenticated(false);
    setCurrentAdmin(null);
    setShowLoginDialog(true);
    toast.success(t("admin.logoutSuccess"));
  };

  // Loading and authentication checks
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-20 text-center bg-[#F8F9FB] dark:bg-[#1a2235] min-h-screen flex items-center justify-center">
        <div className="glass-card p-12 rounded-2xl text-center max-w-md">
          <Lock className="w-16 h-16 text-[#5B8DD9] mx-auto mb-6" />
          <h2 className="text-2xl font-bold gradient-text mb-4">
            {t("admin.authRequired")}
          </h2>
          <p className="text-[#6B7B8D] dark:text-white/60">
            {t("admin.authMessage")}
          </p>
        </div>
        <LoginDialog
          open={showLoginDialog}
          onOpenChange={() => {}}
          loginCredentials={loginCredentials}
          setLoginCredentials={setLoginCredentials}
          loginLoading={loginLoading}
          onLogin={handleLogin}
        />
      </div>
    );
  }

  if (perfumesApi.loading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center bg-[#F8F9FB] dark:bg-[#1a2235] min-h-screen flex items-center justify-center">
        <div className="glass-card p-12 rounded-2xl text-center">
          <Package className="w-16 h-16 text-[#5B8DD9] mx-auto mb-6 animate-pulse" />
          <h2 className="text-2xl font-bold gradient-text mb-4">{t("admin.loadingTitle")}</h2>
          <p className="text-[#6B7B8D] dark:text-white/60">{t("admin.fetchingData")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pt-[80px] md:pt-24 pb-20 bg-[#F8F9FB] dark:bg-[#1a2235] min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-4">
              {t("admin.dashboard")}
            </h1>
            <p className="text-[#6B7B8D] dark:text-white/60">
              {t("admin.welcomeBack")} {currentAdmin?.username}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={toggleTheme}
              variant="outline"
              size="icon"
              className="glass dark:bg-white/5 bg-[#5B8DD9]/10 dark:hover:bg-white/10 hover:bg-[#5B8DD9]/20 border dark:border-white/10 border-[#323D50]/10 rounded-xl w-10 h-10"
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button
              onClick={() => setLanguage(language === "en" ? "ar" : "en")}
              variant="outline"
              className="glass dark:bg-white/5 bg-[#5B8DD9]/10 dark:hover:bg-white/10 hover:bg-[#5B8DD9]/20 border dark:border-white/10 border-[#323D50]/10 rounded-xl px-3 h-10 text-sm font-semibold"
            >
              <Globe className="w-4 h-4 me-1.5" />
              {language === "en" ? "AR" : "EN"}
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="border-[#323D50]/15 dark:border-white/20 text-white hover:bg-red-500/20"
            >
              <LogOut className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
              {t("admin.logout")}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7 glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-[#5B8DD9]"
            >
              <Package className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
              {t("admin.tabs.overview")}
            </TabsTrigger>
            <TabsTrigger
              value="perfumes"
              className="data-[state=active]:bg-[#5B8DD9]"
            >
              <Package className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
              {t("admin.tabs.perfumes")}
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="data-[state=active]:bg-[#5B8DD9]"
            >
              <ShoppingCart className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
              {t("admin.tabs.orders")}
            </TabsTrigger>
            <TabsTrigger
              value="reviews"
              className="data-[state=active]:bg-[#5B8DD9]"
            >
              <Star className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
              {t("admin.tabs.reviews")}
              {reviewsApi.pendingReviewCount > 0 && (
                <Badge className="ms-2 bg-amber-500 text-white text-xs px-1.5 py-0">
                  {reviewsApi.pendingReviewCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="giftOrders"
              className="data-[state=active]:bg-[#5B8DD9]"
            >
              <Gift className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
              {t("admin.tabs.giftOrders")}
            </TabsTrigger>
            <TabsTrigger
              value="memories"
              className="data-[state=active]:bg-[#5B8DD9]"
            >
              <Heart className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
              {t("admin.tabs.memories")}
              {memoriesApi.pendingMemoryCount > 0 && (
                <Badge className="ms-2 bg-amber-500 text-white text-xs px-1.5 py-0">
                  {memoriesApi.pendingMemoryCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="coupons"
              className="data-[state=active]:bg-[#5B8DD9]"
            >
              <Ticket className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
              {t("admin.tabs.coupons")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <OverviewTab
              orderStats={ordersApi.orderStats}
              perfumesCount={perfumesApi.perfumes.length}
            />
          </TabsContent>

          <TabsContent value="perfumes" className="mt-6">
            <PerfumesTab perfumesApi={perfumesApi} />
          </TabsContent>

          <TabsContent value="orders" className="mt-6">
            <OrdersTab ordersApi={ordersApi} />
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <ReviewsTab reviewsApi={reviewsApi} />
          </TabsContent>

          <TabsContent value="giftOrders" className="mt-6">
            <GiftOrdersTab giftOrdersApi={giftOrdersApi} />
          </TabsContent>

          <TabsContent value="memories" className="mt-6">
            <MemoriesTab memoriesApi={memoriesApi} />
          </TabsContent>

          <TabsContent value="coupons" className="mt-6">
            <CouponsTab couponsApi={couponsApi} />
          </TabsContent>
        </Tabs>
      </div>

      <PerfumeFormDialog perfumesApi={perfumesApi} />
      <OrderDetailsDialog
        open={ordersApi.showOrderDetails}
        onOpenChange={ordersApi.setShowOrderDetails}
        order={ordersApi.selectedOrder}
        onImageClick={ordersApi.handleImageClick}
      />
      <ImageModal
        open={ordersApi.showImageModal}
        onOpenChange={ordersApi.setShowImageModal}
        imageUrl={ordersApi.selectedImage}
      />
      <CouponFormDialog couponsApi={couponsApi} perfumes={perfumesApi.perfumes} />
    </div>
  );
}
