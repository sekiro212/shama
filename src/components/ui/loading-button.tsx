import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type Props = {
  loading?: boolean;
  children: React.ReactNode;
};

export function LoadingButton({ loading, children }: Props) {
  return (
    <Button disabled={loading}>
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}
