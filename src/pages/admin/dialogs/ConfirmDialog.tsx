import { AlertTriangle, Trash2, AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import type { ConfirmDialogState } from "../hooks/useConfirmDialog";

interface ConfirmDialogProps extends ConfirmDialogState {
  onConfirm: () => void;
  onCancel: () => void;
}

const variantConfig = {
  danger: {
    icon: Trash2,
    iconBg: "bg-red-500/15",
    iconColor: "text-red-500",
    actionClass:
      "bg-red-500 hover:bg-red-600 text-white border-0 focus:ring-red-500",
  },
  warning: {
    icon: AlertTriangle,
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-500",
    actionClass:
      "bg-amber-500 hover:bg-amber-600 text-white border-0 focus:ring-amber-500",
  },
  default: {
    icon: AlertCircle,
    iconBg: "bg-[#5B8DD9]/15",
    iconColor: "text-[#5B8DD9]",
    actionClass:
      "bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white border-0 focus:ring-[#5B8DD9]",
  },
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <AlertDialogContent className="glass-card bg-[#F8F9FB] dark:bg-[#1a2235] border-[#323D50]/10 dark:border-white/10 max-w-md">
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-xl ${config.iconBg} flex items-center justify-center flex-shrink-0`}
            >
              <Icon className={`w-6 h-6 ${config.iconColor}`} />
            </div>
            <div className="space-y-2">
              <AlertDialogTitle className="text-[#323D50] dark:text-white text-lg font-semibold">
                {title}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-[#6B7B8D] dark:text-white/60 text-sm leading-relaxed">
                {description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-2 gap-2 sm:gap-2">
          <AlertDialogCancel
            onClick={onCancel}
            className="glass dark:bg-white/5 bg-white border-[#323D50]/15 dark:border-white/20 text-[#323D50] dark:text-white hover:bg-[#323D50]/10 dark:hover:bg-white/10 rounded-xl"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={`rounded-xl ${config.actionClass}`}
          >
            {confirmLabel || "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
