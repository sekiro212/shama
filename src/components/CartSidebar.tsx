import {
  Plus,
  Minus,
  ShoppingBag,
  CreditCard,
  MapPin,
  Phone,
  Mail,
  User,
  AlertCircle,
  Trash2,
  Eye,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const libyaCities = [
  "طرابلس",
  "ضواحي طرابلس",
  "السواني",
  "الزهراء",
  "الساعدية",
  "العزيزية",
  "خلة الفرجان",
  "سوق الأحد",
  "قصر بن غشير",
  "السبيعة",
  "سوق الخميس",
  "القرة بولي",
  "قماطة أو قصر خيار",
  "الخمس",
  "زليتن",
  "مصراتة",
  "الزاوية",
  "صرمان",
  "صبراته",
  "زوارة",
  "توصيل نسائي ضواحي طرابلس",
  "ترهونة",
  "بني وليد",
  "مسلاتة",
  "ورشفانة",
  "العجيلات",
  "الجميل",
  "رقدالين",
  "زلطن",
  "رأس جدير",
  "بنغازي",
  "المرج",
  "طبرق",
  "درنة",
  "الأيبار",
  "البيضاء",
  "شحات",
  "القبة",
  "جالو",
  "أوجلة",
  "الواحات",
  "الكفرة",
  "سبها",
  "براك الشاطئ",
  "أوباري",
  "تراغن",
  "مرزق",
  "العوينات",
  "غات",
  "سرت",
  "هرواة",
  "بن جواد",
  "النوفلية",
  "رأس لانوف",
  "العقيلة",
  "اجدابيا",
  "هون",
  "الجفرة",
  "سوكنة",
  "غريان",
  "الأصابعة",
  "الرابطة",
  "المشاشية",
  "الزنتان",
  "الريانية",
  "يفرن",
  "القلعة",
  "الرجبان",
  "الرحيبات",
  "الرقيعات",
  "جادو",
  "كاباو",
  "درج",
  "نالوت",
];

export default function CartSidebar({ isOpen, onClose }: CartSidebarProps) {
  const {
    items,
    removeFromCart,
    updateQuantity,
    getTotalPrice,
    clearCart,
    canAddToCart,
    getItemCount,
  } = useCart();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    city: "",
    placeName: "", // Add placeName to formData
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleQuantityChange = (
    itemId: string,
    size: string,
    newQuantity: number,
    stockQuantity?: number
  ) => {
    // Check if the new quantity exceeds stock
    if (stockQuantity && newQuantity > stockQuantity) {
      toast.error(`Only ${stockQuantity} items available in stock`);
      return;
    }

    updateQuantity(itemId, size, newQuantity);
  };

  const isStockAvailable = () => {
    return items.every(
      (item) => !item.stock_quantity || item.quantity <= item.stock_quantity
    );
  };

  const getStockErrorItems = () => {
    return items.filter(
      (item) => item.stock_quantity && item.quantity > item.stock_quantity
    );
  };

  const handleCheckout = async () => {
    // Validate form
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.email ||
      !formData.phone ||
      !formData.city ||
      !formData.placeName // Require placeName
    ) {
      toast.error("Please fill in all fields");
      return;
    }

    // Validate stock availability before checkout
    const stockErrors = [];
    for (const item of items) {
      if (
        item.stock_quantity !== undefined &&
        item.quantity > item.stock_quantity
      ) {
        stockErrors.push(
          `${item.name} (${item.size}) - Only ${item.stock_quantity} available, but ${item.quantity} requested`
        );
      }
    }

    if (stockErrors.length > 0) {
      toast.error("Stock insufficient for some items:");
      stockErrors.forEach((error) => toast.error(error));
      return;
    }

    // Additional validation for sold out items
    const soldOutItems = items.filter((item) => item.stock_quantity === 0);
    if (soldOutItems.length > 0) {
      toast.error("Some items are sold out and cannot be ordered:");
      soldOutItems.forEach((item) =>
        toast.error(`${item.name} (${item.size}) - Sold Out`)
      );
      return;
    }

    try {
      setCheckoutLoading(true);

      // Create order data for Supabase
      const orderData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        city: formData.city,
        place_name: formData.placeName, // Add place_name
        total: getTotalPrice(),
        order_date: new Date().toISOString(),
        items: items,
      };

      // Insert order into Supabase
      const { error } = await supabase
        .from("orders")
        .insert([orderData])
        .select();

      if (error) {
        console.error("Error inserting order:", error);
        toast.error("Failed to place order. Please try again.");
        return;
      }

      // Success
      toast.success("Order placed successfully!");

      // Clear cart and close dialogs
      clearCart();
      setIsCheckoutOpen(false);
      onClose();

      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        city: "",
        placeName: "",
      });
    } catch (error) {
      console.error("Error placing order:", error);
      toast.error("Failed to place order. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="bg-[#0e0a1d] border-white/10 w-full sm:w-[480px] lg:w-[540px] px-4 sm:px-6"
      >
        <SheetHeader className="pb-4 sm:pb-6 relative">
          <div className="flex items-center justify-between pr-2">
            <div className="flex items-center space-x-3">
              <SheetTitle className="text-white text-xl sm:text-2xl font-bold gradient-text">
                Shopping Cart
              </SheetTitle>
              {items.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-white/70 text-sm font-medium">
                    {getItemCount()} {getItemCount() === 1 ? "item" : "items"}
                  </span>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-[#b24ce2] to-[#8e2de2] rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-xs sm:text-sm font-bold">
                      {getItemCount()}
                    </span>
                  </div>
                </div>
              )}
            </div>
            {/* Close button */}
          </div>
        </SheetHeader>

        <div className="flex flex-col h-full">
          {items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center flex-col text-center px-4 sm:px-8">
              <div className="glass-card bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-12 max-w-sm w-full">
                <div className="relative mb-6">
                  <ShoppingBag className="h-12 w-12 sm:h-16 sm:w-16 text-white/40 mx-auto" />
                  <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-6 h-6 sm:w-8 sm:h-8 bg-[#b24ce2] rounded-full flex items-center justify-center">
                    <span className="text-white text-xs sm:text-sm font-bold">
                      0
                    </span>
                  </div>
                </div>
                <h3 className="text-white font-semibold text-lg sm:text-xl mb-2">
                  Your cart is empty
                </h3>
                <p className="text-white/60 text-sm mb-6">
                  Discover our luxurious fragrances and add them to your cart
                </p>
                <Button
                  onClick={onClose}
                  className="w-full glass bg-gradient-to-r from-[#b24ce2] to-[#8e2de2] hover:from-[#8e2de2] hover:to-[#b24ce2] text-white border-0 rounded-xl px-6 py-3 font-semibold transition-all duration-300 hover:scale-105"
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Start Shopping
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Cart Items - Scrollable */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4 pb-24 scrollbar-hide">
                {items.map((item) => (
                  <div
                    key={`${item.id}-${item.size}`}
                    className="glass-card bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4 hover:bg-white/10 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:shadow-[#b24ce2]/20 focus-within:ring-2 focus-within:ring-[#b24ce2]/50 focus-within:border-[#b24ce2]/50"
                  >
                    <div className="flex items-start space-x-3 sm:space-x-4">
                      {/* Product Image */}
                      <div className="relative flex-shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl border border-white/10"
                        />
                        {item.stock_quantity && item.stock_quantity < 10 && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-orange-500 rounded-full flex items-center justify-center">
                            <AlertCircle className="h-1.5 w-1.5 sm:h-2 sm:w-2 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="text-white font-semibold text-base sm:text-lg leading-tight mb-1">
                              {item.name}
                            </h4>
                            <p className="text-white/60 text-sm mb-2">
                              {item.size}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-[#e879f9] font-bold text-lg sm:text-xl drop-shadow-sm">
                                {item.price} LYD
                              </p>
                              {item.stock_quantity &&
                                item.stock_quantity < 10 && (
                                  <span className="text-orange-300 text-xs bg-orange-500/30 px-2 py-1 rounded-full border border-orange-500/50">
                                    Low stock
                                  </span>
                                )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center space-x-1.5 sm:space-x-2">
                            <Button
                              asChild
                              variant="default"
                              size="sm"
                              className="bg-[#b24ce2] hover:bg-[#9a3bc7] text-white border-0 rounded-xl px-2 sm:px-3 py-2 h-8 sm:h-10 transition-all duration-200 hover:scale-105"
                              title="View Product"
                            >
                              <Link
                                to={`/product/${
                                  item.id
                                }?size=${encodeURIComponent(item.size)}`}
                              >
                                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-red-500 hover:bg-red-600 text-white border-0 rounded-xl px-2 sm:px-3 py-2 h-8 sm:h-10 transition-all duration-200 hover:scale-105"
                              onClick={() => removeFromCart(item.id, item.size)}
                              title="Remove from cart"
                            >
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                          <div className="flex items-center space-x-1.5 bg-white/5 rounded-xl p-1">
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-white/10 hover:bg-white/20 text-white border-0 rounded-lg h-7 w-7 sm:h-8 sm:w-8 p-0 transition-all duration-200 hover:scale-105"
                              onClick={() =>
                                handleQuantityChange(
                                  item.id,
                                  item.size,
                                  item.quantity - 1,
                                  item.stock_quantity
                                )
                              }
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-white font-bold text-sm sm:text-base w-8 sm:w-10 text-center bg-white/10 rounded-lg py-1">
                              {item.quantity}
                            </span>
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-white/10 hover:bg-white/20 text-white border-0 rounded-lg h-7 w-7 sm:h-8 sm:w-8 p-0 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() =>
                                handleQuantityChange(
                                  item.id,
                                  item.size,
                                  item.quantity + 1,
                                  item.stock_quantity
                                )
                              }
                              disabled={!canAddToCart(item)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>

                          {/* Item Total */}
                          <div className="text-right">
                            <p className="text-white/70 text-sm font-medium">
                              Total
                            </p>
                            <p className="text-[#e879f9] font-bold text-lg drop-shadow-sm">
                              {(item.price * item.quantity).toFixed(2)} LYD
                            </p>
                          </div>
                        </div>

                        {/* Stock Warning */}
                        {item.stock_quantity &&
                          item.quantity > item.stock_quantity && (
                            <div className="mt-3 bg-red-500/20 border border-red-500/30 rounded-xl p-3">
                              <div className="flex items-center justify-between">
                                <p className="text-red-300 text-xs sm:text-sm font-medium">
                                  ⚠️ Only {item.stock_quantity} available in
                                  stock
                                </p>
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="bg-red-500/80 hover:bg-red-500 text-white border-0 rounded-lg px-3 py-1 text-xs font-medium transition-all duration-200 hover:scale-105"
                                  onClick={() =>
                                    handleQuantityChange(
                                      item.id,
                                      item.size,
                                      item.stock_quantity || 0,
                                      item.stock_quantity
                                    )
                                  }
                                >
                                  Fix
                                </Button>
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sticky Checkout Section */}
              <div className="sticky bottom-0 bg-[#0e0a1d] border-t border-white/10 pt-4 pb-4 px-4 sm:px-6 -mx-4 sm:-mx-6 z-10">
                {/* Order Summary */}
                <div className="glass-card bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 mb-4">
                  <h3 className="text-white font-semibold text-lg mb-4">
                    Order Summary
                  </h3>

                  <div className="space-y-3">
                    <div className="flex justify-between text-white/80 font-medium">
                      <span>Items ({getItemCount()})</span>
                      <span>{getTotalPrice().toFixed(2)} LYD</span>
                    </div>

                    <div className="border-t border-white/10 pt-3 pb-3 ">
                      <div className="flex justify-between text-lg sm:text-xl font-bold">
                        <span className="text-white">Total:</span>
                        <span className="text-[#e879f9] drop-shadow-sm">
                          {getTotalPrice().toFixed(2)} LYD
                        </span>
                      </div>
                    </div>
                  </div>

                  <Dialog
                    open={isCheckoutOpen}
                    onOpenChange={setIsCheckoutOpen}
                  >
                    <DialogTrigger asChild>
                      <div className="space-y-3">
                        {!isStockAvailable() && (
                          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3">
                            <p className="text-red-300 text-sm font-medium mb-2">
                              ⚠️ Some items exceed available stock:
                            </p>
                            <ul className="text-red-300 text-xs space-y-1">
                              {getStockErrorItems().map((item, index) => (
                                <li key={index}>
                                  • {item.name} ({item.size}): {item.quantity}{" "}
                                  requested, {item.stock_quantity} available
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <Button
                          disabled={!isStockAvailable()}
                          className="w-full flex items-center justify-center gap-2 glass bg-gradient-to-r from-[#b24ce2] to-[#8e2de2] hover:from-[#8e2de2] hover:to-[#b24ce2] text-white border-0 rounded-2xl py-4 font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#b24ce2]/25 focus:ring-2 focus:ring-[#b24ce2]/50 focus:ring-offset-2 focus:ring-offset-[#0e0a1d] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                          <CreditCard className="w-5 h-5" />
                          <span>
                            {isStockAvailable()
                              ? "Proceed to Checkout"
                              : "Stock Insufficient"}
                          </span>
                        </Button>
                      </div>
                    </DialogTrigger>
                    <DialogContent className="glass-card bg-[#0e0a1d] border-white/10 text-white max-w-md mx-4 sm:mx-auto">
                      <DialogHeader>
                        <DialogTitle className="text-white gradient-text text-xl sm:text-2xl">
                          Complete Your Order
                        </DialogTitle>
                      </DialogHeader>

                      <div className="space-y-4 sm:space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label
                              htmlFor="firstName"
                              className="text-white/90 font-medium"
                            >
                              <User className="w-4 h-4 inline mr-2" />
                              First Name
                            </Label>
                            <Input
                              id="firstName"
                              value={formData.firstName}
                              onChange={(e) =>
                                handleInputChange("firstName", e.target.value)
                              }
                              className="glass bg-white/10 border-white/30 text-white placeholder:text-white/60 focus:border-[#b24ce2] focus:ring-[#b24ce2] rounded-xl h-11"
                              placeholder="Enter first name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label
                              htmlFor="lastName"
                              className="text-white/90 font-medium"
                            >
                              Last Name
                            </Label>
                            <Input
                              id="lastName"
                              value={formData.lastName}
                              onChange={(e) =>
                                handleInputChange("lastName", e.target.value)
                              }
                              className="glass bg-white/10 border-white/30 text-white placeholder:text-white/60 focus:border-[#b24ce2] focus:ring-[#b24ce2] rounded-xl h-11"
                              placeholder="Enter last name"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="email"
                            className="text-white/90 font-medium"
                          >
                            <Mail className="w-4 h-4 inline mr-2" />
                            Email
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) =>
                              handleInputChange("email", e.target.value)
                            }
                            className="glass bg-white/10 border-white/30 text-white placeholder:text-white/60 focus:border-[#b24ce2] focus:ring-[#b24ce2] rounded-xl h-11"
                            placeholder="Enter email address"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="phone"
                            className="text-white/90 font-medium"
                          >
                            <Phone className="w-4 h-4 inline mr-2" />
                            Phone Number
                          </Label>
                          <Input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) =>
                              handleInputChange("phone", e.target.value)
                            }
                            className="glass bg-white/10 border-white/30 text-white placeholder:text-white/60 focus:border-[#b24ce2] focus:ring-[#b24ce2] rounded-xl h-11"
                            placeholder="Enter phone number"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="city"
                            className="text-white/90 font-medium"
                          >
                            <MapPin className="w-4 h-4 inline mr-2" />
                            City
                          </Label>
                          <Select
                            value={formData.city}
                            onValueChange={(value) =>
                              handleInputChange("city", value)
                            }
                          >
                            <SelectTrigger className="glass bg-white/10 border-white/30 text-white focus:border-[#b24ce2] focus:ring-[#b24ce2] rounded-xl h-11">
                              <SelectValue placeholder="Select your city" />
                            </SelectTrigger>
                            <SelectContent className="glass bg-[#0e0a1d] border-white/30 max-h-40 rounded-xl">
                              {libyaCities.map((city) => (
                                <SelectItem
                                  key={city}
                                  value={city}
                                  className="text-white hover:bg-white/10 focus:bg-white/10"
                                >
                                  {city}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {/* Place Name input, shown only if city is selected */}
                        {formData.city && (
                          <div className="space-y-2">
                            <Label
                              htmlFor="placeName"
                              className="text-white/90 font-medium"
                            >
                              Place Name (within city)
                            </Label>
                            <Input
                              id="placeName"
                              value={formData.placeName}
                              onChange={(e) =>
                                handleInputChange("placeName", e.target.value)
                              }
                              className="glass bg-white/10 border-white/30 text-white placeholder:text-white/60 focus:border-[#b24ce2] focus:ring-[#b24ce2] rounded-xl h-11"
                              placeholder="Enter place name (e.g. street, area, landmark)"
                            />
                          </div>
                        )}

                        <div className="border-t border-white/10 pt-4 sm:pt-6">
                          <div className="flex justify-between text-lg sm:text-xl font-bold mb-4 sm:mb-6">
                            <span className="text-white">Total:</span>
                            <span className="text-[#e879f9] drop-shadow-sm">
                              {getTotalPrice().toFixed(2)} LYD
                            </span>
                          </div>
                          <LoadingButton
                            onClick={handleCheckout}
                            loading={checkoutLoading}
                            loadingText="Placing Order..."
                            className="w-full bg-gradient-to-r from-[#b24ce2] to-[#8e2de2] hover:from-[#8e2de2] hover:to-[#b24ce2] text-white border-0 rounded-xl py-3 sm:py-4 font-semibold text-base sm:text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#b24ce2]/25"
                          >
                            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                            Place Order
                          </LoadingButton>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
