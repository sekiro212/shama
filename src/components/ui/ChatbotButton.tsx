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
  const { isRTL } = useLanguage();
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
        className={`fixed bottom-6 ${isRTL ? "left-4 sm:left-6" : "right-4 sm:right-6"} z-50 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-xl ${
          isOpen
            ? "bg-white/10 border border-[#323D50]/15 dark:border-white/20 backdrop-blur-xl hover:bg-white/20"
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
