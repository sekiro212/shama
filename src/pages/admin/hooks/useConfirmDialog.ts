import { useState, useCallback } from "react";

export interface ConfirmDialogState {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: "danger" | "warning" | "default";
}

interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: "danger" | "warning" | "default";
}

export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmDialogState>({
    open: false,
    title: "",
    description: "",
  });
  const [resolveRef, setResolveRef] = useState<{
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setState({
        open: true,
        title: opts.title,
        description: opts.description,
        confirmLabel: opts.confirmLabel,
        variant: opts.variant,
      });
      setResolveRef({ resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolveRef?.resolve(true);
    setResolveRef(null);
    setState((prev) => ({ ...prev, open: false }));
  }, [resolveRef]);

  const handleCancel = useCallback(() => {
    resolveRef?.resolve(false);
    setResolveRef(null);
    setState((prev) => ({ ...prev, open: false }));
  }, [resolveRef]);

  return {
    confirm,
    confirmDialogProps: {
      ...state,
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    },
  };
}
