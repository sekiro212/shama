import { useState, useEffect, lazy, Suspense } from "react";
import { MessageCircle, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

// perf: ChatbotPanel pulls in react-markdown (+remark/micromark, ~100KB) and the
// AI service. Lazy-load it so that weight is fetched only once the user actually
// opens the chat, instead of shipping on the initial paint of every route.
const ChatbotPanel = lazy(() => import("@/components/ChatbotPanel"));

interface ChatbotButtonProps {
  isOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

export function ChatbotButton({ isOpen: controlledOpen, onOpen, onClose }: ChatbotButtonProps) {
  const { t, isRTL } = useLanguage();
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  // Mount the panel lazily on first open, then keep it mounted so its
  // close/exit animation still runs on subsequent toggles.
  const [hasOpened, setHasOpened] = useState(false);
  useEffect(() => {
    if (isOpen) setHasOpened(true);
  }, [isOpen]);

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
      {hasOpened && (
        <Suspense fallback={null}>
          <ChatbotPanel isOpen={isOpen} onClose={handleClose} />
        </Suspense>
      )}
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
