import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  fetchApprovedMemories,
  submitMemory,
  Memory,
} from "@/services/memoriesService";
import { fetchProducts, Product } from "@/services/productsService";
import { toast } from "sonner";

function MemoryCard({ memory }: { memory: Memory }) {
  return (
    <div className="flex-shrink-0 glass-card p-4 rounded-xl w-60 border border-[#5B8DD9]/10 hover:border-warm/40 transition-colors duration-300">
      <span aria-hidden className="block font-display text-3xl text-warm/60 leading-none mb-1">“</span>
      <p className="font-display text-base text-[#323D50] dark:text-[#F5F5F5]/95 italic mb-3 leading-snug line-clamp-3">
        {memory.memory_text}
      </p>
      <p className="text-xs text-[#3E6BB5] dark:text-[#8BB4F0] font-medium tracking-wide">— {memory.perfume_name}</p>
    </div>
  );
}

export default function ScentMemoryWall() {
  const { t, isRTL, language } = useLanguage();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [memoryText, setMemoryText] = useState("");
  const [selectedPerfumeId, setSelectedPerfumeId] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchApprovedMemories().then(setMemories);
    fetchProducts(1, 100).then(({ products: p }) => setProducts(p));
  }, []);

  const handleSubmit = async () => {
    if (!selectedPerfumeId || memoryText.trim().length < 5) {
      toast.error(t("memories.validationError"));
      return;
    }
    setSubmitting(true);
    try {
      const product = products.find((p) => p.id === selectedPerfumeId);
      await submitMemory({
        perfume_id: selectedPerfumeId,
        perfume_name:
          language === "ar" && product?.name_ar
            ? product.name_ar
            : product?.name || "",
        memory_text: memoryText.trim(),
        author_name: authorName.trim() || undefined,
      });
      toast.success(t("memories.submitSuccess"));
      setOpen(false);
      setMemoryText("");
      setSelectedPerfumeId("");
      setAuthorName("");
    } catch {
      toast.error(t("memories.submitError"));
    } finally {
      setSubmitting(false);
    }
  };

  const row1 = memories.filter((_, i) => i % 2 === 0);
  const row2 = memories.filter((_, i) => i % 2 === 1);
  const isEmpty = memories.length === 0;

  return (
    <section className={isEmpty ? "py-8 overflow-hidden" : "py-16 overflow-hidden"}>
      {/* Compact empty state — preserve entry point without 800px of desert */}
      {isEmpty ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="container mx-auto px-4"
        >
          <div className="glass-card rounded-2xl px-5 py-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 max-w-2xl mx-auto">
            <div className="flex-1 text-center sm:text-start">
              <p className="text-[10px] sm:text-[11px] font-semibold tracking-[0.24em] uppercase text-warm mb-1">
                {t("memories.eyebrow")}
              </p>
              <p className="text-sm text-[#6B7B8D] dark:text-white/70 leading-snug">
                {t("memories.empty")}
              </p>
            </div>
            <Button
              onClick={() => setOpen(true)}
              size="sm"
              className="shrink-0 bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white rounded-xl glow-warm-hover"
            >
              <Plus className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
              {t("memories.shareButton")}
            </Button>
          </div>
        </motion.div>
      ) : (
        <>
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="container mx-auto px-4 mb-10 text-center"
          >
            <span className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-semibold tracking-[0.24em] uppercase text-warm mb-3">
              <span className="h-px w-6 bg-warm/60" aria-hidden />
              {t("memories.eyebrow")}
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-[#1E2A3D] dark:text-[#F5F5F5] mb-3 leading-[1.05]">
              {t("memories.title")}
            </h2>
            <p className="text-[#6B7B8D] dark:text-white/70 mb-6 max-w-prose mx-auto">{t("memories.subtitle")}</p>
            <Button
              onClick={() => setOpen(true)}
              className="bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white rounded-xl glow-warm-hover"
            >
              <Plus className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
              {t("memories.shareButton")}
            </Button>
          </motion.div>

          {/* Marquee rows */}
          <div className="space-y-3">
            {/* Row 1 — left to right */}
            <div className="overflow-hidden">
              <div className="flex gap-3 memory-marquee">
                {[...row1, ...row1].map((m, i) => (
                  <MemoryCard key={`r1-${i}`} memory={m} />
                ))}
              </div>
            </div>
            {/* Row 2 — right to left */}
            {row2.length > 0 && (
              <div className="overflow-hidden">
                <div className="flex gap-3 memory-marquee-reverse">
                  {[...row2, ...row2].map((m, i) => (
                    <MemoryCard key={`r2-${i}`} memory={m} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Submit modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-card border-[#5B8DD9]/20 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#F5F5F5]">
              {t("memories.modalTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Select
              value={selectedPerfumeId}
              onValueChange={setSelectedPerfumeId}
            >
              <SelectTrigger className="glass border-[#5B8DD9]/20 bg-transparent">
                <SelectValue placeholder={t("memories.selectPerfume")} />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {language === "ar" && p.name_ar ? p.name_ar : p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <textarea
              className="w-full bg-transparent glass border border-[#5B8DD9]/20 rounded-xl p-3 text-sm resize-none h-24 text-[#F5F5F5] placeholder-[#6B7B8D] focus:outline-none focus:border-[#5B8DD9]/50"
              placeholder={t("memories.placeholder")}
              value={memoryText}
              onChange={(e) =>
                setMemoryText(e.target.value.slice(0, 120))
              }
              maxLength={120}
              dir={isRTL ? "rtl" : "ltr"}
            />

            <div className="flex items-center justify-between gap-3">
              <input
                className="flex-1 bg-transparent glass border border-[#5B8DD9]/20 rounded-xl px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#6B7B8D] focus:outline-none focus:border-[#5B8DD9]/50"
                placeholder={t("memories.namePlaceholder")}
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                dir={isRTL ? "rtl" : "ltr"}
              />
              <span className="text-xs text-[#6B7B8D] flex-shrink-0">
                {memoryText.length}/120
              </span>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white rounded-xl hover:opacity-90 disabled:opacity-50"
            >
              <Send className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
              {submitting ? "..." : t("memories.submit")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
