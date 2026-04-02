import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  children: React.ReactNode;
  loadingText?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
};

export function LoadingButton({ loading, children, loadingText, variant, size, ...props }: Props) {
  return (
    <Button disabled={loading} variant={variant} size={size} {...props}>
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {loading && loadingText ? loadingText : children}
    </Button>
  );
}
