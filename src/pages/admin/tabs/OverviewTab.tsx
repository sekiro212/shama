import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, DollarSign, Package } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { OrderStats } from "@/services/ordersService";

interface OverviewTabProps {
  orderStats: OrderStats;
  perfumesCount: number;
}

export function OverviewTab({ orderStats, perfumesCount }: OverviewTabProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="glass-card border-[#323D50]/10 dark:border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6B7B8D] dark:text-white/60 text-sm">{t("admin.stats.totalOrders")}</p>
                <p className="text-2xl font-bold text-[#323D50] dark:text-white">
                  {orderStats.totalOrders}
                </p>
              </div>
              <ShoppingCart className="w-8 h-8 text-[#5B8DD9]" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-[#323D50]/10 dark:border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6B7B8D] dark:text-white/60 text-sm">{t("admin.stats.totalRevenue")}</p>
                <p className="text-2xl font-bold text-green-400">
                  {orderStats.totalRevenue.toFixed(2)} LYD
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-[#323D50]/10 dark:border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6B7B8D] dark:text-white/60 text-sm">{t("admin.stats.avgOrderValue")}</p>
                <p className="text-2xl font-bold text-blue-400">
                  {orderStats.averageOrderValue.toFixed(2)} LYD
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-[#323D50]/10 dark:border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6B7B8D] dark:text-white/60 text-sm">{t("admin.stats.totalPerfumes")}</p>
                <p className="text-2xl font-bold text-[#323D50] dark:text-white">
                  {perfumesCount}
                </p>
              </div>
              <Package className="w-8 h-8 text-[#5B8DD9]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card className="glass-card border-[#323D50]/10 dark:border-white/10">
        <CardHeader>
          <CardTitle className="text-[#323D50] dark:text-white">{t("admin.recentOrders")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {orderStats.recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-4 bg-white dark:bg-white/5 rounded-lg"
              >
                <div>
                  <p className="text-[#323D50] dark:text-white font-medium">
                    {order.first_name} {order.last_name}
                  </p>
                  <p className="text-[#6B7B8D] dark:text-white/60 text-sm">{order.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-[#5B8DD9] font-semibold">
                    {order.total} LYD
                  </p>
                  <p className="text-[#6B7B8D] dark:text-white/60 text-sm">
                    {new Date(order.order_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
