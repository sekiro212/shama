/**
 * ===============================================================
 * ChatbotPanel.tsx — لوحة المساعد الذكي (روبوت الدردشة)
 * ---------------------------------------------------------------
 * نافذة دردشة عائمة تتيح للمستخدم سؤال مساعد الذكاء الاصطناعي عن
 * العطور والحصول على توصيات. تعرض الرسائل المتبادلة (المستخدم/
 * المساعد)، أزرار اقتراحات سريعة، ومؤشّر كتابة أثناء توليد الردّ.
 * يعتمد على الخطّاف useChatbot الذي يدير البثّ المتدفّق (streaming)
 * للردود من نموذج OpenRouter.
 *
 * مكان الاستخدام: يُستدعى من زر عائم في الواجهة عبر الخاصية isOpen.
 * يعرض ردود المساعد بصيغة Markdown، ويدعم الاتجاهين العربي والإنجليزي.
 * ===============================================================
 */
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

/**
 * المكوّن الرئيسي للوحة الدردشة.
 * @param isOpen هل اللوحة مفتوحة؟ (تُخفى تمامًا من الـ DOM عند الإغلاق).
 * @param onClose دالة إغلاق اللوحة.
 */
export default function ChatbotPanel({ isOpen, onClose }: ChatbotPanelProps) {
  const { t, isRTL } = useLanguage();
  // الخطّاف يدير قائمة الرسائل وحالة التحميل وإرسال الرسائل ومسح المحادثة (مع البثّ المتدفّق للردّ)
  const { messages, isLoading, sendMessage, clearChat } = useChatbot();

  // اقتراحات سريعة جاهزة يضغطها المستخدم لإرسال سؤال شائع بنقرة واحدة
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

  // التمرير التلقائي لأسفل المحادثة كلما وصلت رسالة جديدة أو تحدّث نصّ الردّ المتدفّق
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // تركيز حقل الكتابة تلقائيًا عند فتح اللوحة (بعد انتهاء حركة الظهور)
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // إرسال نصّ المستخدم، مع تجاهل الإرسال إذا كان فارغًا أو أثناء توليد ردّ سابق
  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    sendMessage(text);
  };

  // Enter يُرسل، وShift+Enter يسمح بسطر جديد
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

  // لا تُركَّب اللوحة في الـ DOM إطلاقًا عند الإغلاق (توفيرًا للأداء)
  if (!isOpen) return null;

  return (
    // الموضع الثابت يتبع اتجاه اللغة: أسفل اليسار في العربية وأسفل اليمين في الإنجليزية
    <div className={`fixed inset-0 sm:inset-auto sm:bottom-24 ${isRTL ? "sm:left-6" : "sm:right-6"} z-50 sm:w-[400px] sm:h-[min(600px,calc(100dvh-8rem))] flex flex-col animate-slide-up`}>
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
                  // \u0631\u062F\u0651 \u0627\u0644\u0645\u0633\u0627\u0639\u062F \u064A\u064F\u0639\u0631\u064E\u0636 \u0628\u0635\u064A\u063A\u0629 Markdown\u061B \u0648\u0627\u0644\u0642\u064A\u0645\u0629 "\u200B" (\u0645\u0633\u0627\u0641\u0629 \u0635\u0641\u0631\u064A\u0629) \u062A\u062D\u0627\u0641\u0638 \u0639\u0644\u0649 \u0627\u0631\u062A\u0641\u0627\u0639 \u0627\u0644\u0641\u0642\u0627\u0639\u0629 \u0623\u062B\u0646\u0627\u0621 \u0628\u062F\u0621 \u0627\u0644\u0628\u062B\u0651 \u0642\u0628\u0644 \u0648\u0635\u0648\u0644 \u0627\u0644\u0646\u0635\u0651
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

          {/* مؤشّر "يكتب الآن" (نقاط متحرّكة): يظهر عند التحميل وقبل أن يبدأ نصّ ردّ المساعد بالوصول */}
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

        {/* الاقتراحات السريعة تُعرَض فقط في بداية المحادثة (رسالتان أو أقل) */}
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
