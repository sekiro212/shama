import { Link, useLocation } from "react-router-dom";
import {
  ShoppingBag,
  Menu,
  Search,
  Heart,
  Globe,
  Sun,
  Moon,
  LogIn,
  LogOut,
  UserCircle,
  Sparkles,
  Package,
  Home,
  Gem,
  FlaskConical,
  Gift,
  Wand2,
  X,
} from "lucide-react";
import { useState, useEffect, ComponentType } from "react";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface HeaderProps {
  onCartClick: () => void;
  onSearchClick?: () => void;
}

type IconType = ComponentType<{ className?: string }>;

type NavItem = {
  name: string;
  href: string;
  Icon: IconType;
  isAiFinder?: boolean;
};

const ANNOUNCEMENT_DISMISS_KEY = "shama.announcement.dismissed";

export default function Header({ onCartClick, onSearchClick }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const { getItemCount } = useCart();
  const { items: wishlistItems } = useWishlist();
  const { t, isRTL, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const msg = t("header.announcement");
    const dismissed = sessionStorage.getItem(ANNOUNCEMENT_DISMISS_KEY) === "1";
    setAnnouncementOpen(Boolean(msg) && msg.trim().length > 0 && !dismissed);
  }, [t]);

  const dismissAnnouncement = () => {
    sessionStorage.setItem(ANNOUNCEMENT_DISMISS_KEY, "1");
    setAnnouncementOpen(false);
  };

  const navigation: NavItem[] = [
    { name: t("nav.home"), href: "/", Icon: Home },
    { name: t("nav.collection"), href: "/collection", Icon: Gem },
    { name: t("nav.samples"), href: "/samples", Icon: FlaskConical },
    { name: t("nav.giftSets"), href: "/gift-sets", Icon: Gift },
    { name: t("nav.findYourScent"), href: "/quiz", Icon: Wand2 },
    { name: t("nav.aiFinder"), href: "/ai-finder", Icon: Sparkles, isAiFinder: true },
  ];

  const isActive = (href: string) =>
    href === "/" ? location.pathname === "/" : location.pathname.startsWith(href);

  const iconBtn =
    "glass dark:bg-white/5 bg-[#5B8DD9]/10 dark:hover:bg-white/10 hover:bg-[#5B8DD9]/20 border dark:border-white/10 border-[#323D50]/10 rounded-xl w-10 h-10 transition-colors duration-300";

  const badge =
    "absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 bg-warm text-[#1a2235] text-[10px] rounded-full flex items-center justify-center font-bold leading-none ring-2 ring-[#F8F9FB] dark:ring-[#1a2235]";

  return (
    <>
      {/* Announcement bar */}
      {announcementOpen && (
        <div className="fixed top-0 inset-x-0 z-[60] bg-[#1a2235] dark:bg-[#0E1420] text-[#F5F5F5]/90 text-[11px] sm:text-xs tracking-[0.18em] uppercase">
          <div className="container mx-auto px-4 h-8 flex items-center justify-center relative">
            <span className="font-medium truncate text-center">
              {t("header.announcement")}
            </span>
            <button
              onClick={dismissAnnouncement}
              aria-label={t("common.close") || "Dismiss"}
              className="absolute end-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <header
        className={`fixed inset-x-0 z-50 transition-all duration-500 ${
          announcementOpen ? "top-8" : "top-0"
        } ${
          scrolled
            ? "backdrop-blur-xl bg-[#F8F9FB]/85 dark:bg-[#1a2235]/85 border-b border-warm/10"
            : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            {/* Logo */}
            <Link
              to="/"
              className="group flex items-center space-x-3 rtl:space-x-reverse transition-transform duration-300 hover:scale-[1.02]"
              aria-label="Shama Perfumes home"
            >
              <div className="relative">
                <div className="w-10 h-10 glass rounded-xl overflow-hidden border border-[#323D50]/10 dark:border-white/10">
                  <img
                    src="/shama-logo.jpg"
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 rounded-xl ring-0 group-hover:ring-2 group-hover:ring-warm/40 transition-all duration-300 pointer-events-none" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-display text-[22px] font-semibold tracking-tight text-[#1E2A3D] dark:text-[#F5F5F5]">
                  Shama
                </span>
                <span className="font-display italic text-[11px] tracking-[0.2em] text-warm mt-1">
                  {t("header.luxuryScents")}
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1" aria-label="Primary">
              {navigation.map((item) => {
                const active = isActive(item.href);
                const Icon = item.Icon;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    aria-current={active ? "page" : undefined}
                    className="group relative px-2.5 py-2 rounded-lg transition-colors duration-300 hover:bg-[#5B8DD9]/5 dark:hover:bg-white/5 whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon
                        className={`w-4 h-4 transition-colors duration-300 ${
                          item.isAiFinder
                            ? "text-[#5B8DD9]"
                            : active
                            ? "text-warm"
                            : "text-[#3E6BB5] dark:text-[#8BB4F0]"
                        }`}
                      />
                      <span
                        className={`text-[13px] font-medium transition-colors duration-300 ${
                          active
                            ? "text-[#1E2A3D] dark:text-[#F5F5F5]"
                            : "text-[#323D50]/80 dark:text-white/80"
                        }`}
                      >
                        {item.name}
                      </span>
                    </div>
                    <span
                      className={`absolute bottom-0 left-2.5 right-2.5 h-[2px] bg-warm origin-center transition-transform duration-300 ${
                        active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                      }`}
                      aria-hidden
                    />
                  </Link>
                );
              })}
            </nav>

            {/* Desktop Utilities */}
            <div className="hidden lg:flex items-center gap-3">
              {/* Preferences cluster: Theme + Language + Search */}
              <div className="flex items-center gap-1 p-1 rounded-2xl glass border dark:border-white/10 border-[#323D50]/10">
                <Button
                  onClick={toggleTheme}
                  variant="ghost"
                  size="icon"
                  aria-label={t("header.toggleTheme")}
                  className="rounded-xl w-9 h-9 hover:bg-[#5B8DD9]/15 dark:hover:bg-white/10 transition-colors"
                >
                  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
                <Button
                  onClick={() => setLanguage(language === "en" ? "ar" : "en")}
                  variant="ghost"
                  aria-label={t("header.toggleLanguage")}
                  className="rounded-xl px-2.5 h-9 text-xs font-semibold tracking-wider hover:bg-[#5B8DD9]/15 dark:hover:bg-white/10"
                >
                  <Globe className="w-4 h-4 me-1.5" />
                  {language === "en" ? "AR" : "EN"}
                </Button>
                <Button
                  onClick={onSearchClick}
                  variant="ghost"
                  size="icon"
                  aria-label={t("header.search")}
                  className="rounded-xl w-9 h-9 hover:bg-[#5B8DD9]/15 dark:hover:bg-white/10 transition-colors"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>

              {/* Commerce cluster: Account + Wishlist + Cart */}
              <div className="flex items-center gap-2">
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={user.email || t("header.account")}
                        className={iconBtn}
                      >
                        <UserCircle className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align={isRTL ? "start" : "end"}
                      className="w-56 glass-card dark:bg-[#1a2235]/95 bg-white/95 backdrop-blur-xl border dark:border-white/10 border-[#323D50]/10 rounded-xl"
                    >
                      <DropdownMenuLabel className="font-normal text-xs text-[#6B7B8D] dark:text-white/60 truncate">
                        {user.email}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="dark:bg-white/10 bg-[#323D50]/10" />
                      <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
                        <Link to="/my-orders" className="flex items-center gap-2 text-sm">
                          <Package className="w-4 h-4" />
                          {t("header.myOrders")}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          signOut();
                          toast.success(t("header.signedOutSuccess"));
                        }}
                        className="cursor-pointer rounded-lg gap-2 text-sm"
                      >
                        <LogOut className="w-4 h-4" />
                        {t("header.signOut")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link to="/login">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("header.signIn")}
                      className={iconBtn}
                    >
                      <LogIn className="w-4 h-4" />
                    </Button>
                  </Link>
                )}

                <Link to="/wishlist">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("header.wishlist")}
                    className={`${iconBtn} relative`}
                  >
                    <Heart className="w-4 h-4" />
                    {wishlistItems.length > 0 && (
                      <span className={badge}>{wishlistItems.length}</span>
                    )}
                  </Button>
                </Link>

                <Button
                  onClick={onCartClick}
                  aria-label={t("header.cart")}
                  className="bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white border-0 rounded-xl px-4 h-10 font-medium glow-warm-hover relative"
                >
                  <ShoppingBag className="w-4 h-4 me-2" />
                  <span className="inline-flex items-center gap-2">
                    {t("header.cart")}
                    {getItemCount() > 0 && (
                      <span className="min-w-[22px] h-5 px-1.5 bg-warm text-[#1a2235] text-[11px] rounded-full flex items-center justify-center font-bold leading-none">
                        {getItemCount() > 99 ? "99+" : getItemCount()}
                      </span>
                    )}
                  </span>
                </Button>
              </div>
            </div>

            {/* Mobile Actions: Cart + Menu */}
            <div className="flex items-center gap-2 lg:hidden">
              <Button
                onClick={onCartClick}
                aria-label={t("header.cart")}
                variant="ghost"
                size="icon"
                className={`${iconBtn} w-11 h-11 dark:text-[#F5F5F5] text-[#323D50] relative`}
              >
                <ShoppingBag className="h-5 w-5" />
                {getItemCount() > 0 && (
                  <span className={badge}>
                    {getItemCount() > 99 ? "99+" : getItemCount()}
                  </span>
                )}
              </Button>
              <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("header.menu")}
                    className={`${iconBtn} w-11 h-11 dark:text-[#F5F5F5] text-[#323D50]`}
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side={isRTL ? "left" : "right"}
                  className="glass-card bg-[#F8F9FB]/98 dark:bg-[#1a2235]/95 backdrop-blur-2xl border-s border-warm/15 w-80"
                >
                  {/* Mobile Menu Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                      <div className="w-8 h-8 glass rounded-lg overflow-hidden border border-[#323D50]/10 dark:border-white/10">
                        <img src="/shama-logo.jpg" alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col leading-none">
                        <span className="font-display text-lg font-semibold text-[#1E2A3D] dark:text-[#F5F5F5]">
                          Shama
                        </span>
                        <span className="font-display italic text-[10px] tracking-[0.2em] text-warm mt-0.5">
                          {t("header.luxuryScents")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Navigation */}
                  <nav className="space-y-1.5 mb-6" aria-label="Primary mobile">
                    {navigation.map((item) => {
                      const active = isActive(item.href);
                      const Icon = item.Icon;
                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          onClick={() => setIsMenuOpen(false)}
                          aria-current={active ? "page" : undefined}
                          className={`relative flex items-center gap-3 rounded-xl px-4 py-3 transition-colors ${
                            active
                              ? "bg-warm/10 text-[#1E2A3D] dark:text-[#F5F5F5]"
                              : "hover:bg-[#5B8DD9]/10 dark:hover:bg-white/5 text-[#323D50]/85 dark:text-white/85"
                          }`}
                        >
                          <Icon
                            className={`w-5 h-5 ${
                              item.isAiFinder
                                ? "text-[#5B8DD9]"
                                : active
                                ? "text-warm"
                                : "text-[#3E6BB5] dark:text-[#8BB4F0]"
                            }`}
                          />
                          <span className="font-medium text-sm">{item.name}</span>
                          {active && (
                            <span
                              className="absolute start-0 top-2 bottom-2 w-[2px] rounded-full bg-warm"
                              aria-hidden
                            />
                          )}
                        </Link>
                      );
                    })}
                  </nav>

                  {/* Mobile Search */}
                  <Button
                    onClick={() => {
                      onSearchClick?.();
                      setIsMenuOpen(false);
                    }}
                    variant="ghost"
                    className="w-full glass dark:bg-white/5 bg-[#5B8DD9]/10 dark:hover:bg-white/10 hover:bg-[#5B8DD9]/20 border dark:border-white/10 border-[#323D50]/10 rounded-xl h-11 text-sm font-semibold transition-colors mb-2"
                  >
                    <Search className="w-4 h-4 me-2" />
                    {t("header.search")}
                  </Button>

                  {/* Mobile Wishlist */}
                  <Link to="/wishlist" onClick={() => setIsMenuOpen(false)}>
                    <Button
                      variant="ghost"
                      className="w-full glass dark:bg-white/5 bg-[#5B8DD9]/10 dark:hover:bg-white/10 hover:bg-[#5B8DD9]/20 border dark:border-white/10 border-[#323D50]/10 rounded-xl h-11 text-sm font-semibold transition-colors mb-4"
                    >
                      <Heart className="w-4 h-4 me-2" />
                      {t("header.wishlist")}
                      {wishlistItems.length > 0 && (
                        <span className="ms-2 min-w-[22px] h-5 px-1.5 bg-warm text-[#1a2235] text-[11px] rounded-full inline-flex items-center justify-center font-bold">
                          {wishlistItems.length}
                        </span>
                      )}
                    </Button>
                  </Link>

                  {/* Mobile Preferences cluster */}
                  <div className="flex items-center gap-2 mb-4 p-1 rounded-2xl glass border dark:border-white/10 border-[#323D50]/10">
                    <Button
                      onClick={toggleTheme}
                      variant="ghost"
                      aria-label={t("header.toggleTheme")}
                      className="flex-1 rounded-xl h-10 text-xs font-semibold hover:bg-[#5B8DD9]/15 dark:hover:bg-white/10"
                    >
                      {theme === "dark" ? (
                        <Sun className="w-4 h-4 me-1.5" />
                      ) : (
                        <Moon className="w-4 h-4 me-1.5" />
                      )}
                      {t("header.toggleTheme")}
                    </Button>
                    <Button
                      onClick={() => setLanguage(language === "en" ? "ar" : "en")}
                      variant="ghost"
                      aria-label={t("header.toggleLanguage")}
                      className="rounded-xl px-3 h-10 text-xs font-semibold hover:bg-[#5B8DD9]/15 dark:hover:bg-white/10"
                    >
                      <Globe className="w-4 h-4 me-1.5" />
                      {language === "en" ? "AR" : "EN"}
                    </Button>
                  </div>

                  {/* Mobile Auth */}
                  {user ? (
                    <div className="space-y-2 mb-4">
                      <p className="dark:text-white/60 text-[#6B7B8D] text-xs truncate px-3">
                        {user.email}
                      </p>
                      <Link to="/my-orders" onClick={() => setIsMenuOpen(false)}>
                        <Button
                          variant="ghost"
                          className="w-full glass dark:bg-white/5 bg-[#5B8DD9]/10 dark:hover:bg-white/10 hover:bg-[#5B8DD9]/20 border dark:border-white/10 border-[#323D50]/10 rounded-xl h-11 text-sm font-semibold transition-colors mb-2"
                        >
                          <Package className="w-4 h-4 me-2" />
                          {t("header.myOrders")}
                        </Button>
                      </Link>
                      <Button
                        onClick={() => {
                          signOut();
                          setIsMenuOpen(false);
                          toast.success(t("header.signedOutSuccess"));
                        }}
                        variant="ghost"
                        className="w-full glass dark:bg-white/5 bg-[#5B8DD9]/10 dark:hover:bg-white/10 hover:bg-[#5B8DD9]/20 border dark:border-white/10 border-[#323D50]/10 rounded-xl h-11 text-sm font-semibold transition-colors"
                      >
                        <LogOut className="w-4 h-4 me-2" />
                        {t("header.signOut")}
                      </Button>
                    </div>
                  ) : (
                    <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                      <Button
                        variant="ghost"
                        className="w-full glass dark:bg-white/5 bg-[#5B8DD9]/10 dark:hover:bg-white/10 hover:bg-[#5B8DD9]/20 border dark:border-white/10 border-[#323D50]/10 rounded-xl h-11 text-sm font-semibold transition-colors mb-4"
                      >
                        <LogIn className="w-4 h-4 me-2" />
                        {t("header.signIn")}
                      </Button>
                    </Link>
                  )}

                  {/* Mobile Cart */}
                  <Button
                    onClick={() => {
                      onCartClick();
                      setIsMenuOpen(false);
                    }}
                    className="w-full bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white border-0 rounded-xl py-4 font-semibold glow-warm-hover"
                  >
                    <ShoppingBag className="w-5 h-5 me-2" />
                    {t("header.cart")}
                    {getItemCount() > 0 && (
                      <span className="ms-2 min-w-[24px] h-6 px-1.5 bg-warm text-[#1a2235] text-xs rounded-full inline-flex items-center justify-center font-bold">
                        {getItemCount() > 99 ? "99+" : getItemCount()}
                      </span>
                    )}
                  </Button>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
