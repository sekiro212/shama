import { useEffect } from "react";
import { usePerfumes } from "../hooks/usePerfumes";
import { useCoupons } from "../hooks/useCoupons";
import { CouponsTab } from "../tabs/CouponsTab";
import { CouponFormDialog } from "../dialogs/CouponFormDialog";

export default function CouponsPage() {
  const perfumesApi = usePerfumes();
  const couponsApi = useCoupons({ perfumes: perfumesApi.perfumes });

  useEffect(() => {
    perfumesApi.loadPerfumes();
    couponsApi.loadCoupons();
  }, []);

  return (
    <>
      <CouponsTab couponsApi={couponsApi} />
      <CouponFormDialog couponsApi={couponsApi} perfumes={perfumesApi.perfumes} />
    </>
  );
}
