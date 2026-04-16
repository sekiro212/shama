import {
  Plus,
  Edit,
  Trash2,
  Package,
  AlertCircle,
  CheckCircle,
  Search,
  Eye,
  EyeOff,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PLACEHOLDER_IMAGE_URL } from "@/lib/productImage";
import { useLanguage } from "@/contexts/LanguageContext";
import { ConfirmDialog } from "../dialogs/ConfirmDialog";
import type { usePerfumes } from "../hooks/usePerfumes";

interface PerfumesTabProps {
  perfumesApi: ReturnType<typeof usePerfumes>;
}

export function PerfumesTab({ perfumesApi }: PerfumesTabProps) {
  const { t, isRTL } = useLanguage();
  const {
    perfumes,
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

  return (
    <div className="space-y-6">
      {/* Perfume Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="glass-card border-[#323D50]/10 dark:border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6B7B8D] dark:text-white/60 text-sm">{t("admin.stats.totalPerfumes")}</p>
                <p className="text-2xl font-bold text-[#323D50] dark:text-white">
                  {perfumes.length}
                </p>
              </div>
              <Package className="w-8 h-8 text-[#5B8DD9]" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-[#323D50]/10 dark:border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6B7B8D] dark:text-white/60 text-sm">{t("admin.stats.active")}</p>
                <p className="text-2xl font-bold text-green-400">
                  {perfumes.filter((p) => p.is_active).length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-[#323D50]/10 dark:border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6B7B8D] dark:text-white/60 text-sm">{t("admin.stats.inactive")}</p>
                <p className="text-2xl font-bold text-red-400">
                  {perfumes.filter((p) => !p.is_active).length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-[#323D50]/10 dark:border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6B7B8D] dark:text-white/60 text-sm">{t("admin.stats.lowStock")}</p>
                <p className="text-2xl font-bold text-orange-400">
                  {perfumes.filter((p) => p.stock_quantity < 10).length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className={`absolute ${isRTL ? "right-3" : "left-3"} top-3 w-4 h-4 text-[#6B7B8D] dark:text-white/40`} />
            <Input
              placeholder={t("admin.search.searchPerfumes")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${isRTL ? "pr-10" : "pl-10"} glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white`}
            />
          </div>
        </div>
        <Select
          value={filterType}
          onValueChange={(value: any) => setFilterType(value)}
        >
          <SelectTrigger className="w-40 glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white">
            <SelectValue placeholder={t("admin.filters.filterByType")} />
          </SelectTrigger>
          <SelectContent className="glass bg-[#F8F9FB] dark:bg-[#1a2235] border-[#323D50]/15 dark:border-white/20">
            <SelectItem value="all">{t("admin.filters.allTypes")}</SelectItem>
            <SelectItem value="bottle">{t("admin.filters.bottles")}</SelectItem>
            <SelectItem value="sample">{t("admin.filters.samples")}</SelectItem>
            <SelectItem value="gift">{t("admin.filters.giftSets")}</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filterGender}
          onValueChange={(value: any) => setFilterGender(value)}
        >
          <SelectTrigger className="w-40 glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white">
            <SelectValue placeholder={t("admin.filters.filterByGender")} />
          </SelectTrigger>
          <SelectContent className="glass bg-[#F8F9FB] dark:bg-[#1a2235] border-[#323D50]/15 dark:border-white/20">
            <SelectItem value="all">{t("admin.filters.allGenders")}</SelectItem>
            <SelectItem value="men">{t("admin.filters.men")}</SelectItem>
            <SelectItem value="women">{t("admin.filters.women")}</SelectItem>
            <SelectItem value="unisex">{t("admin.filters.unisex")}</SelectItem>
          </SelectContent>
        </Select>
        <Button
          className="bg-[#5B8DD9] hover:bg-[#3E6BB5] text-white"
          onClick={() => {
            resetForm();
            setIsDialogOpen(true);
          }}
        >
          <Plus className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
          {t("admin.form.addPerfume")}
        </Button>
      </div>

      {/* Perfumes Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow className="border-[#323D50]/10 dark:border-white/10">
                <TableHead className="text-[#323D50] dark:text-white/80">{t("admin.table.image")}</TableHead>
                <TableHead className="text-[#323D50] dark:text-white/80">{t("admin.table.name")}</TableHead>
                <TableHead className="text-[#323D50] dark:text-white/80">{t("admin.table.price")}</TableHead>
                <TableHead className="text-[#323D50] dark:text-white/80">{t("admin.table.type")}</TableHead>
                <TableHead className="text-[#323D50] dark:text-white/80">{t("admin.table.gender")}</TableHead>
                <TableHead className="text-[#323D50] dark:text-white/80">{t("admin.table.stock")}</TableHead>
                <TableHead className="text-[#323D50] dark:text-white/80">{t("admin.table.images")}</TableHead>
                <TableHead className="text-[#323D50] dark:text-white/80">{t("admin.table.status")}</TableHead>
                <TableHead className="text-[#323D50] dark:text-white/80 text-center">
                  {t("admin.table.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPerfumes.map((perfume) => (
                <TableRow key={perfume.id} className="border-[#323D50]/10 dark:border-white/10">
                  <TableCell>
                    <img
                      src={
                        perfume.images?.[0]?.image_url || PLACEHOLDER_IMAGE_URL
                      }
                      alt={perfume.name}
                      className="w-12 h-12 object-cover rounded-md"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = PLACEHOLDER_IMAGE_URL;
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-[#323D50] dark:text-white font-medium">
                    {perfume.name}
                  </TableCell>
                  <TableCell className="text-[#5B8DD9] font-semibold">
                    {perfume.price} LYD
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        perfume.type === "bottle"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {perfume.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {perfume.gender}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`${
                        perfume.stock_quantity < 10
                          ? "text-orange-400"
                          : "text-[#323D50] dark:text-white"
                      }`}
                    >
                      {perfume.stock_quantity}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-[#6B7B8D] dark:text-white/60" />
                      <span className="text-[#323D50] dark:text-white">
                        {perfume.images?.length || 0}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        perfume.is_active ? "default" : "destructive"
                      }
                    >
                      {perfume.is_active ? t("admin.status.active") : t("admin.status.inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <LoadingButton
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          toggleStatus(perfume.id, perfume.is_active)
                        }
                        loading={togglingStatus === perfume.id}
                        loadingText=""
                        className="h-8 px-3 border-[#323D50]/15 dark:border-white/20 text-white hover:bg-white/10 transition-colors"
                        title={
                          perfume.is_active ? t("admin.actions.deactivate") : t("admin.actions.activate")
                        }
                      >
                        {perfume.is_active ? (
                          <EyeOff className="w-3 h-3" />
                        ) : (
                          <Eye className="w-3 h-3" />
                        )}
                      </LoadingButton>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(perfume)}
                        className="h-8 px-3 border-[#323D50]/15 dark:border-white/20 text-white hover:bg-blue-500/20 hover:border-blue-500/40 transition-colors"
                        title={t("admin.actions.edit")}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <LoadingButton
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(perfume.id)}
                        loading={deletingPerfume === perfume.id}
                        loadingText=""
                        className="h-8 px-3 border-[#323D50]/15 dark:border-white/20 text-white hover:bg-red-500/20 hover:border-red-500/40 transition-colors"
                        title={t("admin.actions.delete")}
                      >
                        <Trash2 className="w-3 h-3" />
                      </LoadingButton>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <ConfirmDialog {...confirmDialogProps} />
      <ConfirmDialog {...perfumesApi.images.confirmDialogProps} />
    </div>
  );
}
