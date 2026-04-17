import { useEffect } from "react";
import { useGiftOrders } from "../hooks/useGiftOrders";
import { GiftOrdersTab } from "../tabs/GiftOrdersTab";

export default function GiftOrdersPage() {
  const giftOrdersApi = useGiftOrders();

  useEffect(() => {
    giftOrdersApi.fetchGiftOrders();
  }, []);

  return <GiftOrdersTab giftOrdersApi={giftOrdersApi} />;
}
