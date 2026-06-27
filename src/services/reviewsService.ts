/**
 * reviewsService.ts
 * -----------------
 * طبقة الخدمة لمراجعات المنتجات (جدول `reviews`). تتولّى:
 *  - القراءات العامة (تُعرض فقط المراجعات "approved" في صفحة المنتج)
 *  - قيام المستخدم بجلب/إرسال مراجعته الوحيدة لكل عطر
 *  - إشراف المسؤول (سرد الكل، الموافقة، الحذف) وشارة عدّاد المعلّقة
 *
 * يعيد trigger في قاعدة البيانات احتساب متوسط `rating` لكل عطر عند تغيّر
 * المراجعات، ويفرض قيد فريد (perfume_id, user_id) مراجعةً واحدة لكل مستخدم
 * لكل منتج. تكون المراجعات الجديدة افتراضيًا "pending" حتى الموافقة (AI أو مسؤول).
 */
import { supabase } from "@/lib/supabase";

export type ReviewStatus = "pending" | "approved";

export interface Review {
  id: string;
  perfume_id: string;
  user_id: string;
  user_email: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  ai_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewReviewPayload {
  perfume_id: string;
  user_id: string;
  user_email: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  ai_reason?: string | null;
}

/**
 * عام: يجلب المراجعات المرئية (المعتمدة) لمنتج، الأحدث أولًا.
 * @param perfumeId معرّف العطر (id).
 * @returns المراجعات المعتمدة؛ [] عند الخطأ.
 */
export async function fetchApprovedReviews(perfumeId: string): Promise<Review[]> {
  try {
    // الصفوف "approved" فقط عامة؛ تبقى المعلّقة مخفية حتى يُشرف عليها.
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("perfume_id", perfumeId)
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching approved reviews:", error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error("Error fetching approved reviews:", error);
    return [];
  }
}

export async function fetchUserReview(
  perfumeId: string,
  userId: string
): Promise<Review | null> {
  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("perfume_id", perfumeId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching user review:", error);
      return null;
    }
    return data || null;
  } catch (error) {
    console.error("Error fetching user review:", error);
    return null;
  }
}

export async function submitReview(payload: NewReviewPayload): Promise<Review> {
  const { data, error } = await supabase
    .from("reviews")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("ALREADY_REVIEWED");
    }
    throw error;
  }
  return data;
}

export async function fetchAllReviews(): Promise<
  (Review & { perfume_name: string })[]
> {
  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("*, perfumes(name)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching all reviews:", error);
      return [];
    }

    return (data || []).map((r: any) => ({
      ...r,
      perfume_name: r.perfumes?.name || "",
    }));
  } catch (error) {
    console.error("Error fetching all reviews:", error);
    return [];
  }
}

export async function approveReview(reviewId: string): Promise<void> {
  const { error } = await supabase
    .from("reviews")
    .update({ status: "approved" })
    .eq("id", reviewId);

  if (error) throw error;
}

export async function deleteReview(reviewId: string): Promise<void> {
  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("id", reviewId);

  if (error) throw error;
}

export async function fetchPendingReviewCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
}
