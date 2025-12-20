import { Link } from "react-router-dom";
import { ShoppingBag, Menu } from "lucide-react";
import { useState, useEffect } from "react";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface HeaderProps {
  onCartClick: () => void;
}

export default function Header({ onCartClick }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { getItemCount } = useCart();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navigation = [
    { name: "Home", href: "/", icon: "🏠" },
    { name: "Collection", href: "/collection", icon: "💎" },
    { name: "Gift Sets", href: "/gift-sets", icon: "🎁" },
  ];

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        scrolled
          ? "glass-card backdrop-blur-2xl bg-[#0e0a1d]/90 border-b border-[#b24ce2]/20 shadow-2xl shadow-[#b24ce2]/10"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            className="group flex items-center space-x-3 transition-all duration-300 hover:scale-105"
          >
            <div className="relative">
              <div className="w-10 h-10 glass rounded-xl overflow-hidden border border-white/10 group-hover:scale-110 transition-transform duration-300">
                <img
                  src="https://p16-sign-va.tiktokcdn.com/tos-maliva-avt-0068/e159f380a3a42644f03ca7442d2864b0~tplv-tiktokx-cropcenter:1080:1080.jpeg?dr=14579&refresh_token=8be9595c&x-expires=1753538400&x-signature=%2BNcK7CjJZDsNOmd9K1lUKJvPE8M%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=maliva"
                  alt="Shama Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute inset-0 w-10 h-10 bg-gradient-to-br from-[#b24ce2] to-[#8e2de2] rounded-xl blur opacity-50 group-hover:opacity-75 transition-opacity duration-300" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold gradient-text tracking-tight">
                Shama
              </span>
              <span className="text-xs text-white/60 font-medium tracking-widest">
                LUXURY SCENTS
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="group relative px-4 py-2 rounded-xl transition-all duration-300 hover:bg-white/5"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-white/80 group-hover:text-white font-medium transition-colors duration-300">
                    {item.name}
                  </span>
                </div>
                <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-[#b24ce2] to-[#8e2de2] scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center space-x-4">
            {/* Cart Button */}
            <Button
              onClick={onCartClick}
              className="glass bg-gradient-to-r from-[#b24ce2] to-[#8e2de2] hover:from-[#8e2de2] hover:to-[#b24ce2] text-white border-0 rounded-xl px-4 py-2 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#b24ce2]/25 relative group"
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              <span className="font-medium flex items-center gap-2">
                Cart
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
                className="glass bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl w-10 h-10 tec transition-all duration-300"
              >
                <Menu className="h-5 w-5 text-white  mr-8" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="glass-card bg-[#0e0a1d]/95 backdrop-blur-2xl border-l border-[#b24ce2]/20 w-80"
            >
              {/* Mobile Menu Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 glass rounded-lg overflow-hidden border border-white/10">
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
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className="glass bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-4 py-3 flex items-center space-x-3 transition-all duration-300 hover:scale-105 text-white/80 hover:text-white"
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="font-medium">{item.name}</span>
                  </Link>
                ))}
              </nav>

              {/* Mobile Cart Button */}
              <Button
                onClick={() => {
                  onCartClick();
                  setIsMenuOpen(false);
                }}
                className="w-full glass bg-gradient-to-r from-[#b24ce2] to-[#8e2de2] hover:from-[#8e2de2] hover:to-[#b24ce2] text-white border-0 rounded-xl py-4 font-semibold relative"
              >
                <ShoppingBag className="w-5 h-5 mr-2" />
                Cart
                {getItemCount() > 0 && (
                  <span className="ml-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-sm rounded-full h-7 w-7 flex items-center justify-center font-bold shadow-lg shadow-red-500/50 border-2 border-white">
                    {getItemCount() > 99 ? "99+" : getItemCount()}
                  </span>
                )}
              </Button>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
