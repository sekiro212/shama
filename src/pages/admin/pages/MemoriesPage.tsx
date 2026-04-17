import { useEffect } from "react";
import { useMemories } from "../hooks/useMemories";
import { MemoriesTab } from "../tabs/MemoriesTab";

export default function MemoriesPage() {
  const memoriesApi = useMemories();

  useEffect(() => {
    memoriesApi.loadMemories();
  }, []);

  return <MemoriesTab memoriesApi={memoriesApi} />;
}
