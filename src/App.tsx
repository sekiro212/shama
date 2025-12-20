import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HomePage from "@/pages/HomePage";
import ProductPage from "@/pages/ProductPage";
import CollectionPage from "@/pages/CollectionPage";
import GiftSetsPage from "@/pages/GiftSetsPage";
import AdminPage from "@/pages/AdminPage";
import CartSidebar from "@/components/CartSidebar";
import { CartProvider } from "@/contexts/CartContext";
import "./App.css";

function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <CartProvider>
      <Router>
        <div className="min-h-screen bg-[#0e0a1d] text-white w-full overflow-x-hidden">
          <Header onCartClick={() => setIsCartOpen(true)} />
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/product/:id" element={<ProductPage />} />
              <Route path="/collection" element={<CollectionPage />} />
              <Route path="/gift-sets" element={<GiftSetsPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
          </main>
          <Footer />
          <CartSidebar
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
          />
          <Toaster />
        </div>
      </Router>
    </CartProvider>
  );
}

export default App;
