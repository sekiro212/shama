import { useState, useRef, useEffect } from "react";
import { X, Send, Trash2, Sparkles, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatbot } from "@/hooks/useChatbot";
import ReactMarkdown from "react-markdown";
import { useLanguage } from "@/contexts/LanguageContext";

interface ChatbotPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatbotPanel({ isOpen, onClose }: ChatbotPanelProps) {
  const { t, isRTL } = useLanguage();
  const { messages, isLoading, sendMessage, clearChat } = useChatbot();

  const quickActions = [
    t("chatbot.quickActions.summer"),
    t("chatbot.quickActions.giftIdeas"),
    t("chatbot.quickActions.under100"),
    t("chatbot.quickActions.forMen"),
    t("chatbot.quickActions.forWomen"),
    t("chatbot.quickActions.woodyScents"),
  ];
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (action: string) => {
    if (isLoading) return;
    sendMessage(action);
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 sm:inset-auto sm:bottom-24 ${isRTL ? "sm:left-6" : "sm:right-6"} z-50 sm:w-[400px] sm:h-[min(600px,calc(100vh-8rem))] flex flex-col animate-slide-up`}>
      <div className="glass-card bg-[#F8F9FB]/95 dark:bg-[#1a2235]/95 backdrop-blur-2xl border border-[#5B8DD9]/30 sm:rounded-2xl overflow-hidden flex flex-col h-full shadow-2xl shadow-[#5B8DD9]/20">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#323D50]/10 dark:border-white/10 bg-gradient-to-r from-[#5B8DD9]/10 to-[#3E6BB5]/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-[#323D50] dark:text-white font-semibold text-sm">{t("chatbot.name")}</h3>
              <p className="text-[#6B7B8D] dark:text-white/50 text-xs">{t("chatbot.role")}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={clearChat}
              className="text-[#6B7B8D] dark:text-white/50 hover:text-[#323D50] dark:hover:text-white hover:bg-[#323D50]/10 dark:hover:bg-white/10 rounded-lg w-8 h-8"
              title={t("chatbot.clearChat")}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-[#6B7B8D] dark:text-white/50 hover:text-[#323D50] dark:hover:text-white hover:bg-[#323D50]/10 dark:hover:bg-white/10 rounded-lg w-8 h-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white rounded-br-md"
                    : "glass bg-white dark:bg-white/5 border border-[#323D50]/10 dark:border-white/10 text-[#323D50] dark:text-white/90 rounded-bl-md"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm prose-invert max-w-none [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:mb-2 [&_li]:mb-1">
                    <ReactMarkdown>{msg.content || "\u200B"}</ReactMarkdown>
                  </div>
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-lg bg-[#323D50]/10 dark:bg-white/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-4 h-4 text-[#6B7B8D] dark:text-white/70" />
                </div>
              )}
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.content === "" && (
            <div className="flex gap-2 justify-start">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="glass bg-white dark:bg-white/5 border border-[#323D50]/10 dark:border-white/10 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-[#5B8DD9] rounded-full animate-bounce" />
                  <span
                    className="w-2 h-2 bg-[#5B8DD9] rounded-full animate-bounce"
                    style={{ animationDelay: "0.15s" }}
                  />
                  <span
                    className="w-2 h-2 bg-[#5B8DD9] rounded-full animate-bounce"
                    style={{ animationDelay: "0.3s" }}
                  />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {messages.length <= 2 && (
          <div className="px-4 pb-2">
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <button
                  key={action}
                  onClick={() => handleQuickAction(action)}
                  className="text-xs px-3 py-1.5 rounded-full glass bg-white dark:bg-white/5 border border-[#323D50]/10 dark:border-white/10 text-[#6B7B8D] dark:text-white/70 hover:text-[#323D50] dark:hover:text-white hover:bg-[#5B8DD9]/20 hover:border-[#5B8DD9]/30 transition-all duration-200"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-3 border-t border-[#323D50]/10 dark:border-white/10">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("chatbot.placeholder")}
              className="flex-1 bg-white dark:bg-white/5 border border-[#323D50]/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#323D50] dark:text-white placeholder:text-[#6B7B8D] dark:placeholder:text-white/40 focus:outline-none focus:border-[#5B8DD9]/50 focus:ring-1 focus:ring-[#5B8DD9]/30 transition-all"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white rounded-xl w-10 h-10 p-0 disabled:opacity-50 transition-all duration-200"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
