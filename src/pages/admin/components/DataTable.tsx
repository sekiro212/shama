import { useState } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { TableSkeleton } from "./TableSkeleton";
import { EmptyState } from "./EmptyState";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  pageSize?: number;
  isLoading?: boolean;
  emptyState?: { icon: LucideIcon; title: string; subtitle?: string };
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder,
  pageSize = 25,
  isLoading,
  emptyState,
}: DataTableProps<TData, TValue>) {
  const { isRTL } = useLanguage();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: { pageSize },
    },
  });

  if (isLoading) {
    return <TableSkeleton columns={columns.length} />;
  }

  if (data.length === 0 && emptyState) {
    return <EmptyState icon={emptyState.icon} title={emptyState.title} subtitle={emptyState.subtitle} />;
  }

  const currentPage = table.getState().pagination.pageIndex;
  const totalPages = table.getPageCount();

  return (
    <div className="space-y-4">
      {searchKey && (
        <div className="relative max-w-sm">
          <Search
            className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7B8D] ${
              isRTL ? "right-3" : "left-3"
            }`}
          />
          <Input
            placeholder={searchPlaceholder ?? "Search..."}
            value={
              (table.getColumn(searchKey)?.getFilterValue() as string) ?? ""
            }
            onChange={(e) =>
              table.getColumn(searchKey)?.setFilterValue(e.target.value)
            }
            className={`glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 ${
              isRTL ? "pr-9" : "pl-9"
            }`}
          />
        </div>
      )}

      <div className="glass-card border border-[#323D50]/10 dark:border-white/10 rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-[#323D50]/10 dark:border-white/10 hover:bg-transparent"
              >
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();

                  return (
                    <TableHead
                      key={header.id}
                      className={canSort ? "cursor-pointer select-none" : ""}
                      onClick={
                        canSort
                          ? header.column.getToggleSortingHandler()
                          : undefined
                      }
                    >
                      <div className="flex items-center gap-1">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                        {canSort && (
                          <span className={isRTL ? "rotate-0" : ""}>
                            {sorted === "asc" ? (
                              <ArrowUp className="w-3.5 h-3.5" />
                            ) : sorted === "desc" ? (
                              <ArrowDown className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                            )}
                          </span>
                        )}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-[#323D50]/10 dark:border-white/10 hover:bg-[#5B8DD9]/5 dark:hover:bg-white/5 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-[#6B7B8D]"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#6B7B8D] dark:text-white/60">
            Rows per page
          </span>
          <Select
            value={String(table.getState().pagination.pageSize)}
            onValueChange={(val) => table.setPageSize(Number(val))}
          >
            <SelectTrigger className="w-[70px] h-8 text-sm glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-[#6B7B8D] dark:text-white/60">
            Page {currentPage + 1} of {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 border-[#323D50]/15 dark:border-white/20"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft
              className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`}
            />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 border-[#323D50]/15 dark:border-white/20"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight
              className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`}
            />
          </Button>
        </div>
      </div>
    </div>
  );
}
