import { Link } from "react-router-dom";
import { ShoppingBag, Menu, Search, Heart, Globe, Sun, Moon, LogIn, LogOut, UserCircle, Sparkles, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";

interface HeaderProps {
  onCartClick: () => void;
  onSearchClick?: () => void;
}

export default function Header({ onCartClick, onSearchClick }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isWhisperMode, setIsWhisperMode] = useState(false);
  const { getItemCount } = useCart();
  const { items: wishlistItems } = useWishlist();
  const { t, isRTL, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isWhisperMode) {
      document.body.classList.add("whisper-mode");
    } else {
      document.body.classList.remove("whisper-mode");
    }
    return () => document.body.classList.remove("whisper-mode");
  }, [isWhisperMode]);

  const navigation = [
    { name: t("nav.home"), href: "/", icon: "🏠" },
    { name: t("nav.collection"), href: "/collection", icon: "💎" },
    { name: t("nav.samples"), href: "/samples", icon: "🧪" },
    { name: t("nav.giftSets"), href: "/gift-sets", icon: "🎁" },
    { name: t("nav.findYourScent"), href: "/quiz", icon: "✨" },
    { name: t("nav.aiFinder"), href: "/ai-finder", icon: null, isAiFinder: true },
  ];

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        scrolled
          ? "glass-card backdrop-blur-2xl bg-[#F8F9FB]/90 dark:bg-[#1a2235]/90 border-b border-[#5B8DD9]/20 shadow-2xl shadow-[#5B8DD9]/10"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            className="group flex items-center space-x-3 rtl:space-x-reverse transition-all duration-300 hover:scale-105"
          >
            <div className="relative">
              <div className="w-10 h-10 glass rounded-xl overflow-hidden border border-[#323D50]/10 dark:border-white/10 group-hover:scale-110 transition-transform duration-300">
                <img
                  src="https://p16-sign-va.tiktokcdn.com/tos-maliva-avt-0068/e159f380a3a42644f03ca7442d2864b0~tplv-tiktokx-cropcenter:1080:1080.jpeg?dr=14579&refresh_token=8be9595c&x-expires=1753538400&x-signature=%2BNcK7CjJZDsNOmd9K1lUKJvPE8M%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=maliva"
                  alt="Shama Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute inset-0 w-10 h-10 bg-gradient-to-br from-[#5B8DD9] to-[#3E6BB5] rounded-xl blur opacity-50 group-hover:opacity-75 transition-opacity duration-300" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold gradient-text tracking-tight">
                Shama
              </span>
              <span className="text-xs dark:text-white/60 text-[#6B7B8D] font-medium tracking-widest">
                {t("header.luxuryScents")}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-2 rtl:space-x-reverse">
            {navigation.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="group relative px-4 py-2 rounded-xl transition-all duration-300 hover:bg-white/5"
              >
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  {item.isAiFinder ? (
                    <Sparkles className="w-4 h-4 text-[#5B8DD9] group-hover:text-[#3E6BB5] transition-colors duration-300" />
                  ) : (
                    <span className="text-lg">{item.icon}</span>
                  )}
                  <span className=" font-medium transition-colors duration-300">
                    {item.name}
                  </span>
                </div>
                <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center space-x-3 rtl:space-x-reverse">
            {/* Whisper Mode Toggle */}
            <Button
              onClick={() => setIsWhisperMode((w) => !w)}
              variant="ghost"
              size="icon"
              className="glass dark:bg-white/5 bg-[#5B8DD9]/10 dark:hover:bg-white/10 hover:bg-[#5B8DD9]/20 border dark:border-white/10 border-[#323D50]/10 rounded-xl w-10 h-10 transition-all duration-300 hover:scale-105"
              title={isWhisperMode ? t("header.exitWhisperMode") : t("header.whisperMode")}
            >
              {isWhisperMode ? (
                <EyeOff className="w-4 h-4 text-[#5B8DD9]" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </Button>

            {/* Theme Toggle */}
            <Button
              onClick={toggleTheme}
              variant="ghost"
              size="icon"
              className="glass dark:bg-white/5 bg-[#5B8DD9]/10 dark:hover:bg-white/10 hover:bg-[#5B8DD9]/20  border dark:border-white/10 border-[#323D50]/10 rounded-xl w-10 h-10 transition-all duration-300 hover:scale-105"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            {/* Language Toggle */}
            <Button
              onClick={() => setLanguage(language === "en" ? "ar" : "en")}
              variant="ghost"
              className="glass dark:bg-white/5 bg-[#5B8DD9]/10 dark:hover:bg-white/10 hover:bg-[#5B8DD9]/20  border dark:border-white/10 border-[#323D50]/10 rounded-xl px-3 h-10 text-sm font-semibold transition-all duration-300 hover:scale-105"
            >
              <Globe className="w-4 h-4 me-1.5" />
              {language === "en" ? "AR" : "EN"}
            </Button>

            {/* Search Button */}
            <Button
              onClick={onSearchClick}
              variant="ghost"
              size="icon"
              className="glass dark:bg-white/5 bg-[#5B8DD9]/10 dark:hover:bg-white/10 hover:bg-[#5B8DD9]/20  border dark:border-white/10 border-[#323D50]/10 rounded-xl w-10 h-10 transition-all duration-300 hover:scale-105"
              title="Search (Ctrl+K)"
            >
              <Search className="w-4 h-4" />
            </Button>

            {/* Auth Button */}
            {user ? (
              <div className="relative group">
                <Button
                  variant="ghost"
                  size="icon"
                  className="glass dark:bg-white/5 bg-[#5B8DD9]/10 dark:hover:bg-white/10 hover:bg-[#5B8DD9]/20  border dark:border-white/10 border-[#323D50]/10 rounded-xl w-10 h-10 transition-all duration-300 hover:scale-105"
                  title={user.email || t("header.account")}
                >
                  <UserCircle className="w-4 h-4" />
                </Button>
                <div className="absolute right-0 top-full mt-2 w-56 glass-card dark:bg-[#1a2235]/95 bg-white/95 backdrop-blur-xl border dark:border-white/10 border-[#323D50]/10 rounded-xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                  <p className="dark:text-white/60 text-[#6B7B8D] text-xs truncate mb-2 px-2">{user.email}</p>
                  <Button
                    onClick={() => {
                      signOut();
                      toast.success(t("header.signedOutSuccess"));
                    }}
                    variant="ghost"
                    className="w-full justify-start gap-2  dark:hover:bg-white/10 hover:bg-[#5B8DD9]/10 rounded-lg text-sm"
                  >
                    <LogOut className="w-4 h-4" />
                    {t("header.signOut")}
                  </Button>
                </div>
              </div>
            ) : (
              <Link to="/login">
                <Button
                  variant="ghost"
                  size="icon"
                  className="glass dark:bg-white/5 bg-[#5B8DD9]/10 dark:hover:bg-white/10 hover:bg-[#5B8DD9]/20  border dark:border-white/10 border-[#323D50]/10 rounded-xl w-10 h-10 transition-all duration-300 hover:scale-105"
                  title={t("header.signIn")}
                >
                  <LogIn className="w-4 h-4" />
                </Button>
              </Link>
            )}

            {/* Wishlist Button */}
            <Link to="/wishlist">
              <Button
                variant="ghost"
                size="icon"
                className="glass dark:bg-white/5 bg-[#5B8DD9]/10 dark:hover:bg-white/10 hover:bg-[#5B8DD9]/20  border dark:border-white/10 border-[#323D50]/10 rounded-xl w-10 h-10 transition-all duration-300 hover:scale-105 relative"
              >
                <Heart className="w-4 h-4" />
                {wishlistItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold shadow-lg shadow-red-500/50 border border-white/50 leading-none">
                    {wishlistItems.length}
                  </span>
                )}
              </Button>
            </Link>

            {/* Cart Button */}
            <Button
              onClick={onCartClick}
              className="glass bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white border-0 rounded-xl px-4 py-2 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#5B8DD9]/25 relative group"
            >
              <ShoppingBag className="w-4 h-4 me-2" />
              <span className="font-medium flex items-center gap-2">
                {t("header.cart")}
                {getItemCount() > 0 && (
                  <span className="relative flex items-center justify-center">
                    <span className="absolute -top-3 -right-4 min-w-[22px] h-6 px-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg shadow-red-500/50 animate-pulse border-2 border-white leading-none z-10">
                      {getItemCount() > 99 ? "99+" : getItemCount()}
                    </span>
                  </span>
                )}
              </span>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button
                variant="ghost"
                size="icon"
                className="glass dark:bg-white/5 bg-[#5B8DD9]/10 dark:hover:bg-white/10 hover:bg-[#5B8DD9]/20 dark:text-[#F5F5F5] text-[#323D50] border dark:border-white/10 border-[#323D50]/10 rounded-xl w-10 h-10 tec transition-all duration-300"
              >
                <Menu className="h-5 w-5 me-8" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side={isRTL ? "left" : "right"}
              className="glass-card bg-[#F8F9FB]/98 dark:bg-[#1a2235]/95 backdrop-blur-2xl border-l border-[#5B8DD9]/20 w-80"
            >
              {/* Mobile Menu Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <div className="w-8 h-8 glass rounded-lg overflow-hidden border border-[#323D50]/10 dark:border-white/10">
                    <img
                      src="https://scontent.ftip3-2.fna.fbcdn.net/v/t39.30808-6/490716688_682267014176902_5111076605936005794_n.jpg?_nc_cat=111&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeHNnkfa-6nrK5_-XvSX-y74BFSYKJ8kY0MEVJgonyRjQwfpzGcYHVQRwHbG9KVjKfKzAThbJaEX_-Kz19Qqpqma&_nc_ohc=hJ_ziW87-zIQ7kNvwHT95MU&_nc_oc=AdkNK6t6BP7TYCxXonBcpkm3d6F0fElZyHJiOvWkPb2csE8IvHkzMKD7XhRFbNjLdfg&_nc_zt=23&_nc_ht=scontent.ftip3-2.fna&_nc_gid=P6wZI-xXSK258VaLo15OEA&oh=00_AfRliJRtnfiqv_kdgcud0rPdE9HL-l0KoDiiHEQ-BlcSBQ&oe=687F081E"
                      alt="Shama Logo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-xl font-bold gradient-text">Shama</span>
                </div>
              </div>

              {/* Mobile Navigation */}
              <nav className="space-y-4 mb-8">
                {navigation.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className="glass dark:bg-white/5 bg-[#5B8DD9]/5 dark:hover:bg-white/10 hover:bg-[#5B8DD9]/10 border dark:border-white/10 border-[#323D50]/10 rounded-xl px-4 py-3 flex items-center space-x-3 rtl:space-x-reverse transition-all duration-300 hover:scale-105 "
                  >
                    {item.isAiFinder ? (
                      <Sparkles className="w-5 h-5 text-[#5B8DD9]" />
                    ) : (
                      <span className="text-lg">{item.icon}</span>
                    )}
                    <span className="font-medium">{item.name}</span>
                  </Link>
                ))}
              </nav>

              {/* Mobile Theme Toggle */}
              <Button
                onClick={toggleTheme}
                variant="ghost"
                className="w-full glass dark:bg-white/5 bg-[#5B8DD9]/10 dark:hover:bg-white/10 hover:bg-[#5B8DD9]/20  border dark:border-white/10 border-[#323D50]/10 rounded-xl px-3 h-10 text-sm font-semibold transition-all duration-300 hover:scale-105 mb-2"
              >
                {theme === "dark" ? <Sun className="w-4 h-4 me-1.5" /> : <Moon className="w-4 h-4 me-1.5" />}
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </Button>

              {/* Mobile Language Toggle */}
              <Button
                onClick={() => setLanguage(language === "en" ? "ar" : "en")}
                variant="ghost"
                className="w-full glass dark:bg-white/5 bg-[#5B8DD9]/10 dark:hover:bg-white/10 hover:bg-[#5B8DD9]/20  border dark:border-white/10 border-[#323D50]/10 rounded-xl px-3 h-10 text-sm font-semibold transition-all duration-300 hover:scale-105 mb-4"
              >
                <Globe className="w-4 h-4 me-1.5" />
                {language === "en" ? "AR" : "EN"}
              </Button>

              {/* Mobile Auth Button */}
              {user ? (
                <div className="space-y-2 mb-4">
                  <p className="dark:text-white/60 text-[#6B7B8D] text-xs truncate px-3">{user.email}</p>
                  <Button
                    onClick={() => {
                      signOut();
                      setIsMenuOpen(false);
                      toast.success(t("header.signedOutSuccess"));
                    }}
                    variant="ghost"
                    className="w-full glass dark:bg-white/5 bg-[#5B8DD9]/10 dark:hover:bg-white/10 hover:bg-[#5B8DD9]/20  border dark:border-white/10 border-[#323D50]/10 rounded-xl px-3 h-10 text-sm font-semibold transition-all duration-300 hover:scale-105"
                  >
                    <LogOut className="w-4 h-4 me-1.5" />
                    {t("header.signOut")}
                  </Button>
                </div>
              ) : (
                <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                  <Button
                    variant="ghost"
                    className="w-full glass dark:bg-white/5 bg-[#5B8DD9]/10 dark:hover:bg-white/10 hover:bg-[#5B8DD9]/20  border dark:border-white/10 border-[#323D50]/10 rounded-xl px-3 h-10 text-sm font-semibold transition-all duration-300 hover:scale-105 mb-4"
                  >
                    <LogIn className="w-4 h-4 me-1.5" />
                    {t("header.signIn")}
                  </Button>
                </Link>
              )}

              {/* Mobile Cart Button */}
              <Button
                onClick={() => {
                  onCartClick();
                  setIsMenuOpen(false);
                }}
                className="w-full glass bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white border-0 rounded-xl py-4 font-semibold relative"
              >
                <ShoppingBag className="w-5 h-5 me-2" />
                {t("header.cart")}
                {getItemCount() > 0 && (
                  <span className="ms-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-sm rounded-full h-7 w-7 flex items-center justify-center font-bold shadow-lg shadow-red-500/50 border-2 border-white">
                    {getItemCount() > 99 ? "99+" : getItemCount()}
                  </span>
                )}
              </Button>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Whisper Mode indicator pill */}
      {isWhisperMode && (
        <div className={`fixed bottom-6 ${isRTL ? "right-4" : "left-4"} z-50 flex items-center gap-2 bg-[#1a2235]/90 backdrop-blur-sm border border-[#5B8DD9]/40 text-[#5B8DD9] text-xs font-medium px-3 py-1.5 rounded-full pointer-events-none`}>
          <EyeOff className="w-3 h-3" />
          {t("header.whisperMode")}
        </div>
      )}
    </header>
  );
}
