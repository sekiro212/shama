import { supabase } from "@/lib/supabase";

export interface Memory {
  id: string;
  perfume_id: string | null;
  perfume_name: string;
  memory_text: string;
  author_name?: string;
  status: "pending" | "approved";
  created_at: string;
}

export const fetchApprovedMemories = async (): Promise<Memory[]> => {
  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) {
    console.error("Error fetching memories:", error);
    return [];
  }
  return data || [];
};

export const submitMemory = async (payload: {
  perfume_id: string;
  perfume_name: string;
  memory_text: string;
  author_name?: string;
}): Promise<void> => {
  const { error } = await supabase.from("memories").insert([
    { ...payload, status: "pending" },
  ]);
  if (error) throw error;
};

export const fetchAllMemories = async (): Promise<Memory[]> => {
  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Error fetching all memories:", error);
    return [];
  }
  return data || [];
};

export const approveMemory = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("memories")
    .update({ status: "approved" })
    .eq("id", id);
  if (error) throw error;
};

export const deleteMemory = async (id: string): Promise<void> => {
  const { error } = await supabase.from("memories").delete().eq("id", id);
  if (error) throw error;
};

export const fetchPendingMemoryCount = async (): Promise<number> => {
  const { count, error } = await supabase
    .from("memories")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) return 0;
  return count ?? 0;
};
