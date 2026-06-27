/**
 * TableSkeleton — مكوّن واجهة مشترك في لوحة الإدارة.
 *
 * هيكل تحميل (placeholder) يحاكي شكل الجدول بصفوف وأعمدة وامضة أثناء جلب
 * البيانات، لتقليل وميض التخطيط (layout shift) قبل ظهور البيانات الحقيقية.
 */
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

interface TableSkeletonProps {
  columns?: number;
  rows?: number;
}

// عروض ثابتة للأعمدة تُدوَّر دوريًا لإعطاء الهيكل مظهرًا غير منتظم وأكثر واقعية.
const columnWidths = ["w-20", "w-32", "w-24", "w-28", "w-20"];

/**
 * يعرض جدولًا هيكليًا (skeleton) بعدد محدّد من الأعمدة والصفوف.
 *
 * @param columns - عدد الأعمدة (افتراضيًا 5).
 * @param rows    - عدد صفوف الجسم (افتراضيًا 5).
 */
export function TableSkeleton({ columns = 5, rows = 5 }: TableSkeletonProps) {
  return (
    <div className="glass-card border border-[#323D50]/10 dark:border-white/10 rounded-2xl overflow-hidden">
      <Table>
        <TableHeader>
          {/* صف الترويسة: شريحة وامضة واحدة لكل عمود */}
          <TableRow className="border-[#323D50]/10 dark:border-white/10">
            {Array.from({ length: columns }).map((_, i) => (
              <TableHead key={i}>
                <Skeleton
                  className={`h-4 ${columnWidths[i % columnWidths.length]}`}
                />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* صفوف الجسم: شبكة من الشرائح الوامضة بأبعاد متغيّرة */}
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <TableRow
              key={rowIdx}
              className="border-[#323D50]/10 dark:border-white/10"
            >
              {Array.from({ length: columns }).map((_, colIdx) => (
                <TableCell key={colIdx}>
                  <Skeleton
                    className={`h-4 ${columnWidths[colIdx % columnWidths.length]}`}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
