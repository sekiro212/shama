import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
  type?: "order" | "review" | "memory" | "coupon";
}

function getStatusStyle(status: string, type?: string): string {
  const key = status.toLowerCase();

  if (type === "coupon") {
    const couponStyles: Record<string, string> = {
      active: "bg-green-500/20 text-green-400 border-green-500/30",
      inactive: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      expired: "bg-red-500/20 text-red-400 border-red-500/30",
    };
    if (couponStyles[key]) return couponStyles[key];
  }

  if (type === "review" || type === "memory") {
    const moderationStyles: Record<string, string> = {
      pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      approved: "bg-green-500/20 text-green-400 border-green-500/30",
    };
    if (moderationStyles[key]) return moderationStyles[key];
  }

  const orderStyles: Record<string, string> = {
    pending: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    confirmed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    processing: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    shipped: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    delivered: "bg-green-500/20 text-green-400 border-green-500/30",
    accepted: "bg-[#5B8DD9]/20 text-[#5B8DD9] border-[#5B8DD9]/30",
    returned: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  };
  if (orderStyles[key]) return orderStyles[key];

  return "bg-gray-500/20 text-gray-400 border-gray-500/30";
}

export function StatusBadge({ status, type }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={`capitalize ${getStatusStyle(status, type)}`}
    >
      {status}
    </Badge>
  );
}
