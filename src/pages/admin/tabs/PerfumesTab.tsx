import { useState, useMemo } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Package,
  AlertCircle,
  CheckCircle,
  Search,
  LayoutGrid,
  List,
  MoreHorizontal,
  Power,
  AlertTriangle,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PLACEHOLDER_IMAGE_URL } from "@/lib/productImage";
import { useLanguage } from "@/contexts/LanguageContext";
import { ConfirmDialog } from "../dialogs/ConfirmDialog";
import { DataTable } from "../components/DataTable";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import type { usePerfumes } from "../hooks/usePerfumes";
import type { Perfume } from "../types";

interface PerfumesTabProps {
  perfumesApi: ReturnType<typeof usePerfumes>;
}

type StockFilter = "all" | "inStock" | "lowStock" | "outOfStock";

export function PerfumesTab({ perfumesApi }: PerfumesTabProps) {
  const { t, isRTL } = useLanguage();
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");

  const {
    perfumes,
    loading,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    filterGender,
    setFilterGender,
    setIsDialogOpen,
    deletingPerfume,
    togglingStatus,
    filteredPerfumes,
    resetForm,
    handleEdit,
    handleDelete,
    toggleStatus,
    confirmDialogProps,
  } = perfumesApi;

  const displayPerfumes = useMemo(() => {
    if (stockFilter === "all") return filteredPerfumes;
    return filteredPerfumes.filter((p) => {
      if (stockFilter === "inStock") return p.stock_quantity > 10;
      if (stockFilter === "lowStock") return p.stock_quantity >= 1 && p.stock_quantity <= 10;
      if (stockFilter === "outOfStock") return p.stock_quantity === 0;
      return true;
    });
  }, [filteredPerfumes, stockFilter]);

  const columns: ColumnDef<Perfume>[] = [
    {
      id: "image",
      header: t("admin.table.image"),
      enableSorting: false,
      cell: ({ row }) => {
        const perfume = row.original;
        return (
          <img
            src={perfume.images?.[0]?.image_url || PLACEHOLDER_IMAGE_URL}
            alt={perfume.name}
            className="w-12 h-12 object-cover rounded-lg"
            onError={(e) => {
              (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE_URL;
            }}
          />
        );
      },
    },
    {
      accessorKey: "name",
      header: t("admin.table.name"),
      cell: ({ row }) => (
        <span className="font-medium text-[#323D50] dark:text-white">
          {row.original.name}
        </span>
      ),
    },
    {
      accessorKey: "price",
      header: t("admin.table.price"),
      cell: ({ row }) => (
        <span className="text-[#5B8DD9] font-semibold">
          {row.original.price} LYD
        </span>
      ),
    },
    {
      accessorKey: "type",
      header: t("admin.table.type"),
      cell: ({ row }) => (
        <Badge variant={row.original.type === "bottle" ? "default" : "secondary"}>
          {row.original.type}
        </Badge>
      ),
    },
    {
      accessorKey: "gender",
      header: t("admin.table.gender"),
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.gender}
        </Badge>
      ),
    },
    {
      accessorKey: "stock_quantity",
      header: t("admin.table.stock"),
      cell: ({ row }) => {
        const stock = row.original.stock_quantity;
        const color =
          stock === 0
            ? "text-red-500 font-semibold"
            : stock <= 10
            ? "text-orange-500 font-semibold"
            : "text-green-500 font-semibold";
        return <span className={color}>{stock}</span>;
      },
    },
    {
      id: "status",
      header: t("admin.table.status"),
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.is_active ? "active" : "inactive"}
          type="coupon"
        />
      ),
    },
    {
      id: "actions",
      header: t("admin.table.actions"),
      enableSorting: false,
      cell: ({ row }) => {
        const perfume = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 cursor-pointer"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? "start" : "end"}>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => toggleStatus(perfume.id, perfume.is_active)}
                disabled={togglingStatus === perfume.id}
              >
                <Power className="w-4 h-4" />
                {perfume.is_active ? t("admin.actions.deactivate") : t("admin.actions.activate")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => handleEdit(perfume)}
              >
                <Edit className="w-4 h-4" />
                {t("admin.actions.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-red-500 focus:text-red-500"
                onClick={() => handleDelete(perfume.id)}
                disabled={deletingPerfume === perfume.id}
              >
                <Trash2 className="w-4 h-4" />
                {t("admin.actions.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const getStockColor = (stock: number) => {
    if (stock === 0) return "text-red-500 font-semibold";
    if (stock <= 10) return "text-orange-500 font-semibold";
    return "text-green-500 font-semibold";
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title={t("admin.stats.totalPerfumes")}
          value={perfumes.length}
          icon={Package}
          iconColor="text-[#5B8DD9]"
        />
        <StatCard
          title={t("admin.stats.active")}
          value={perfumes.filter((p) => p.is_active).length}
          icon={CheckCircle}
          iconColor="text-green-500"
        />
        <StatCard
          title={t("admin.stats.inactive")}
          value={perfumes.filter((p) => !p.is_active).length}
          icon={AlertCircle}
          iconColor="text-red-500"
        />
        <StatCard
          title={t("admin.stats.lowStock")}
          value={perfumes.filter((p) => p.stock_quantity <= 10 && p.stock_quantity > 0).length}
          icon={AlertTriangle}
          iconColor="text-orange-500"
        />
      </div>

      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
        <div className="flex-1 w-full md:w-auto">
          <div className="relative">
            <Search
              className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7B8D] ${
                isRTL ? "right-3" : "left-3"
              }`}
            />
            <Input
              placeholder={t("admin.search.searchPerfumes")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${
                isRTL ? "pr-10" : "pl-10"
              } glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20`}
            />
          </div>
        </div>
        <Select
          value={filterType}
          onValueChange={(value: "all" | "bottle" | "sample" | "gift") => setFilterType(value)}
        >
          <SelectTrigger className="w-40 glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 cursor-pointer">
            <SelectValue placeholder={t("admin.filters.filterByType")} />
          </SelectTrigger>
          <SelectContent className="glass bg-[#F8F9FB] dark:bg-[#1a2235] border-[#323D50]/15 dark:border-white/20">
            <SelectItem value="all" className="cursor-pointer">{t("admin.filters.allTypes")}</SelectItem>
            <SelectItem value="bottle" className="cursor-pointer">{t("admin.filters.bottles")}</SelectItem>
            <SelectItem value="sample" className="cursor-pointer">{t("admin.filters.samples")}</SelectItem>
            <SelectItem value="gift" className="cursor-pointer">{t("admin.filters.giftSets")}</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filterGender}
          onValueChange={(value: "all" | "men" | "women" | "unisex") => setFilterGender(value)}
        >
          <SelectTrigger className="w-40 glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 cursor-pointer">
            <SelectValue placeholder={t("admin.filters.filterByGender")} />
          </SelectTrigger>
          <SelectContent className="glass bg-[#F8F9FB] dark:bg-[#1a2235] border-[#323D50]/15 dark:border-white/20">
            <SelectItem value="all" className="cursor-pointer">{t("admin.filters.allGenders")}</SelectItem>
            <SelectItem value="men" className="cursor-pointer">{t("admin.filters.men")}</SelectItem>
            <SelectItem value="women" className="cursor-pointer">{t("admin.filters.women")}</SelectItem>
            <SelectItem value="unisex" className="cursor-pointer">{t("admin.filters.unisex")}</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={stockFilter}
          onValueChange={(value: StockFilter) => setStockFilter(value)}
        >
          <SelectTrigger className="w-40 glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 cursor-pointer">
            <SelectValue placeholder="Stock Status" />
          </SelectTrigger>
          <SelectContent className="glass bg-[#F8F9FB] dark:bg-[#1a2235] border-[#323D50]/15 dark:border-white/20">
            <SelectItem value="all" className="cursor-pointer">All Stock</SelectItem>
            <SelectItem value="inStock" className="cursor-pointer">In Stock (&gt;10)</SelectItem>
            <SelectItem value="lowStock" className="cursor-pointer">Low Stock (1-10)</SelectItem>
            <SelectItem value="outOfStock" className="cursor-pointer">Out of Stock (0)</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 border border-[#323D50]/15 dark:border-white/20 rounded-lg p-1">
          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            className={`h-8 w-8 p-0 cursor-pointer ${
              viewMode === "table"
                ? "bg-[#5B8DD9] hover:bg-[#3E6BB5] text-white"
                : "text-[#6B7B8D]"
            }`}
            onClick={() => setViewMode("table")}
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            className={`h-8 w-8 p-0 cursor-pointer ${
              viewMode === "grid"
                ? "bg-[#5B8DD9] hover:bg-[#3E6BB5] text-white"
                : "text-[#6B7B8D]"
            }`}
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>
        <Button
          className="bg-[#5B8DD9] hover:bg-[#3E6BB5] text-white cursor-pointer"
          onClick={() => {
            resetForm();
            setIsDialogOpen(true);
          }}
        >
          <Plus className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
          {t("admin.form.addPerfume")}
        </Button>
      </div>

      {viewMode === "table" ? (
        <DataTable
          columns={columns}
          data={displayPerfumes}
          pageSize={25}
          isLoading={loading}
          emptyState={{
            icon: Package,
            title: "No perfumes found",
            subtitle: "Try adjusting your filters or add a new perfume.",
          }}
        />
      ) : (
        <>
          {displayPerfumes.length === 0 ? (
            <div className="glass-card border border-[#323D50]/10 dark:border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
              <Package className="w-12 h-12 text-[#6B7B8D] dark:text-white/40 mb-4" />
              <h3 className="text-lg font-semibold text-[#323D50] dark:text-white">
                No perfumes found
              </h3>
              <p className="text-sm text-[#6B7B8D] dark:text-white/60 mt-1 max-w-sm">
                Try adjusting your filters or add a new perfume.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {displayPerfumes.map((perfume) => (
                <div
                  key={perfume.id}
                  className="glass-card rounded-2xl overflow-hidden group cursor-pointer hover:shadow-lg transition-all"
                >
                  <div className="relative h-48 bg-[#323D50]/5 dark:bg-white/5">
                    <img
                      src={perfume.images?.[0]?.image_url || PLACEHOLDER_IMAGE_URL}
                      alt={perfume.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE_URL;
                      }}
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        className="bg-[#5B8DD9] hover:bg-[#3E6BB5] text-white cursor-pointer"
                        onClick={() => handleEdit(perfume)}
                      >
                        <Edit className="w-3 h-3 me-1" />
                        {t("admin.actions.edit")}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="cursor-pointer"
                        onClick={() => handleDelete(perfume.id)}
                        disabled={deletingPerfume === perfume.id}
                      >
                        <Trash2 className="w-3 h-3 me-1" />
                        {t("admin.actions.delete")}
                      </Button>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-[#323D50] dark:text-white truncate">
                      {perfume.name}
                    </h3>
                    <p className="text-[#5B8DD9] font-bold mt-1">
                      {perfume.price} LYD
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant={perfume.type === "bottle" ? "default" : "secondary"}>
                        {perfume.type}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {perfume.gender}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className={getStockColor(perfume.stock_quantity)}>
                        Stock: {perfume.stock_quantity}
                      </span>
                      <StatusBadge
                        status={perfume.is_active ? "active" : "inactive"}
                        type="coupon"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <ConfirmDialog {...confirmDialogProps} />
      <ConfirmDialog {...perfumesApi.images.confirmDialogProps} />
    </div>
  );
}
