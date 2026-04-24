import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import ChatbotPanel from "@/components/ChatbotPanel";
import { useLanguage } from "@/contexts/LanguageContext";

interface ChatbotButtonProps {
  isOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

export function ChatbotButton({ isOpen: controlledOpen, onOpen, onClose }: ChatbotButtonProps) {
  const { t, isRTL } = useLanguage();
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const handleToggle = () => {
    if (isOpen) {
      onClose ? onClose() : setInternalOpen(false);
    } else {
      onOpen ? onOpen() : setInternalOpen(true);
    }
  };

  const handleClose = () => {
    onClose ? onClose() : setInternalOpen(false);
  };

  return (
    <>
      <ChatbotPanel isOpen={isOpen} onClose={handleClose} />
      <button
        onClick={handleToggle}
        aria-label={isOpen ? t("chatbot.close") : t("chatbot.open")}
        className={`fixed bottom-safe-20 sm:bottom-6 ${isRTL ? "left-4 sm:left-6" : "right-4 sm:right-6"} z-50 w-14 h-14 rounded-full ${isOpen ? "hidden sm:flex" : "flex"} items-center justify-center transition-colors duration-300 shadow-xl ${
          isOpen
            ? "bg-white/15 border border-white/20 hover:bg-white/25"
            : "bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:shadow-[#5B8DD9]/40 chat-button-glow"
        }`}
      >
        {isOpen ? (
          <X className="w-5 h-5 text-white" />
        ) : (
          <MessageCircle className="w-5 h-5 text-white" />
        )}
      </button>
    </>
  );
}
