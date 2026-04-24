import React from "react";

type Props = {
  children: React.ReactNode;
  url?: string;
  fontFamily: string;
  width?: number;
};

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
          direction: "ltr",
        }}
      >
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
      <div style={{ background: "#0A0A0B" }}>{children}</div>
    </div>
  );
};

const dot = (color: string): React.CSSProperties => ({
  width: 12,
  height: 12,
  borderRadius: 999,
  background: color,
});
