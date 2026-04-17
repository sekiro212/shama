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

const columnWidths = ["w-20", "w-32", "w-24", "w-28", "w-20"];

export function TableSkeleton({ columns = 5, rows = 5 }: TableSkeletonProps) {
  return (
    <div className="glass-card border border-[#323D50]/10 dark:border-white/10 rounded-2xl overflow-hidden">
      <Table>
        <TableHeader>
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
