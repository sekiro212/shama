import { useEffect } from "react";
import { usePerfumes } from "../hooks/usePerfumes";
import { useAdminEvent } from "../contexts/AdminEventContext";
import { PerfumesTab } from "../tabs/PerfumesTab";
import { PerfumeFormDialog } from "../dialogs/PerfumeFormDialog";

export default function PerfumesPage() {
  const perfumesApi = usePerfumes();

  useEffect(() => {
    perfumesApi.loadPerfumes();
  }, []);

  useAdminEvent("stock-mutated", () => {
    perfumesApi.loadPerfumes();
  });

  return (
    <>
      <PerfumesTab perfumesApi={perfumesApi} />
      <PerfumeFormDialog perfumesApi={perfumesApi} />
    </>
  );
}
