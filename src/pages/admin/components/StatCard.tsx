/**
 * StatCard — مكوّن واجهة مشترك في لوحة الإدارة.
 *
 * بطاقة مؤشّر أداء (KPI) تعرض عنوانًا وقيمة رئيسية وأيقونة ومؤشّر اتجاه
 * اختياري. تُستخدم في لوحات النظرة العامة والعطور والكوبونات.
 */
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUp, ArrowDown, type LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  trend?: { value: number; direction: "up" | "down" };
}

/**
 * يعرض بطاقة إحصائية واحدة.
 *
 * @param title     - التسمية التي تصف المقياس.
 * @param value     - قيمة المقياس (نص أو رقم).
 * @param icon      - أيقونة Lucide تُعرض على الجانب.
 * @param iconColor - صنف لون نص Tailwind للأيقونة.
 * @param trend     - تغيّر اختياري صعودًا/هبوطًا يُعرض بسهم ملوّن.
 */
export function StatCard({
  title,
  value,
  icon: Icon,
  iconColor = "text-[#5B8DD9]",
  trend,
}: StatCardProps) {
  return (
    <Card className="glass-card border-[#323D50]/10 dark:border-white/10">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[#6B7B8D] dark:text-white/60 text-sm">
              {title}
            </p>
            <p className="text-2xl font-bold text-[#323D50] dark:text-white mt-1">
              {value}
            </p>
            {trend && (
              <div
                className={`flex items-center gap-1 mt-1 text-xs font-medium ${
                  trend.direction === "up"
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {trend.direction === "up" ? (
                  <ArrowUp className="w-3 h-3" />
                ) : (
                  <ArrowDown className="w-3 h-3" />
                )}
                <span>{trend.value}%</span>
              </div>
            )}
          </div>
          <Icon className={`w-8 h-8 ${iconColor}`} />
        </div>
      </CardContent>
    </Card>
  );
}
