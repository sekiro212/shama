import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface ImageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null;
}

export function ImageModal({ open, onOpenChange, imageUrl }: ImageModalProps) {
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card bg-[#F8F9FB] dark:bg-[#1a2235] border-[#323D50]/10 dark:border-white/10 text-[#323D50] dark:text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="gradient-text">
            {t("admin.imageDialog.title")}
          </DialogTitle>
        </DialogHeader>

        {imageUrl && (
          <div className="flex justify-center p-4">
            <img
              src={imageUrl}
              alt="Product"
              className="max-w-full max-h-96 object-contain rounded-lg border border-[#323D50]/15 dark:border-white/20"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src =
                  "https://via.placeholder.com/400x400/333/fff?text=Image+Not+Found";
              }}
            />
          </div>
        )}

        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-[#323D50]/15 dark:border-white/20 text-white hover:bg-white/10"
          >
            {t("admin.orderDetails.close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
