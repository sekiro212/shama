import { useEffect } from "react";
import { useOrders } from "../hooks/useOrders";
import { usePerfumes } from "../hooks/usePerfumes";
import { useReviews } from "../hooks/useReviews";
import { useMemories } from "../hooks/useMemories";
import { useOverviewData } from "../hooks/useOverviewData";
import { StatCard } from "../components/StatCard";
import {
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Package,
  Star,
  Heart,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

const revenueChartConfig: ChartConfig = {
  revenue: { label: "Revenue", color: "#5B8DD9" },
  orders: { label: "Orders", color: "#3E6BB5" },
};

const statusChartConfig: ChartConfig = {
  count: { label: "Orders", color: "#5B8DD9" },
};

const productChartConfig: ChartConfig = {
  count: { label: "Sold", color: "#5B8DD9" },
};

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="glass-card border border-[#323D50]/10 dark:border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card border border-[#323D50]/10 dark:border-white/10 rounded-2xl p-6">
          <Skeleton className="h-5 w-48 mb-4" />
          <Skeleton className="h-[300px] w-full rounded-lg" />
        </div>
        <div className="glass-card border border-[#323D50]/10 dark:border-white/10 rounded-2xl p-6">
          <Skeleton className="h-5 w-48 mb-4" />
          <Skeleton className="h-[300px] w-full rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card border border-[#323D50]/10 dark:border-white/10 rounded-2xl p-6">
          <Skeleton className="h-5 w-32 mb-4" />
          <Skeleton className="h-[250px] w-full rounded-lg" />
        </div>
        <div className="glass-card border border-[#323D50]/10 dark:border-white/10 rounded-2xl p-6">
          <Skeleton className="h-5 w-32 mb-4" />
          <div className="space-y-3 mt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const { t } = useLanguage();
  const ordersApi = useOrders({});
  const perfumesApi = usePerfumes();
  const reviewsApi = useReviews();
  const memoriesApi = useMemories();

  const { dailyRevenue, statusDistribution, topProducts } = useOverviewData(
    ordersApi.orders,
    ordersApi.orderStats
  );

  useEffect(() => {
    ordersApi.loadOrders();
    ordersApi.loadOrderStats();
    perfumesApi.loadPerfumes();
    reviewsApi.loadReviews();
    memoriesApi.loadMemories();
  }, []);

  if (ordersApi.ordersLoading) {
    return <OverviewSkeleton />;
  }

  const { orderStats } = ordersApi;

  return (
    <div className="space-y-6">
      {/* Row 1: Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title={t("admin.stats.totalOrders")}
          value={orderStats.totalOrders}
          icon={ShoppingCart}
          iconColor="text-[#5B8DD9]"
        />
        <StatCard
          title={t("admin.stats.totalRevenue")}
          value={`${orderStats.totalRevenue.toFixed(2)} LYD`}
          icon={DollarSign}
          iconColor="text-green-500"
        />
        <StatCard
          title={t("admin.stats.avgOrderValue")}
          value={`${orderStats.averageOrderValue.toFixed(2)} LYD`}
          icon={TrendingUp}
          iconColor="text-blue-400"
        />
        <StatCard
          title={t("admin.stats.totalProducts")}
          value={perfumesApi.perfumes.length}
          icon={Package}
          iconColor="text-[#5B8DD9]"
        />
        <StatCard
          title={t("admin.reviews.pendingReviews")}
          value={reviewsApi.pendingReviewCount}
          icon={Star}
          iconColor="text-amber-500"
        />
        <StatCard
          title={t("admin.stats.pendingMemories")}
          value={memoriesApi.pendingMemoryCount}
          icon={Heart}
          iconColor="text-pink-500"
        />
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Area Chart */}
        <div className="glass-card border border-[#323D50]/10 dark:border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-[#323D50] dark:text-[#F5F5F5] mb-4">
            {t("admin.stats.revenueLast30Days")}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={dailyRevenue}
              margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5B8DD9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#5B8DD9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-[#323D50]/10 dark:text-white/10"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#6B7B8D" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#6B7B8D" }}
                tickLine={false}
                axisLine={false}
                width={60}
                tickFormatter={(v: number) => `${v}`}
              />
              <Tooltip
                content={
                  <ChartTooltipContent
                    config={revenueChartConfig}
                    formatter={(v: number) => `${v.toFixed(2)} LYD`}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#5B8DD9"
                strokeWidth={2}
                fill="url(#revenueGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Order Status Pie/Donut Chart */}
        <div className="glass-card border border-[#323D50]/10 dark:border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-[#323D50] dark:text-[#F5F5F5] mb-4">
            {t("admin.stats.orderStatusDistribution")}
          </h3>
          {statusDistribution.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-[#6B7B8D]">
              {t("admin.stats.noData")}
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {statusDistribution.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={
                      <ChartTooltipContent
                        config={statusChartConfig}
                        formatter={(v: number) => `${v} orders`}
                      />
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 mt-2 justify-center">
                {statusDistribution.map((entry) => (
                  <div key={entry.status} className="flex items-center gap-1.5 text-xs">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: entry.fill }}
                    />
                    <span className="text-[#6B7B8D] dark:text-white/60">
                      {entry.status}
                    </span>
                    <span className="font-medium text-[#323D50] dark:text-[#F5F5F5]">
                      ({entry.count})
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Row 3: Top Products + Top Cities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products Bar Chart */}
        <div className="glass-card border border-[#323D50]/10 dark:border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-[#323D50] dark:text-[#F5F5F5] mb-4">
            {t("admin.stats.topProducts")}
          </h3>
          {topProducts.length === 0 ? (
            <div className="flex items-center justify-center h-[250px] text-[#6B7B8D]">
              {t("admin.stats.noData")}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={topProducts.map((p) => ({
                  ...p,
                  name: p.name.length > 20 ? p.name.slice(0, 20) + "..." : p.name,
                }))}
                layout="vertical"
                margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  className="text-[#323D50]/10 dark:text-white/10"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#6B7B8D" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#6B7B8D" }}
                  tickLine={false}
                  axisLine={false}
                  width={130}
                />
                <Tooltip
                  content={
                    <ChartTooltipContent
                      config={productChartConfig}
                      formatter={(v: number) => `${v} sold`}
                    />
                  }
                />
                <Bar
                  dataKey="count"
                  fill="#5B8DD9"
                  radius={[0, 6, 6, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Cities */}
        <div className="glass-card border border-[#323D50]/10 dark:border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-[#323D50] dark:text-[#F5F5F5] mb-4">
            {t("admin.stats.topCities")}
          </h3>
          {orderStats.topCities.length === 0 ? (
            <div className="flex items-center justify-center h-[250px] text-[#6B7B8D]">
              {t("admin.stats.noData")}
            </div>
          ) : (
            <div className="space-y-2">
              {orderStats.topCities.map((city, idx) => (
                <div
                  key={city.city}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[#F8F9FB] dark:bg-white/5 hover:bg-[#5B8DD9]/5 dark:hover:bg-[#5B8DD9]/10 transition-colors"
                >
                  <span className="w-7 h-7 rounded-full bg-[#5B8DD9]/10 text-[#5B8DD9] text-sm font-semibold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="flex-1 text-sm font-medium text-[#323D50] dark:text-[#F5F5F5] truncate">
                    {city.city}
                  </span>
                  <span className="text-xs text-[#6B7B8D] dark:text-white/60 tabular-nums">
                    {city.count} {city.count === 1 ? "order" : "orders"}
                  </span>
                  <span className="text-xs font-medium text-[#323D50] dark:text-[#F5F5F5] tabular-nums">
                    {city.revenue.toFixed(2)} LYD
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
