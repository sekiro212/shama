import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="glass-card border border-[#323D50]/10 dark:border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
      <Icon className="w-12 h-12 text-[#6B7B8D] dark:text-white/40 mb-4" />
      <h3 className="text-lg font-semibold text-[#323D50] dark:text-white">
        {title}
      </h3>
      {subtitle && (
        <p className="text-sm text-[#6B7B8D] dark:text-white/60 mt-1 max-w-sm">
          {subtitle}
        </p>
      )}
      {action && (
        <Button
          onClick={action.onClick}
          className="mt-4 bg-[#5B8DD9] hover:bg-[#3E6BB5] text-white"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
