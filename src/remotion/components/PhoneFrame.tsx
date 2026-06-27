/**
 * ===========================================================================
 * الملف: PhoneFrame.tsx
 * الدور: مكوّن عرض (component) يحاكي إطار هاتف ذكي.
 * يلفّ المحتوى الممرَّر داخل هيكل هاتف بحوافّ مدوّرة و"نتوء" الكاميرا العلوي
 * (notch)، ليُعرض محتوى الموقع كأنه يعمل على شاشة جوال.
 * ===========================================================================
 */
import React from "react";

// خصائص المكوّن: المحتوى الداخلي وعرض الهاتف.
type Props = {
  children: React.ReactNode;
  width?: number;
};

/** يلفّ المحتوى داخل إطار هاتف بنسبة شاشة 19.5:9 ونتوء كاميرا علوي. */
export const PhoneFrame: React.FC<Props> = ({ children, width = 480 }) => {
  // حساب الارتفاع من العرض بنسبة شاشة الهواتف الحديثة 19.5:9.
  const height = Math.round((width * 19.5) / 9);
  return (
    <div
      style={{
        width,
        height,
        background: "#0A0A0B",
        borderRadius: 56,
        padding: 14,
        boxShadow:
          "0 60px 140px rgba(0,0,0,0.7), inset 0 0 0 2px rgba(255,255,255,0.08), 0 0 0 1px rgba(0,0,0,0.4)",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0F0F10",
          borderRadius: 44,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* نتوء الكاميرا (notch) في أعلى منتصف الشاشة */}
        <div
          style={{
            position: "absolute",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)", // توسيط النتوء أفقياً
            width: 110,
            height: 28,
            background: "#000",
            borderRadius: 999,
            zIndex: 10, // فوق المحتوى
          }}
        />
        {children}
      </div>
    </div>
  );
};
