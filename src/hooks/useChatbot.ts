/**
 * useChatbot.ts — الحالة ومنطق البث (streaming) لمساعد التسوّق الذكي.
 *
 * يمتلك سجل المحادثة، ويدير استدعاء OpenRouter البثّي عبر `chatWithAIStream`،
 * ويبقي رسالة الترحيب متزامنة مع اللغة النشطة. واجهة الشات بوت (ChatbotButton)
 * تستهلك هذا الخطاف.
 */
import { useState, useCallback, useEffect } from "react";
import { chatWithAIStream } from "@/services/aiService";
import { useLanguage } from "@/contexts/LanguageContext";
import { trackEvent } from "@/services/trackingService";

/** فقاعة محادثة واحدة في سجل المحادثة. */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

/**
 * يدير محادثة الشات بوت والردود البثّية.
 * @returns `{ messages, isLoading, sendMessage, clearChat }` — سجل المحادثة،
 *          علامة وجود طلب قيد التنفيذ، دالة إرسال تبثّ رد المساعد، ودالة إعادة تعيين.
 */
export function useChatbot() {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: t("chatbot.welcome"),
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  // تحديث رسالة الترحيب عند تغيّر اللغة
  useEffect(() => {
    setMessages(prev => prev.map(m =>
      m.id === "welcome" ? { ...m, content: t("chatbot.welcome") } : m
    ));
  }, [language, t]);

  /**
   * يضيف رسالة المستخدم، ثم يبثّ رد المساعد جزءاً جزءاً (chunk).
   * @param userText النص الخام الذي كتبه المستخدم.
   */
  const sendMessage = useCallback(async (userText: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: userText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    trackEvent("chatbot_query", { query: userText });

    // إدراج فقاعة مساعد فارغة فوراً؛ تُلحَق الأجزاء المبثوثة بها فور وصولها
    // ليرى المستخدم تأثير "الكتابة" الحيّ.
    const assistantId = (Date.now() + 1).toString();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);

    try {
      // بناء سجل المحادثة كسياق (مع استبعاد رسالة الترحيب)
      const history = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({
          role: (m.role === "user" ? "user" : "model") as "user" | "model",
          text: m.content,
        }));

      const stream = chatWithAIStream(userText, history);

      // كل جزء (chunk) يُصدَر يُدمج في فقاعة المساعد في مكانها.
      for await (const chunk of stream) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content + chunk }
              : m
          )
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: t("chatbot.error"),
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  /** يعيد سجل المحادثة إلى رسالة الترحيب المترجمة فقط. */
  const clearChat = useCallback(() => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: t("chatbot.welcome"),
        timestamp: new Date(),
      },
    ]);
  }, [t]);

  return { messages, isLoading, sendMessage, clearChat };
}
