import React from "react";

type Props = {
  children: React.ReactNode;
  style?: React.CSSProperties;
};

export const GlassCard: React.FC<Props> = ({ children, style }) => {
  return (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.06)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(91, 141, 217, 0.3)",
        borderRadius: 20,
        padding: 24,
        boxShadow:
          "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
        ...style,
      }}
    >
      {children}
    </div>
  );
};
