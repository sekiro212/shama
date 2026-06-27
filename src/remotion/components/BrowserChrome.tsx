/**
 * ===========================================================================
 * الملف: BrowserChrome.tsx
 * الدور: مكوّن عرض (component) يحاكي إطار نافذة متصفّح.
 * يرسم شريط متصفّح أعلى المحتوى (الدوائر الثلاث الملوّنة + شريط العنوان) ليبدو
 * المحتوى الممرَّر كأنه صفحة ويب مفتوحة، ويُستخدم في مشاهد عرض الموقع.
 * ===========================================================================
 */
import React from "react";

// خصائص المكوّن: المحتوى الداخلي، عنوان URL المعروض، عائلة الخط، والعرض.
type Props = {
  children: React.ReactNode;
  url?: string;
  fontFamily: string;
  width?: number;
};

/** يلفّ المحتوى الممرَّر داخل إطار نافذة متصفّح بشريط عنوان وأزرار. */
export const BrowserChrome: React.FC<Props> = ({
  children,
  url = "shama.ly",
  fontFamily,
  width = 920,
}) => {
  return (
    <div
      style={{
        width,
        background: "#0F0F10",
        borderRadius: 28,
        overflow: "hidden",
        boxShadow: "0 40px 120px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <div
        style={{
          height: 56,
          background: "#1A1A1C",
          display: "flex",
          alignItems: "center",
          paddingInline: 20,
          gap: 14,
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          direction: "ltr", // شريط المتصفّح يبقى من اليسار لليمين دائماً حتى في العربية
        }}
      >
        {/* أزرار النافذة الثلاثة الملوّنة (إغلاق/تصغير/تكبير) كما في نظام macOS */}
        <div style={{ display: "flex", gap: 8 }}>
          <div style={dot("#FF5F57")} />
          <div style={dot("#FEBC2E")} />
          <div style={dot("#28C840")} />
        </div>
        <div
          style={{
            flex: 1,
            background: "#0A0A0B",
            borderRadius: 999,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.7)",
            fontFamily,
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: 0.4,
          }}
        >
          {url}
        </div>
        <div style={{ width: 44 }} />
      </div>
      {/* منطقة محتوى الصفحة الفعلية أسفل شريط العنوان */}
      <div style={{ background: "#0A0A0B" }}>{children}</div>
    </div>
  );
};

/** دالة مساعدة تعيد نمط دائرة صغيرة ملوّنة لأزرار نافذة المتصفّح. */
const dot = (color: string): React.CSSProperties => ({
  width: 12,
  height: 12,
  borderRadius: 999,
  background: color,
});
