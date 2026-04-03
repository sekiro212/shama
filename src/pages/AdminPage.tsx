import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Package,
  AlertCircle,
  CheckCircle,
  Search,
  Eye,
  EyeOff,
  ShoppingCart,
  DollarSign,
  Lock,
  LogOut,
  Upload,
  Image as ImageIcon,
  Star,
  Check,
  RotateCcw,
  Sparkles,
  Truck,
  ClipboardCheck,
  Gift,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  authenticateAdmin,
  isAdminAuthenticated,
  getCurrentAdmin,
  logoutAdmin,
  LoginCredentials,
} from "@/services/authService";
import {
  fetchOrders,
  getOrderStats,
  deleteOrder,
  updateOrderStatus,
  saveVanexPackageCode,
  Order,
  OrderStats,
} from "@/services/ordersService";
import { createVanexPackage } from "@/services/vanexService";
import { generateProductDescription } from "@/services/aiService";
import {
  fetchAllReviews,
  approveReview,
  deleteReview,
  fetchPendingReviewCount,
  Review,
} from "@/services/reviewsService";
import {
  uploadPerfumeImage,
  deletePerfumeImage,
  getPerfumeImages,
  setPrimaryImage,
  validateImageFile,
  PerfumeImage,
} from "@/services/imageService";
import {
  fetchAllMemories,
  approveMemory,
  deleteMemory,
  fetchPendingMemoryCount,
  Memory,
} from "@/services/memoriesService";

interface PerfumeSample {
  id: string;
  size: string;
  price: number;
  stock_quantity: number;
  is_active: boolean;
}

interface PerfumeBottleSize {
  id: string;
  size: string;
  price: number;
  stock_quantity: number;
  is_active: boolean;
}

interface Perfume {
  id: string;
  name: string;
  name_ar: string;
  price: number;
  description: string;
  description_ar: string;
  fragrance_notes: {
    top: string[];
    middle: string[];
    base: string[];
  };
  fragrance_notes_ar: {
    top: string[];
    middle: string[];
    base: string[];
  };
  size: string;
  type: "bottle" | "sample" | "gift";
  rating: number;
  gender: "men" | "women" | "unisex";
  stock_quantity: number;
  is_active: boolean;
  has_samples: boolean;
  has_bottle_sizes: boolean;
  created_at: string;
  updated_at: string;
  images?: PerfumeImage[];
  samples?: PerfumeSample[];
  bottle_sizes?: PerfumeBottleSize[];
}

interface CustomGiftOrder {
  id: string;
  user_id: string | null;
  products: { id: string; name: string; price: number; image: string | null }[];
  occasion: string;
  box_color: string;
  wrapping_style: string;
  message_card: string | null;
  recipient_name: string | null;
  delivery_date: string | null;
  generated_image_url: string | null;
  image_style: string;
  status: string;
  total_price: number;
  created_at: string;
}

const initialPerfumeData: Omit<Perfume, "id" | "created_at" | "updated_at"> = {
  name: "",
  name_ar: "",
  price: 0,
  description: "",
  description_ar: "",
  fragrance_notes: {
    top: [],
    middle: [],
    base: [],
  },
  fragrance_notes_ar: {
    top: [],
    middle: [],
    base: [],
  },
  size: "",
  type: "bottle",
  rating: 4.5,
  gender: "unisex",
  stock_quantity: 0,
  is_active: true,
  has_samples: false,
  has_bottle_sizes: false,
};

export default function AdminPage() {
  const { t, isRTL } = useLanguage();

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [loginCredentials, setLoginCredentials] = useState<LoginCredentials>({
    username: "",
    password: "",
  });
  const [loginLoading, setLoginLoading] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Data states
  const [perfumes, setPerfumes] = useState<Perfume[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderStats, setOrderStats] = useState<OrderStats>({
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    topCities: [],
    recentOrders: [],
  });
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);

  // Perfume management states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<
    "all" | "bottle" | "sample" | "gift"
  >("all");
  const [filterGender, setFilterGender] = useState<
    "all" | "men" | "women" | "unisex"
  >("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPerfume, setEditingPerfume] = useState<Perfume | null>(null);
  const [formData, setFormData] = useState(initialPerfumeData);
  const [topNotes, setTopNotes] = useState("");
  const [middleNotes, setMiddleNotes] = useState("");
  const [baseNotes, setBaseNotes] = useState("");

  // Image management states
  const [perfumeImages, setPerfumeImages] = useState<PerfumeImage[]>([]);
  const [imageUploading, setImageUploading] = useState(false);
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sample management states
  const [perfumeSamples, setPerfumeSamples] = useState<PerfumeSample[]>([]);
  const [sampleSizes] = useState([
    "3ml",
    "5ml",
    "10ml",
    "15ml",
    "20ml",
    "25ml",
    "30ml",
  ]);

  // Bottle size management states
  const [perfumeBottleSizes, setPerfumeBottleSizes] = useState<
    PerfumeBottleSize[]
  >([]);
  const [bottleSizes] = useState([
    "30ml",
    "50ml",
    "75ml",
    "100ml",
    "125ml",
    "150ml",
    "200ml",
  ]);

  // Button loading states
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deletingPerfume, setDeletingPerfume] = useState<string | null>(null);
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null);
  const [acceptingOrder, setAcceptingOrder] = useState<string | null>(null);
  const [returningOrder, setReturningOrder] = useState<string | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<string | null>(null);
  const [sendingToVanex, setSendingToVanex] = useState<string | null>(null);
  const [settingPrimary, setSettingPrimary] = useState<string | null>(null);
  const [deletingImage, setDeletingImage] = useState<string | null>(null);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [updatingOrderStatus, setUpdatingOrderStatus] = useState<string | null>(null);
  const [reviews, setReviews] = useState<(Review & { perfume_name: string })[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [memoriesLoading, setMemoriesLoading] = useState(false);
  const [pendingMemoryCount, setPendingMemoryCount] = useState(0);
  const [approvingReview, setApprovingReview] = useState<string | null>(null);
  const [deletingReview, setDeletingReview] = useState<string | null>(null);
  const [giftOrders, setGiftOrders] = useState<CustomGiftOrder[]>([]);
  const [giftOrdersLoading, setGiftOrdersLoading] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAdminAuthenticated();
      setIsAuthenticated(authenticated);

      if (authenticated) {
        const admin = getCurrentAdmin();
        setCurrentAdmin(admin);
        loadData();
      } else {
        setShowLoginDialog(true);
      }
    };

    checkAuth();
  }, []);

  const loadData = async () => {
    await Promise.all([loadPerfumes(), loadOrders(), loadOrderStats(), loadReviews(), fetchGiftOrders(), loadMemories()]);
  };

  const fetchGiftOrders = async () => {
    setGiftOrdersLoading(true);
    try {
      const { data, error } = await supabase
        .from("custom_gift_orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setGiftOrders(data ?? []);
    } catch (err) {
      console.error("Failed to fetch gift orders:", err);
      toast.error("Failed to load gift orders");
    } finally {
      setGiftOrdersLoading(false);
    }
  };

  const loadReviews = async () => {
    setReviewsLoading(true);
    try {
      const [allReviews, pendingCount] = await Promise.all([
        fetchAllReviews(),
        fetchPendingReviewCount(),
      ]);
      setReviews(allReviews);
      setPendingReviewCount(pendingCount);
    } catch {
      toast.error(t("admin.reviews.toast.loadFailed"));
    } finally {
      setReviewsLoading(false);
    }
  };

  const loadMemories = async () => {
    setMemoriesLoading(true);
    try {
      const [allMemories, pendingCount] = await Promise.all([
        fetchAllMemories(),
        fetchPendingMemoryCount(),
      ]);
      setMemories(allMemories);
      setPendingMemoryCount(pendingCount);
    } catch {
      toast.error(t("admin.memories.toast.loadFailed"));
    } finally {
      setMemoriesLoading(false);
    }
  };

  const handleApproveMemory = async (id: string) => {
    try {
      await approveMemory(id);
      await loadMemories();
      toast.success(t("admin.memories.toast.approved"));
    } catch {
      toast.error(t("admin.memories.toast.approveFailed"));
    }
  };

  const handleDeleteMemory = async (id: string) => {
    if (!window.confirm(t("admin.memories.confirm.delete"))) return;
    try {
      await deleteMemory(id);
      await loadMemories();
      toast.success(t("admin.memories.toast.deleted"));
    } catch {
      toast.error(t("admin.memories.toast.deleteFailed"));
    }
  };

  const handleApproveReview = async (reviewId: string) => {
    setApprovingReview(reviewId);
    try {
      await approveReview(reviewId);
      await loadReviews();
      toast.success(t("admin.reviews.toast.approved"));
    } catch {
      toast.error(t("admin.reviews.toast.approveFailed"));
    } finally {
      setApprovingReview(null);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm(t("admin.reviews.confirm.delete"))) return;
    setDeletingReview(reviewId);
    try {
      await deleteReview(reviewId);
      await loadReviews();
      toast.success(t("admin.reviews.toast.deleted"));
    } catch {
      toast.error(t("admin.reviews.toast.deleteFailed"));
    } finally {
      setDeletingReview(null);
    }
  };

  const loadPerfumes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("perfumes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Load images for each perfume
      const perfumesWithImages = await Promise.all(
        (data || []).map(async (perfume) => {
          const images = await getPerfumeImages(perfume.id);
          return {
            ...perfume,
            images,
          };
        })
      );

      setPerfumes(perfumesWithImages);
    } catch (error) {
      console.error("Error loading perfumes:", error);
      toast.error(t("admin.toast.loadPerfumesFailed"));
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      setOrdersLoading(true);
      const fetchedOrders = await fetchOrders();
      setOrders(fetchedOrders);
    } catch (error) {
      console.error("Error loading orders:", error);
      toast.error(t("admin.toast.loadOrdersFailed"));
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadOrderStats = async () => {
    try {
      const stats = await getOrderStats();
      setOrderStats(stats);
    } catch (error) {
      console.error("Error loading order stats:", error);
    }
  };

  const handleLogin = async () => {
    try {
      setLoginLoading(true);
      const result = await authenticateAdmin(loginCredentials);

      if (result.success && result.user) {
        setIsAuthenticated(true);
        setCurrentAdmin(result.user);
        setShowLoginDialog(false);
        setLoginCredentials({ username: "", password: "" });
        toast.success(t("admin.login.loginSuccess"));
        loadData();
      } else {
        toast.error(result.error || t("admin.login.loginFailed"));
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error(t("admin.login.loginFailed"));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    logoutAdmin();
    setIsAuthenticated(false);
    setCurrentAdmin(null);
    setShowLoginDialog(true);
    toast.success(t("admin.logoutSuccess"));
  };

  const handleDeleteOrder = async (id: string) => {
    if (!confirm(t("admin.confirm.deleteOrder"))) return;

    try {
      setDeletingOrder(id);
      const success = await deleteOrder(id);
      if (success) {
        toast.success(t("admin.toast.orderDeletedSuccess"));
        loadOrders();
        loadOrderStats();
      } else {
        toast.error(t("admin.toast.orderDeleteFailed"));
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error(t("admin.toast.orderDeleteFailed"));
    } finally {
      setDeletingOrder(null);
    }
  };

  const handleSendToVanex = async (order: Order) => {
    if (!confirm("Send this order to Vanex? This will create a delivery package and mark the order as Shipped.")) return;

    try {
      setSendingToVanex(order.id);
      const packageCode = await createVanexPackage(order);

      if (!packageCode) {
        toast.error("Failed to create Vanex package. Check your token and order data.");
        return;
      }

      const saved = await saveVanexPackageCode(order.id, packageCode);
      if (!saved) {
        toast.error("Package created but failed to save code. Code: " + packageCode);
        return;
      }

      toast.success(`Sent to Vanex! Package code: ${packageCode}`);
      loadOrders();
      loadOrderStats();
    } catch (error) {
      console.error("Error sending to Vanex:", error);
      toast.error("Error sending to Vanex.");
    } finally {
      setSendingToVanex(null);
    }
  };

  const handleAcceptOrder = async (order: Order) => {
    if (!confirm(t("admin.confirm.acceptOrder"))) return;

    try {
      setAcceptingOrder(order.id);

      // Update order status to accepted
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          status: "accepted",
          processed_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (orderError) throw orderError;

      // Update stock quantities for each item
      for (const item of order.items) {
        const { data: perfume, error: fetchError } = await supabase
          .from("perfumes")
          .select("stock_quantity")
          .eq("id", item.id)
          .single();

        if (fetchError) throw fetchError;

        const newStock = perfume.stock_quantity - item.quantity;

        // Update stock and set inactive if stock reaches 0
        const { error: updateError } = await supabase
          .from("perfumes")
          .update({
            stock_quantity: newStock,
            is_active: newStock > 0,
          })
          .eq("id", item.id);

        if (updateError) throw updateError;
      }

      toast.success(t("admin.toast.orderAcceptedSuccess"));
      loadOrders();
      loadOrderStats();
      loadPerfumes();
    } catch (error) {
      console.error("Error accepting order:", error);
      toast.error(t("admin.toast.orderAcceptFailed"));
    } finally {
      setAcceptingOrder(null);
    }
  };

  const handleBackOrder = async (order: Order) => {
    if (!confirm(t("admin.confirm.returnOrder"))) return;

    try {
      setReturningOrder(order.id);

      // Update order status to returned
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          status: "returned",
          processed_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (orderError) throw orderError;

      // Update stock quantities for each item (increase)
      for (const item of order.items) {
        const { data: perfume, error: fetchError } = await supabase
          .from("perfumes")
          .select("stock_quantity")
          .eq("id", item.id)
          .single();

        if (fetchError) throw fetchError;

        const newStock = perfume.stock_quantity + item.quantity;

        // Update stock and set active if it was inactive
        const { error: updateError } = await supabase
          .from("perfumes")
          .update({
            stock_quantity: newStock,
            is_active: true,
          })
          .eq("id", item.id);

        if (updateError) throw updateError;
      }

      toast.success(t("admin.toast.returnProcessedSuccess"));
      loadOrders();
      loadOrderStats();
      loadPerfumes();
    } catch (error) {
      console.error("Error processing return:", error);
      toast.error(t("admin.toast.returnProcessFailed"));
    } finally {
      setReturningOrder(null);
    }
  };

  const handleViewOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const handleGenerateDescription = async () => {
    if (!formData.name) {
      toast.error(t("admin.toast.enterPerfumeName"));
      return;
    }

    try {
      setGeneratingDescription(true);
      const notes = {
        top: topNotes.split(",").map((n) => n.trim()).filter(Boolean),
        middle: middleNotes.split(",").map((n) => n.trim()).filter(Boolean),
        base: baseNotes.split(",").map((n) => n.trim()).filter(Boolean),
      };
      const description = await generateProductDescription(
        formData.name,
        notes,
        formData.gender
      );
      handleInputChange("description", description);
      toast.success(t("admin.toast.aiDescriptionGenerated"));
    } catch (error) {
      console.error("Error generating description:", error);
      toast.error(t("admin.toast.aiDescriptionFailed"));
    } finally {
      setGeneratingDescription(false);
    }
  };

  const handleStatusChange = async (order: Order, newStatus: Order["status"]) => {
    try {
      setUpdatingOrderStatus(order.id);
      const success = await updateOrderStatus(order.id, newStatus);
      if (success) {
        toast.success(`${t("admin.toast.orderStatusUpdated")} ${t("admin.status." + newStatus)}`);
        loadOrders();
        loadOrderStats();
      } else {
        toast.error(t("admin.toast.orderStatusFailed"));
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error(t("admin.toast.orderStatusFailed"));
    } finally {
      setUpdatingOrderStatus(null);
    }
  };

  // Perfume CRUD operations (keeping existing ones)
  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name || !formData.price || !formData.description) {
        toast.error(t("admin.toast.fillRequiredFields"));
        return;
      }

      // Validate bottle sizes if enabled
      if (formData.has_bottle_sizes && perfumeBottleSizes.length > 0) {
        for (const bottleSize of perfumeBottleSizes) {
          if (!bottleSize.price || bottleSize.price <= 0) {
            toast.error(`${t("admin.toast.invalidPrice")} ${bottleSize.size}`);
            return;
          }
          if (bottleSize.stock_quantity < 0) {
            toast.error(
              `${t("admin.toast.invalidStock")} ${bottleSize.size}`
            );
            return;
          }
        }
      }

      // Ensure bottle size perfumes are type "bottle"
      if (formData.has_bottle_sizes && formData.type !== "bottle") {
        toast.error(t("admin.toast.bottleSizeTypeError"));
        return;
      }

      setSubmitLoading(true);

      const fragranceNotes = {
        top: topNotes
          .split(",")
          .map((note) => note.trim())
          .filter(Boolean),
        middle: middleNotes
          .split(",")
          .map((note) => note.trim())
          .filter(Boolean),
        base: baseNotes
          .split(",")
          .map((note) => note.trim())
          .filter(Boolean),
      };

      const perfumeData = {
        ...formData,
        fragrance_notes: fragranceNotes,
        // Ensure type is bottle when bottle sizes are enabled
        type: formData.has_bottle_sizes ? "bottle" : formData.type,
      };

      let result;
      if (editingPerfume) {
        result = await supabase
          .from("perfumes")
          .update(perfumeData)
          .eq("id", editingPerfume.id)
          .select();
      } else {
        result = await supabase
          .from("perfumes")
          .insert([{ ...perfumeData, image: "dsf" }])
          .select();
      }

      if (result.error) throw result.error;

      console.log("Perfume created/updated:", result.data?.[0]);

      // If creating a new perfume and there are pending images, upload them
      if (!editingPerfume && pendingImages.length > 0 && result.data?.[0]?.id) {
        await uploadPendingImages(result.data[0].id);
      }

      // Handle samples
      if (
        formData.has_samples &&
        perfumeSamples.length > 0 &&
        result.data?.[0]?.id
      ) {
        const perfumeId = result.data[0].id;

        if (editingPerfume) {
          // For editing: Delete existing samples first, then insert updated ones
          const { error: deleteError } = await supabase
            .from("perfume_samples")
            .delete()
            .eq("perfume_id", perfumeId);

          if (deleteError) {
            console.error("Error deleting existing samples:", deleteError);
            toast.error(t("admin.toast.bottleSizesUpdateFailed"));
            return;
          }
        }

        // Insert/update samples
        const samplesToInsert = perfumeSamples.map((sample) => ({
          perfume_id: perfumeId,
          size: sample.size,
          price: sample.price,
          stock_quantity: sample.stock_quantity,
          is_active: sample.is_active,
        }));

        const { error: samplesError } = await supabase
          .from("perfume_samples")
          .insert(samplesToInsert);

        if (samplesError) {
          console.error("Error inserting samples:", samplesError);
          toast.error(t("admin.toast.samplesSaveFailed"));
        } else {
          console.log("Samples saved successfully:", samplesToInsert.length);
        }
      } else if (editingPerfume && !formData.has_samples) {
        // If editing and samples are disabled, delete all existing samples
        const perfumeId = result.data?.[0]?.id;
        if (perfumeId) {
          const { error: deleteError } = await supabase
            .from("perfume_samples")
            .delete()
            .eq("perfume_id", perfumeId);

          if (deleteError) {
            console.error("Error deleting samples:", deleteError);
            toast.error(t("admin.toast.samplesRemoveFailed"));
          }
        }
      }

      // Handle bottle sizes
      console.log("Bottle size handling debug:", {
        has_bottle_sizes: formData.has_bottle_sizes,
        perfumeBottleSizes_length: perfumeBottleSizes.length,
        perfumeBottleSizes: perfumeBottleSizes,
        result_data_id: result.data?.[0]?.id,
      });

      if (
        formData.has_bottle_sizes &&
        perfumeBottleSizes.length > 0 &&
        result.data?.[0]?.id
      ) {
        const perfumeId = result.data[0].id;

        if (editingPerfume) {
          // For editing: Delete existing bottle sizes first, then insert updated ones
          const { error: deleteError } = await supabase
            .from("perfume_bottle_sizes")
            .delete()
            .eq("perfume_id", perfumeId);

          if (deleteError) {
            console.error("Error deleting existing bottle sizes:", deleteError);
            toast.error(t("admin.toast.bottleSizesUpdateFailed"));
            return;
          }
        }

        // Insert/update bottle sizes
        const bottleSizesToInsert = perfumeBottleSizes.map((bottleSize) => ({
          perfume_id: perfumeId,
          size: bottleSize.size,
          price: bottleSize.price,
          stock_quantity: bottleSize.stock_quantity,
          is_active: bottleSize.is_active,
        }));

        console.log("Attempting to insert bottle sizes:", bottleSizesToInsert);

        const { data: insertedBottleSizes, error: bottleSizesError } =
          await supabase
            .from("perfume_bottle_sizes")
            .insert(bottleSizesToInsert)
            .select();

        if (bottleSizesError) {
          console.error("Error inserting bottle sizes:", bottleSizesError);
          toast.error(t("admin.toast.bottleSizesSaveFailed"));
        } else {
          console.log(
            "Bottle sizes created successfully:",
            insertedBottleSizes
          );
          toast.success(
            `${insertedBottleSizes?.length || 0} ${t("admin.toast.bottleSizesSaved")}`
          );
        }
      } else if (editingPerfume && !formData.has_bottle_sizes) {
        // If editing and bottle sizes are disabled, delete all existing bottle sizes
        const perfumeId = result.data?.[0]?.id;
        if (perfumeId) {
          const { error: deleteError } = await supabase
            .from("perfume_bottle_sizes")
            .delete()
            .eq("perfume_id", perfumeId);

          if (deleteError) {
            console.error("Error deleting bottle sizes:", deleteError);
            toast.error(t("admin.toast.bottleSizesRemoveFailed"));
          }
        }
      } else if (formData.has_bottle_sizes && perfumeBottleSizes.length === 0) {
        console.warn("Bottle sizes enabled but no bottle sizes provided");
        toast.warning(t("admin.toast.bottleSizesNoSizes"));
      } else {
        console.log("Bottle sizes not handled because:", {
          has_bottle_sizes: formData.has_bottle_sizes,
          perfumeBottleSizes_length: perfumeBottleSizes.length,
          has_result_id: !!result.data?.[0]?.id,
        });
      }

      toast.success(
        editingPerfume
          ? t("admin.toast.perfumeUpdatedSuccess")
          : t("admin.toast.perfumeCreatedSuccess")
      );
      setIsDialogOpen(false);
      resetForm();
      loadPerfumes();
    } catch (error) {
      console.error("Error saving perfume:", error);
      toast.error(t("admin.toast.perfumeSaveFailed"));
    } finally {
      setSubmitLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(initialPerfumeData);
    setTopNotes("");
    setMiddleNotes("");
    setBaseNotes("");
    setEditingPerfume(null);
    setPerfumeImages([]);
    setPendingImages([]);
    setPerfumeSamples([]);
    setPerfumeBottleSizes([]);
  };

  // Image management functions
  const loadPerfumeImages = async (perfumeId: string) => {
    try {
      const images = await getPerfumeImages(perfumeId);
      setPerfumeImages(images);
    } catch (error) {
      console.error("Error loading perfume images:", error);
    }
  };

  const loadPerfumeSamples = async (perfumeId: string) => {
    try {
      const { data, error } = await supabase
        .from("perfume_samples")
        .select("*")
        .eq("perfume_id", perfumeId)
        .order("size");

      if (error) throw error;
      setPerfumeSamples(data || []);
    } catch (error) {
      console.error("Error loading perfume samples:", error);
    }
  };

  const loadPerfumeBottleSizes = async (perfumeId: string) => {
    try {
      console.log("Loading bottle sizes for perfume:", perfumeId);
      const { data, error } = await supabase
        .from("perfume_bottle_sizes")
        .select("*")
        .eq("perfume_id", perfumeId)
        .order("size");

      if (error) throw error;
      console.log("Loaded bottle sizes:", data);
      setPerfumeBottleSizes(data || []);
    } catch (error) {
      console.error("Error loading perfume bottle sizes:", error);
    }
  };

  const addSample = () => {
    const newSample: Omit<PerfumeSample, "id"> = {
      size: "3ml",
      price: 0,
      stock_quantity: 0,
      is_active: true,
    };
    setPerfumeSamples([...perfumeSamples, newSample as PerfumeSample]);
  };

  const removeSample = (index: number) => {
    setPerfumeSamples(perfumeSamples.filter((_, i) => i !== index));
  };

  const updateSample = (
    index: number,
    field: keyof PerfumeSample,
    value: any
  ) => {
    const updatedSamples = [...perfumeSamples];
    updatedSamples[index] = { ...updatedSamples[index], [field]: value };
    setPerfumeSamples(updatedSamples);
  };

  const addBottleSize = () => {
    const newBottleSize: Omit<PerfumeBottleSize, "id"> = {
      size: "50ml",
      price: 0,
      stock_quantity: 0,
      is_active: true,
    };
    setPerfumeBottleSizes([
      ...perfumeBottleSizes,
      newBottleSize as PerfumeBottleSize,
    ]);
  };

  const removeBottleSize = (index: number) => {
    setPerfumeBottleSizes(perfumeBottleSizes.filter((_, i) => i !== index));
  };

  const updateBottleSize = (
    index: number,
    field: keyof PerfumeBottleSize,
    value: any
  ) => {
    const updatedBottleSizes = [...perfumeBottleSizes];
    updatedBottleSizes[index] = {
      ...updatedBottleSizes[index],
      [field]: value,
    };
    setPerfumeBottleSizes(updatedBottleSizes);
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // If editing an existing perfume, upload images directly
    if (editingPerfume) {
      const perfumeId = editingPerfume.id;
      setImageUploading(true);

      const uploadPromises = Array.from(files).map(async (file) => {
        const validationError = validateImageFile(file);
        if (validationError) {
          toast.error(validationError);
          return null;
        }

        const isPrimary = perfumeImages.length === 0; // First image is primary
        return await uploadPerfumeImage(perfumeId, file, isPrimary);
      });

      try {
        const results = await Promise.all(uploadPromises);
        const successfulUploads = results.filter(Boolean) as PerfumeImage[];

        if (successfulUploads.length > 0) {
          await loadPerfumeImages(perfumeId);
          await loadPerfumes(); // Refresh perfumes list
        }
      } catch (error) {
        console.error("Error uploading images:", error);
        toast.error(t("admin.toast.imageUploadFailed"));
      } finally {
        setImageUploading(false);
      }
    } else {
      // If creating a new perfume, store images temporarily
      const validFiles = Array.from(files).filter((file) => {
        const validationError = validateImageFile(file);
        if (validationError) {
          toast.error(validationError);
          return false;
        }
        return true;
      });

      if (validFiles.length > 0) {
        setPendingImages((prev) => [...prev, ...validFiles]);
        toast.success(`${validFiles.length} ${t("admin.toast.imagesReadyToUpload")}`);
      }
    }
  };

  const uploadPendingImages = async (perfumeId: string) => {
    if (pendingImages.length === 0) return;

    setImageUploading(true);
    const uploadPromises = pendingImages.map(async (file, index) => {
      const isPrimary = index === 0; // First image is primary
      return await uploadPerfumeImage(perfumeId, file, isPrimary);
    });

    try {
      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter(Boolean) as PerfumeImage[];

      if (successfulUploads.length > 0) {
        toast.success(
          `${successfulUploads.length} ${t("admin.toast.imagesUploadedSuccess")}`
        );
      }
    } catch (error) {
      console.error("Error uploading pending images:", error);
      toast.error(t("admin.toast.imageUploadFailed"));
    } finally {
      setImageUploading(false);
    }
  };

  const removePendingImage = (index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImageDelete = async (imageId: string) => {
    if (!confirm(t("admin.confirm.deleteImage"))) return;

    try {
      setDeletingImage(imageId);
      const success = await deletePerfumeImage(imageId);
      if (success && editingPerfume) {
        await loadPerfumeImages(editingPerfume.id);
        await loadPerfumes(); // Refresh perfumes list
      }
    } catch (error) {
      console.error("Error deleting image:", error);
    } finally {
      setDeletingImage(null);
    }
  };

  const handleSetPrimaryImage = async (imageId: string) => {
    try {
      setSettingPrimary(imageId);
      const success = await setPrimaryImage(imageId);
      if (success && editingPerfume) {
        await loadPerfumeImages(editingPerfume.id);
        await loadPerfumes(); // Refresh perfumes list
      }
    } catch (error) {
      console.error("Error setting primary image:", error);
    } finally {
      setSettingPrimary(null);
    }
  };

  const handleEdit = (perfume: Perfume) => {
    console.log("Editing perfume:", perfume);
    setEditingPerfume(perfume);
    setFormData({
      name: perfume.name,
      name_ar: perfume.name_ar || "",
      price: perfume.price,
      description: perfume.description,
      description_ar: perfume.description_ar || "",
      fragrance_notes: perfume.fragrance_notes,
      fragrance_notes_ar: perfume.fragrance_notes_ar || { top: [], middle: [], base: [] },
      size: perfume.size,
      type: perfume.type,
      rating: perfume.rating,
      gender: perfume.gender,
      stock_quantity: perfume.stock_quantity,
      is_active: perfume.is_active,
      has_samples: perfume.has_samples,
      has_bottle_sizes: perfume.has_bottle_sizes,
    });
    setTopNotes(perfume.fragrance_notes.top.join(", "));
    setMiddleNotes(perfume.fragrance_notes.middle.join(", "));
    setBaseNotes(perfume.fragrance_notes.base.join(", "));

    // Load images, samples, and bottle sizes for this perfume
    loadPerfumeImages(perfume.id);
    loadPerfumeSamples(perfume.id);
    loadPerfumeBottleSizes(perfume.id);

    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("admin.confirm.deletePerfume"))) return;

    try {
      setDeletingPerfume(id);
      const { error } = await supabase.from("perfumes").delete().eq("id", id);

      if (error) throw error;

      toast.success(t("admin.toast.perfumeDeletedSuccess"));
      loadPerfumes();
    } catch (error) {
      console.error("Error deleting perfume:", error);
      toast.error(t("admin.toast.perfumeDeleteFailed"));
    } finally {
      setDeletingPerfume(null);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      setTogglingStatus(id);
      const { error } = await supabase
        .from("perfumes")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      toast.success(
        !currentStatus ? t("admin.toast.perfumeActivated") : t("admin.toast.perfumeDeactivated")
      );
      loadPerfumes();
    } catch (error) {
      console.error("Error updating perfume status:", error);
      toast.error(t("admin.toast.perfumeStatusFailed"));
    } finally {
      setTogglingStatus(null);
    }
  };

  // Filter perfumes
  const filteredPerfumes = perfumes.filter((perfume) => {
    const matchesSearch = perfume.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || perfume.type === filterType;
    const matchesGender =
      filterGender === "all" || perfume.gender === filterGender;
    return matchesSearch && matchesType && matchesGender;
  });

  // Authentication dialog
  const renderLoginDialog = () => (
    <Dialog open={showLoginDialog} onOpenChange={() => {}}>
      <DialogContent className="glass-card bg-[#F8F9FB] dark:bg-[#1a2235] border-[#323D50]/10 dark:border-white/10 text-[#323D50] dark:text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="gradient-text text-center">
            <Lock className="w-8 h-8 mx-auto mb-2" />
            {t("admin.login.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-[#323D50] dark:text-white/80">
              {t("admin.login.username")}
            </Label>
            <Input
              id="username"
              type="text"
              value={loginCredentials.username}
              onChange={(e) =>
                setLoginCredentials((prev) => ({
                  ...prev,
                  username: e.target.value,
                }))
              }
              className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white"
              placeholder={t("admin.login.enterUsername")}
              disabled={loginLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-[#323D50] dark:text-white/80">
              {t("admin.login.password")}
            </Label>
            <Input
              id="password"
              type="password"
              value={loginCredentials.password}
              onChange={(e) =>
                setLoginCredentials((prev) => ({
                  ...prev,
                  password: e.target.value,
                }))
              }
              className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white"
              placeholder={t("admin.login.enterPassword")}
              disabled={loginLoading}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>

          <LoadingButton
            onClick={handleLogin}
            loading={loginLoading}
            loadingText={t("admin.login.loggingIn")}
            disabled={!loginCredentials.username || !loginCredentials.password}
            className="w-full bg-[#5B8DD9] hover:bg-[#3E6BB5] text-white"
          >
            {t("admin.login.loginButton")}
          </LoadingButton>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Order details dialog
  const renderOrderDetailsDialog = () => (
    <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
      <DialogContent className="glass-card bg-[#F8F9FB] dark:bg-[#1a2235] border-[#323D50]/10 dark:border-white/10 text-[#323D50] dark:text-white max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="gradient-text text-xl">
            {t("admin.orderDetails.title")}
          </DialogTitle>
        </DialogHeader>

        {selectedOrder && (
          <div className="space-y-6">
            {/* Customer Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="glass-card border-[#323D50]/10 dark:border-white/10">
                <CardHeader>
                  <CardTitle className="text-[#323D50] dark:text-white text-lg">
                    {t("admin.orderDetails.customerInfo")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-[#6B7B8D] dark:text-white/60">{t("admin.orderDetails.nameLabel")}</span>
                    <span className="text-[#323D50] dark:text-white font-medium">
                      {selectedOrder.first_name} {selectedOrder.last_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7B8D] dark:text-white/60">{t("admin.orderDetails.emailLabel")}</span>
                    <span className="text-[#323D50] dark:text-white">{selectedOrder.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7B8D] dark:text-white/60">{t("admin.orderDetails.phoneLabel")}</span>
                    <span className="text-[#323D50] dark:text-white">{selectedOrder.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7B8D] dark:text-white/60">{t("admin.orderDetails.cityLabel")}</span>
                    <span className="text-[#323D50] dark:text-white">{selectedOrder.city}</span>
                  </div>
                  {selectedOrder.place_name && (
                    <div className="flex justify-between">
                      <span className="text-[#6B7B8D] dark:text-white/60">{t("admin.orderDetails.placeNameLabel")}</span>
                      <span className="text-[#323D50] dark:text-white">
                        {selectedOrder.place_name}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="glass-card border-[#323D50]/10 dark:border-white/10">
                <CardHeader>
                  <CardTitle className="text-[#323D50] dark:text-white text-lg">
                    {t("admin.orderDetails.orderInfo")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-[#6B7B8D] dark:text-white/60">{t("admin.orderDetails.orderIdLabel")}</span>
                    <span className="text-[#323D50] dark:text-white font-mono text-sm">
                      {selectedOrder.id}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7B8D] dark:text-white/60">{t("admin.orderDetails.orderDateLabel")}</span>
                    <span className="text-[#323D50] dark:text-white">
                      {new Date(selectedOrder.order_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7B8D] dark:text-white/60">{t("admin.orderDetails.totalItemsLabel")}</span>
                    <span className="text-[#323D50] dark:text-white">
                      {selectedOrder.items.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7B8D] dark:text-white/60">{t("admin.orderDetails.totalAmountLabel")}</span>
                    <span className="text-[#5B8DD9] font-bold text-lg">
                      {selectedOrder.total.toFixed(2)} LYD
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Order Items */}
            <Card className="glass-card border-[#323D50]/10 dark:border-white/10">
              <CardHeader>
                <CardTitle className="text-[#323D50] dark:text-white text-lg">
                  {t("admin.orderDetails.orderItems")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 p-4 bg-white dark:bg-white/5 rounded-lg border border-[#323D50]/10 dark:border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex-shrink-0">
                        <div
                          className="relative group cursor-pointer"
                          onClick={() => handleImageClick(item.image)}
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-20 h-20 object-cover rounded-md border border-[#323D50]/15 dark:border-white/20 transition-transform group-hover:scale-105"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src =
                                "https://via.placeholder.com/80x80/333/fff?text=No+Image";
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-md"></div>
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                            <Eye className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[#323D50] dark:text-white font-medium text-lg truncate">
                          {item.name}
                        </h4>
                        <p className="text-[#6B7B8D] dark:text-white/60 text-sm">{item.size}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            ID: {item.id.slice(0, 8)}...
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="mb-2">
                          <p className="text-[#6B7B8D] dark:text-white/60 text-sm">
                            {t("admin.orderDetails.quantity")}{" "}
                            <span className="text-[#323D50] dark:text-white font-medium">
                              {item.quantity}
                            </span>
                          </p>
                          <p className="text-[#5B8DD9] font-semibold">
                            {item.price.toFixed(2)} {t("admin.orderDetails.eachSuffix")}
                          </p>
                        </div>
                        <div className="bg-[#5B8DD9]/10 px-3 py-1 rounded-md">
                          <p className="text-[#323D50] dark:text-white font-medium">
                            {t("admin.orderDetails.subtotal")} {(item.price * item.quantity).toFixed(2)}{" "}
                            LYD
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Summary */}
                <div className="mt-6 pt-4 border-t border-[#323D50]/10 dark:border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-[#6B7B8D] dark:text-white/60">{t("admin.orderDetails.totalItemsLabel")}</span>
                    <span className="text-[#323D50] dark:text-white">
                      {selectedOrder.items.reduce(
                        (sum, item) => sum + item.quantity,
                        0
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[#6B7B8D] dark:text-white/60">{t("admin.orderDetails.orderTotal")}</span>
                    <span className="text-[#5B8DD9] font-bold text-xl">
                      {selectedOrder.total.toFixed(2)} LYD
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  // Image modal dialog
  const renderImageModal = () => (
    <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
      <DialogContent className="glass-card bg-[#F8F9FB] dark:bg-[#1a2235] border-[#323D50]/10 dark:border-white/10 text-[#323D50] dark:text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="gradient-text">{t("admin.imageDialog.title")}</DialogTitle>
        </DialogHeader>

        {selectedImage && (
          <div className="flex justify-center p-4">
            <img
              src={selectedImage}
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
            onClick={() => setShowImageModal(false)}
            className="border-[#323D50]/15 dark:border-white/20 text-white hover:bg-white/10"
          >
            {t("admin.orderDetails.close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Loading and authentication checks
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-20 text-center bg-[#F8F9FB] dark:bg-[#1a2235] min-h-screen flex items-center justify-center">
        <div className="glass-card p-12 rounded-2xl text-center max-w-md">
          <Lock className="w-16 h-16 text-[#5B8DD9] mx-auto mb-6" />
          <h2 className="text-2xl font-bold gradient-text mb-4">
            {t("admin.authRequired")}
          </h2>
          <p className="text-[#6B7B8D] dark:text-white/60">
            {t("admin.authMessage")}
          </p>
        </div>
        {renderLoginDialog()}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center bg-[#F8F9FB] dark:bg-[#1a2235] min-h-screen flex items-center justify-center">
        <div className="glass-card p-12 rounded-2xl text-center">
          <Package className="w-16 h-16 text-[#5B8DD9] mx-auto mb-6 animate-pulse" />
          <h2 className="text-2xl font-bold gradient-text mb-4">{t("admin.loadingTitle")}</h2>
          <p className="text-[#6B7B8D] dark:text-white/60">{t("admin.fetchingData")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pt-[80px] md:pt-24 pb-20 bg-[#F8F9FB] dark:bg-[#1a2235] min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-4">
              {t("admin.dashboard")}
            </h1>
            <p className="text-[#6B7B8D] dark:text-white/60">
              {t("admin.welcomeBack")} {currentAdmin?.username}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="border-[#323D50]/15 dark:border-white/20 text-white hover:bg-red-500/20"
          >
            <LogOut className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
            {t("admin.logout")}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-[#5B8DD9]"
            >
              <Package className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
              {t("admin.tabs.overview")}
            </TabsTrigger>
            <TabsTrigger
              value="perfumes"
              className="data-[state=active]:bg-[#5B8DD9]"
            >
              <Package className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
              {t("admin.tabs.perfumes")}
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="data-[state=active]:bg-[#5B8DD9]"
            >
              <ShoppingCart className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
              {t("admin.tabs.orders")}
            </TabsTrigger>
            <TabsTrigger
              value="reviews"
              className="data-[state=active]:bg-[#5B8DD9]"
            >
              <Star className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
              {t("admin.tabs.reviews")}
              {pendingReviewCount > 0 && (
                <Badge className="ms-2 bg-amber-500 text-white text-xs px-1.5 py-0">
                  {pendingReviewCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="giftOrders"
              className="data-[state=active]:bg-[#5B8DD9]"
            >
              <Gift className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
              {t("admin.tabs.giftOrders")}
            </TabsTrigger>
            <TabsTrigger
              value="memories"
              className="data-[state=active]:bg-[#5B8DD9]"
            >
              <Heart className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
              {t("admin.tabs.memories")}
              {pendingMemoryCount > 0 && (
                <Badge className="ms-2 bg-amber-500 text-white text-xs px-1.5 py-0">
                  {pendingMemoryCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="glass-card border-[#323D50]/10 dark:border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[#6B7B8D] dark:text-white/60 text-sm">{t("admin.stats.totalOrders")}</p>
                        <p className="text-2xl font-bold text-[#323D50] dark:text-white">
                          {orderStats.totalOrders}
                        </p>
                      </div>
                      <ShoppingCart className="w-8 h-8 text-[#5B8DD9]" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-card border-[#323D50]/10 dark:border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[#6B7B8D] dark:text-white/60 text-sm">{t("admin.stats.totalRevenue")}</p>
                        <p className="text-2xl font-bold text-green-400">
                          {orderStats.totalRevenue.toFixed(2)} LYD
                        </p>
                      </div>
                      <DollarSign className="w-8 h-8 text-green-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-card border-[#323D50]/10 dark:border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[#6B7B8D] dark:text-white/60 text-sm">{t("admin.stats.avgOrderValue")}</p>
                        <p className="text-2xl font-bold text-blue-400">
                          {orderStats.averageOrderValue.toFixed(2)} LYD
                        </p>
                      </div>
                      <DollarSign className="w-8 h-8 text-blue-400" />
                    </div>
                  </CardContent>
                </Card>
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
              </div>

              {/* Recent Orders */}
              <Card className="glass-card border-[#323D50]/10 dark:border-white/10">
                <CardHeader>
                  <CardTitle className="text-[#323D50] dark:text-white">{t("admin.recentOrders")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {orderStats.recentOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-4 bg-white dark:bg-white/5 rounded-lg"
                      >
                        <div>
                          <p className="text-[#323D50] dark:text-white font-medium">
                            {order.first_name} {order.last_name}
                          </p>
                          <p className="text-[#6B7B8D] dark:text-white/60 text-sm">{order.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[#5B8DD9] font-semibold">
                            {order.total} LYD
                          </p>
                          <p className="text-[#6B7B8D] dark:text-white/60 text-sm">
                            {new Date(order.order_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="perfumes" className="mt-6">
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
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      className="bg-[#5B8DD9] hover:bg-[#3E6BB5] text-white"
                      onClick={resetForm}
                    >
                      <Plus className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
                      {t("admin.form.addPerfume")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="glass-card bg-[#F8F9FB] dark:bg-[#1a2235] border-[#323D50]/10 dark:border-white/10 text-[#323D50] dark:text-white max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="gradient-text">
                        {editingPerfume ? t("admin.form.editPerfume") : t("admin.form.addNewPerfume")}
                      </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                      {/* English Name + Arabic Name */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-[#323D50] dark:text-white/80">
                            {t("admin.form.name")} (EN) *
                          </Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) =>
                              handleInputChange("name", e.target.value)
                            }
                            className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white"
                            placeholder={t("admin.form.enterPerfumeName")}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="name_ar" className="text-[#323D50] dark:text-white/80">
                            {t("admin.form.name")} (AR)
                          </Label>
                          <Input
                            id="name_ar"
                            dir="rtl"
                            value={formData.name_ar}
                            onChange={(e) =>
                              handleInputChange("name_ar", e.target.value)
                            }
                            className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white"
                            placeholder="اسم العطر بالعربية"
                          />
                        </div>
                      </div>

                      {/* Price */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="price" className="text-[#323D50] dark:text-white/80">
                            {t("admin.form.price")} *
                          </Label>
                          <Input
                            id="price"
                            type="number"
                            step="0.01"
                            value={formData.price}
                            onChange={(e) =>
                              handleInputChange(
                                "price",
                                parseFloat(e.target.value)
                              )
                            }
                            className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white"
                            placeholder={t("admin.form.enterPrice")}
                          />
                        </div>
                      </div>

                      {/* English Description */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="description" className="text-[#323D50] dark:text-white/80">
                            {t("admin.form.description")} (EN) *
                          </Label>
                          <LoadingButton
                            type="button"
                            size="sm"
                            onClick={handleGenerateDescription}
                            loading={generatingDescription}
                            loadingText={t("admin.form.generating")}
                            className="h-7 px-3 text-xs bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white border-0"
                          >
                            <Sparkles className={`w-3 h-3 ${isRTL ? "ms-1" : "me-1"}`} />
                            {t("admin.form.generateWithAI")}
                          </LoadingButton>
                        </div>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) =>
                            handleInputChange("description", e.target.value)
                          }
                          className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white"
                          placeholder={t("admin.form.enterDescription")}
                          rows={3}
                        />
                      </div>

                      {/* Arabic Description */}
                      <div className="space-y-2">
                        <Label htmlFor="description_ar" className="text-[#323D50] dark:text-white/80">
                          {t("admin.form.description")} (AR)
                        </Label>
                        <Textarea
                          id="description_ar"
                          dir="rtl"
                          value={formData.description_ar}
                          onChange={(e) =>
                            handleInputChange("description_ar", e.target.value)
                          }
                          className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white"
                          placeholder="وصف العطر بالعربية"
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="size" className="text-[#323D50] dark:text-white/80">
                            {t("admin.form.size")}
                          </Label>
                          <Input
                            id="size"
                            value={formData.size}
                            onChange={(e) =>
                              handleInputChange("size", e.target.value)
                            }
                            className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white"
                            placeholder={t("admin.form.sizePlaceholder")}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="type" className="text-[#323D50] dark:text-white/80">
                            {t("admin.form.type")}
                          </Label>
                          <Select
                            value={formData.type}
                            onValueChange={(value: any) =>
                              handleInputChange("type", value)
                            }
                          >
                            <SelectTrigger className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="glass bg-[#F8F9FB] dark:bg-[#1a2235] border-[#323D50]/15 dark:border-white/20">
                              <SelectItem value="bottle">
                                {t("admin.form.typeSingle")}
                              </SelectItem>
                              <SelectItem value="sample">{t("admin.form.typeSample")}</SelectItem>
                              <SelectItem value="gift">{t("admin.form.typeGift")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="gender" className="text-[#323D50] dark:text-white/80">
                            {t("admin.form.gender")}
                          </Label>
                          <Select
                            value={formData.gender}
                            onValueChange={(value: any) =>
                              handleInputChange("gender", value)
                            }
                          >
                            <SelectTrigger className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="glass bg-[#F8F9FB] dark:bg-[#1a2235] border-[#323D50]/15 dark:border-white/20">
                              <SelectItem value="men">{t("admin.form.men")}</SelectItem>
                              <SelectItem value="women">{t("admin.form.women")}</SelectItem>
                              <SelectItem value="unisex">{t("admin.form.unisex")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label
                            htmlFor="stock_quantity"
                            className="text-[#323D50] dark:text-white/80"
                          >
                            {t("admin.form.stockQuantity")}
                          </Label>
                          <Input
                            id="stock_quantity"
                            type="number"
                            value={formData.stock_quantity}
                            onChange={(e) =>
                              handleInputChange(
                                "stock_quantity",
                                parseInt(e.target.value)
                              )
                            }
                            className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white"
                            placeholder={t("admin.form.enterStockQuantity")}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="rating" className="text-[#323D50] dark:text-white/80">
                            {t("admin.form.rating")}
                          </Label>
                          <Input
                            id="rating"
                            type="number"
                            step="0.1"
                            min="0"
                            max="5"
                            value={formData.rating}
                            onChange={(e) =>
                              handleInputChange(
                                "rating",
                                parseFloat(e.target.value)
                              )
                            }
                            className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white"
                            placeholder={t("admin.form.enterRating")}
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Label className="text-[#323D50] dark:text-white/80">{t("admin.form.fragranceNotes")}</Label>
                        <div className="space-y-2">
                          <Input
                            value={topNotes}
                            onChange={(e) => setTopNotes(e.target.value)}
                            className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white"
                            placeholder={t("admin.form.topNotes")}
                          />
                          <Input
                            value={middleNotes}
                            onChange={(e) => setMiddleNotes(e.target.value)}
                            className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white"
                            placeholder={t("admin.form.middleNotes")}
                          />
                          <Input
                            value={baseNotes}
                            onChange={(e) => setBaseNotes(e.target.value)}
                            className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white"
                            placeholder={t("admin.form.baseNotes")}
                          />
                        </div>
                      </div>

                      {/* Sample Management Section */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="has_samples"
                            checked={formData.has_samples}
                            onChange={(e) =>
                              handleInputChange("has_samples", e.target.checked)
                            }
                            className="rounded border-[#323D50]/15 dark:border-white/20 bg-white/5"
                          />
                          <Label
                            htmlFor="has_samples"
                            className="text-[#323D50] dark:text-white/80"
                          >
                            {t("admin.samples.hasSampleVariants")}
                          </Label>
                        </div>

                        {formData.has_samples && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <Label className="text-[#323D50] dark:text-white/80">
                                {t("admin.samples.sampleVariants")}
                              </Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addSample}
                                className="border-[#323D50]/15 dark:border-white/20 text-white hover:bg-white/10"
                              >
                                <Plus className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
                                {t("admin.samples.addSample")}
                              </Button>
                            </div>

                            {perfumeSamples.length > 0 ? (
                              <div className="space-y-3">
                                {perfumeSamples.map((sample, index) => (
                                  <div
                                    key={index}
                                    className="grid grid-cols-4 gap-3 p-3 bg-white dark:bg-white/5 rounded-lg border border-[#323D50]/10 dark:border-white/10"
                                  >
                                    <Select
                                      value={sample.size}
                                      onValueChange={(value) =>
                                        updateSample(index, "size", value)
                                      }
                                    >
                                      <SelectTrigger className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="glass bg-[#F8F9FB] dark:bg-[#1a2235] border-[#323D50]/15 dark:border-white/20">
                                        {sampleSizes.map((size) => (
                                          <SelectItem key={size} value={size}>
                                            {size}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>

                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={sample.price}
                                      onChange={(e) =>
                                        updateSample(
                                          index,
                                          "price",
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white"
                                      placeholder={t("admin.samples.pricePlaceholder")}
                                    />

                                    <Input
                                      type="number"
                                      value={sample.stock_quantity}
                                      onChange={(e) =>
                                        updateSample(
                                          index,
                                          "stock_quantity",
                                          parseInt(e.target.value) || 0
                                        )
                                      }
                                      className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white"
                                      placeholder={t("admin.samples.stockPlaceholder")}
                                    />

                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => removeSample(index)}
                                      className="border-red-500/20 text-red-400 hover:bg-red-500/20"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-4 text-[#6B7B8D] dark:text-white/40">
                                <Package className="w-8 h-8 mx-auto mb-2" />
                                <p>{t("admin.samples.noSamplesYet")}</p>
                                <p className="text-xs">
                                  {t("admin.samples.clickAddSample")}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Bottle Size Management Section */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="has_bottle_sizes"
                            checked={formData.has_bottle_sizes}
                            onChange={(e) =>
                              handleInputChange(
                                "has_bottle_sizes",
                                e.target.checked
                              )
                            }
                            className="rounded border-[#323D50]/15 dark:border-white/20 bg-white/5"
                          />
                          <Label
                            htmlFor="has_bottle_sizes"
                            className="text-[#323D50] dark:text-white/80"
                          >
                            {t("admin.bottleSizes.hasBottleSizeVariants")}
                          </Label>
                        </div>

                        {formData.has_bottle_sizes && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <Label className="text-[#323D50] dark:text-white/80">
                                {t("admin.bottleSizes.bottleSizeVariants")}
                              </Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addBottleSize}
                                className="border-[#323D50]/15 dark:border-white/20 text-white hover:bg-white/10"
                              >
                                <Plus className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
                                {t("admin.bottleSizes.addBottleSize")}
                              </Button>
                            </div>

                            {perfumeBottleSizes.length > 0 ? (
                              <div className="space-y-3">
                                {perfumeBottleSizes.map((bottleSize, index) => (
                                  <div
                                    key={index}
                                    className="grid grid-cols-4 gap-3 p-3 bg-white dark:bg-white/5 rounded-lg border border-[#323D50]/10 dark:border-white/10"
                                  >
                                    <Select
                                      value={bottleSize.size}
                                      onValueChange={(value) =>
                                        updateBottleSize(index, "size", value)
                                      }
                                    >
                                      <SelectTrigger className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="glass bg-[#F8F9FB] dark:bg-[#1a2235] border-[#323D50]/15 dark:border-white/20">
                                        {bottleSizes.map((size) => (
                                          <SelectItem key={size} value={size}>
                                            {size}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>

                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={bottleSize.price}
                                      onChange={(e) =>
                                        updateBottleSize(
                                          index,
                                          "price",
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white"
                                      placeholder={t("admin.bottleSizes.pricePlaceholder")}
                                    />

                                    <Input
                                      type="number"
                                      value={bottleSize.stock_quantity}
                                      onChange={(e) =>
                                        updateBottleSize(
                                          index,
                                          "stock_quantity",
                                          parseInt(e.target.value) || 0
                                        )
                                      }
                                      className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white"
                                      placeholder={t("admin.bottleSizes.stockPlaceholder")}
                                    />

                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => removeBottleSize(index)}
                                      className="border-red-500/20 text-red-400 hover:bg-red-500/20"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-4 text-[#6B7B8D] dark:text-white/40">
                                <Package className="w-8 h-8 mx-auto mb-2" />
                                <p>{t("admin.bottleSizes.noBottleSizesYet")}</p>
                                <p className="text-xs">
                                  {t("admin.bottleSizes.clickAddBottleSize")}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Image Management Section */}
                      {
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-[#323D50] dark:text-white/80">
                              <ImageIcon className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"} inline`} />
                              {t("admin.images.perfumeImages")}
                            </Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={imageUploading}
                              className="border-[#323D50]/15 dark:border-white/20 text-white hover:bg-white/10"
                            >
                              <Upload className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
                              {imageUploading ? t("admin.images.uploading") : t("admin.images.addImages")}
                            </Button>
                          </div>

                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => handleImageUpload(e.target.files)}
                            className="hidden"
                          />

                          {/* Show existing images for editing */}
                          {editingPerfume && perfumeImages.length > 0 && (
                            <div className="grid grid-cols-3 gap-4">
                              {perfumeImages.map((image) => (
                                <div
                                  key={image.id}
                                  className="relative group bg-white dark:bg-white/5 rounded-lg p-2 border border-[#323D50]/10 dark:border-white/10"
                                >
                                  <img
                                    src={image.image_url}
                                    alt={image.image_name}
                                    className="w-full h-24 object-cover rounded-md"
                                  />

                                  {image.is_primary && (
                                    <div className={`absolute top-1 ${isRTL ? "right-1" : "left-1"} bg-[#5B8DD9] text-white px-2 py-1 rounded-full text-xs flex items-center`}>
                                      <Star className={`w-3 h-3 ${isRTL ? "ms-1" : "me-1"}`} />
                                      {t("admin.images.primary")}
                                    </div>
                                  )}

                                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                    {!image.is_primary && (
                                      <LoadingButton
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          handleSetPrimaryImage(image.id)
                                        }
                                        loading={settingPrimary === image.id}
                                        loadingText=""
                                        className="h-6 w-6 p-0 bg-[#5B8DD9] hover:bg-[#3E6BB5] border-none"
                                        title={t("admin.images.setAsPrimary")}
                                      >
                                        <Star className="w-3 h-3" />
                                      </LoadingButton>
                                    )}
                                    <LoadingButton
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        handleImageDelete(image.id)
                                      }
                                      loading={deletingImage === image.id}
                                      loadingText=""
                                      className="h-6 w-6 p-0 bg-red-500 hover:bg-red-600 border-none"
                                      title={t("admin.images.deleteImage")}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </LoadingButton>
                                  </div>

                                  <div className="mt-2 text-xs text-[#6B7B8D] dark:text-white/60 text-center truncate">
                                    {image.image_name}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Show pending images for new perfume */}
                          {!editingPerfume && pendingImages.length > 0 && (
                            <div className="grid grid-cols-3 gap-4">
                              {pendingImages.map((file, index) => (
                                <div
                                  key={index}
                                  className="relative group bg-white dark:bg-white/5 rounded-lg p-2 border border-[#323D50]/10 dark:border-white/10"
                                >
                                  <img
                                    src={URL.createObjectURL(file)}
                                    alt={file.name}
                                    className="w-full h-24 object-cover rounded-md"
                                  />

                                  {index === 0 && (
                                    <div className={`absolute top-1 ${isRTL ? "right-1" : "left-1"} bg-[#5B8DD9] text-white px-2 py-1 rounded-full text-xs flex items-center`}>
                                      <Star className={`w-3 h-3 ${isRTL ? "ms-1" : "me-1"}`} />
                                      {t("admin.images.primary")}
                                    </div>
                                  )}

                                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => removePendingImage(index)}
                                      className="h-6 w-6 p-0 bg-red-500 hover:bg-red-600 border-none"
                                      title={t("admin.images.removeImage")}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>

                                  <div className="mt-2 text-xs text-[#6B7B8D] dark:text-white/60 text-center truncate">
                                    {file.name}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* No images message */}
                          {((editingPerfume && perfumeImages.length === 0) ||
                            (!editingPerfume &&
                              pendingImages.length === 0)) && (
                            <div className="text-center py-8 text-[#6B7B8D] dark:text-white/40">
                              <ImageIcon className="w-12 h-12 mx-auto mb-2" />
                              <p>
                                {editingPerfume ? t("admin.images.noImagesUploaded") : t("admin.images.noImagesSelected")}
                              </p>
                              <p className="text-xs">
                                {editingPerfume ? t("admin.images.clickAddToUpload") : t("admin.images.clickAddToSelect")}
                              </p>
                            </div>
                          )}
                        </div>
                      }

                      <div className="flex gap-2 pt-4">
                        <LoadingButton
                          onClick={handleSubmit}
                          loading={submitLoading}
                          loadingText={
                            editingPerfume ? t("admin.form.updating") : t("admin.form.creating")
                          }
                          className="flex-1 bg-[#5B8DD9] hover:bg-[#3E6BB5] text-white"
                        >
                          <Save className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
                          {editingPerfume ? t("admin.form.update") : t("admin.form.create")}
                        </LoadingButton>
                        <Button
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                          className="flex-1 border-[#323D50]/15 dark:border-white/20 text-white hover:bg-white/10"
                        >
                          <X className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
                          {t("admin.form.cancel")}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
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
                                perfume.images?.[0]?.image_url ||
                                "https://source.unsplash.com/100x100/?perfume,bottle"
                              }
                              alt={perfume.name}
                              className="w-12 h-12 object-cover rounded-md"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src =
                                  "https://source.unsplash.com/100x100/?perfume,bottle";
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
            </div>
          </TabsContent>

          <TabsContent value="orders" className="mt-6">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-[#323D50] dark:text-white">
                  {t("admin.ordersManagement")}
                </h2>
                <Button
                  onClick={loadOrders}
                  variant="outline"
                  className="border-[#323D50]/15 dark:border-white/20 text-white hover:bg-white/10"
                >
                  {t("admin.refreshOrders")}
                </Button>
              </div>

              {/* Orders Table */}
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow className="border-[#323D50]/10 dark:border-white/10">
                        <TableHead className="text-[#323D50] dark:text-white/80">
                          {t("admin.table.orderId")}
                        </TableHead>
                        <TableHead className="text-[#323D50] dark:text-white/80">
                          {t("admin.table.customer")}
                        </TableHead>
                        <TableHead className="text-[#323D50] dark:text-white/80">{t("admin.table.email")}</TableHead>
                        <TableHead className="text-[#323D50] dark:text-white/80">{t("admin.table.phone")}</TableHead>
                        <TableHead className="text-[#323D50] dark:text-white/80">{t("admin.table.city")}</TableHead>
                        <TableHead className="text-[#323D50] dark:text-white/80">
                          {t("admin.table.placeName")}
                        </TableHead>
                        <TableHead className="text-[#323D50] dark:text-white/80">{t("admin.table.total")}</TableHead>
                        <TableHead className="text-[#323D50] dark:text-white/80">{t("admin.table.date")}</TableHead>
                        <TableHead className="text-[#323D50] dark:text-white/80">{t("admin.table.items")}</TableHead>
                        <TableHead className="text-[#323D50] dark:text-white/80">{t("admin.table.status")}</TableHead>
                        <TableHead className="text-[#323D50] dark:text-white/80">Vanex Code</TableHead>
                        <TableHead className="text-[#323D50] dark:text-white/80 text-center">
                          {t("admin.table.actions")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ordersLoading ? (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center py-8">
                            <div className="text-[#6B7B8D] dark:text-white/60">
                              {t("admin.orders.loadingOrders")}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : orders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center py-8">
                            <div className="text-[#6B7B8D] dark:text-white/60">{t("admin.orders.noOrders")}</div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        orders.map((order) => (
                          <TableRow key={order.id} className="border-[#323D50]/10 dark:border-white/10">
                            <TableCell className="text-[#323D50] dark:text-white font-mono text-sm">
                              {order.id.slice(0, 8)}...
                            </TableCell>
                            <TableCell className="text-[#323D50] dark:text-white font-medium">
                              {order.first_name} {order.last_name}
                            </TableCell>
                            <TableCell className="text-[#323D50] dark:text-white/80">
                              {order.email}
                            </TableCell>
                            <TableCell className="text-[#323D50] dark:text-white/80">
                              {order.phone}
                            </TableCell>
                            <TableCell className="text-[#323D50] dark:text-white/80">
                              {order.city}
                            </TableCell>
                            <TableCell className="text-[#323D50] dark:text-white/80">
                              {order.place_name || "-"}
                            </TableCell>
                            <TableCell className="text-[#5B8DD9] font-semibold">
                              {order.total.toFixed(2)} LYD
                            </TableCell>
                            <TableCell className="text-[#323D50] dark:text-white/80">
                              {new Date(order.order_date).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-[#323D50] dark:text-white/80">
                              {order.items.length} {t("admin.orders.itemCount")}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={order.status}
                                onValueChange={(value) =>
                                  handleStatusChange(order, value as Order["status"])
                                }
                                disabled={updatingOrderStatus === order.id}
                              >
                                <SelectTrigger className={`h-8 w-[130px] text-xs border-[#323D50]/15 dark:border-white/20 ${
                                  order.status === "delivered"
                                    ? "bg-green-500/20 text-green-400 border-green-500/40"
                                    : order.status === "shipped"
                                    ? "bg-blue-500/20 text-blue-400 border-blue-500/40"
                                    : order.status === "processing"
                                    ? "bg-orange-500/20 text-orange-400 border-orange-500/40"
                                    : order.status === "confirmed" || order.status === "accepted"
                                    ? "bg-white/50/20 text-[#5B8DD9] border-[#5B8DD9]/40"
                                    : order.status === "returned"
                                    ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/40"
                                    : "bg-white dark:bg-white/5 text-[#6B7B8D] dark:text-white/60 border-[#323D50]/15 dark:border-white/20"
                                }`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="glass bg-[#F8F9FB] dark:bg-[#1a2235] border-[#323D50]/15 dark:border-white/20">
                                  <SelectItem value="pending" className="text-[#323D50] dark:text-white hover:bg-[#323D50]/10 dark:hover:bg-white/10 focus:bg-[#323D50]/10 dark:focus:bg-white/10">{t("admin.status.pending")}</SelectItem>
                                  <SelectItem value="confirmed" className="text-[#323D50] dark:text-white hover:bg-[#323D50]/10 dark:hover:bg-white/10 focus:bg-[#323D50]/10 dark:focus:bg-white/10">{t("admin.status.confirmed")}</SelectItem>
                                  <SelectItem value="processing" className="text-[#323D50] dark:text-white hover:bg-[#323D50]/10 dark:hover:bg-white/10 focus:bg-[#323D50]/10 dark:focus:bg-white/10">{t("admin.status.processing")}</SelectItem>
                                  <SelectItem value="shipped" className="text-[#323D50] dark:text-white hover:bg-[#323D50]/10 dark:hover:bg-white/10 focus:bg-[#323D50]/10 dark:focus:bg-white/10">{t("admin.status.shipped")}</SelectItem>
                                  <SelectItem value="delivered" className="text-[#323D50] dark:text-white hover:bg-[#323D50]/10 dark:hover:bg-white/10 focus:bg-[#323D50]/10 dark:focus:bg-white/10">{t("admin.status.delivered")}</SelectItem>
                                  <SelectItem value="accepted" className="text-[#323D50] dark:text-white hover:bg-[#323D50]/10 dark:hover:bg-white/10 focus:bg-[#323D50]/10 dark:focus:bg-white/10">{t("admin.status.accepted")}</SelectItem>
                                  <SelectItem value="returned" className="text-[#323D50] dark:text-white hover:bg-[#323D50]/10 dark:hover:bg-white/10 focus:bg-[#323D50]/10 dark:focus:bg-white/10">{t("admin.status.returned")}</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              {order.vanex_package_code ? (
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(order.vanex_package_code!);
                                    toast.success("Package code copied!");
                                  }}
                                  className="font-mono text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg px-2 py-1 transition-colors"
                                  title="Click to copy"
                                >
                                  {order.vanex_package_code}
                                </button>
                              ) : (
                                <span className="text-[#6B7B8D] dark:text-white/30 text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewOrderDetails(order)}
                                  className="h-8 px-3 border-[#323D50]/15 dark:border-white/20 text-white hover:bg-blue-500/20 hover:border-blue-500/40 transition-colors"
                                  title={t("admin.orders.viewDetails")}
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                                {/* Send to Vanex */}
                                {!order.vanex_package_code && (
                                  <LoadingButton
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSendToVanex(order)}
                                    loading={sendingToVanex === order.id}
                                    loadingText=""
                                    className="h-8 px-3 border-[#323D50]/15 dark:border-white/20 text-white hover:bg-[#5B8DD9]/20 hover:border-[#5B8DD9]/40 transition-colors"
                                    title="Send to Vanex"
                                  >
                                    <Truck className="w-3 h-3" />
                                  </LoadingButton>
                                )}
                                <LoadingButton
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAcceptOrder(order)}
                                  loading={acceptingOrder === order.id}
                                  loadingText=""
                                  className="h-8 px-3 border-[#323D50]/15 dark:border-white/20 text-white hover:bg-green-500/20 hover:border-green-500/40 transition-colors"
                                  title={t("admin.orders.acceptOrder")}
                                >
                                  <Check className="w-3 h-3" />
                                </LoadingButton>
                                <LoadingButton
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleBackOrder(order)}
                                  loading={returningOrder === order.id}
                                  loadingText=""
                                  className="h-8 px-3 border-[#323D50]/15 dark:border-white/20 text-white hover:bg-yellow-500/20 hover:border-yellow-500/40 transition-colors"
                                  title={t("admin.orders.returnOrder")}
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </LoadingButton>
                                <LoadingButton
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteOrder(order.id)}
                                  loading={deletingOrder === order.id}
                                  loadingText=""
                                  className="h-8 px-3 border-[#323D50]/15 dark:border-white/20 text-white hover:bg-red-500/20 hover:border-red-500/40 transition-colors"
                                  title={t("admin.orders.deleteOrder")}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </LoadingButton>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-[#323D50] dark:text-white">
                  {t("admin.reviews.title")}
                </h2>
                <div className="flex gap-3">
                  <div className="glass-card px-4 py-2 rounded-xl text-sm dark:text-white/70 text-[#6B7B8D]">
                    {t("admin.reviews.pendingCount")}:{" "}
                    <span className="text-amber-500 font-bold">{pendingReviewCount}</span>
                  </div>
                  <div className="glass-card px-4 py-2 rounded-xl text-sm dark:text-white/70 text-[#6B7B8D]">
                    {t("admin.reviews.totalReviews")}:{" "}
                    <span className="text-[#5B8DD9] font-bold">{reviews.length}</span>
                  </div>
                </div>
              </div>

              {reviewsLoading ? (
                <div className="text-center py-12 dark:text-white/50 text-[#6B7B8D]">
                  {t("admin.loadingTitle")}
                </div>
              ) : (
                <>
                  {/* Pending Reviews */}
                  <div className="glass-card rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b dark:border-white/10 border-[#323D50]/10 flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <h3 className="font-semibold dark:text-white text-[#323D50]">
                        {t("admin.reviews.pendingReviews")}
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="dark:border-white/10 border-[#323D50]/10">
                            <TableHead className="dark:text-white/60 text-[#6B7B8D]">{t("admin.reviews.product")}</TableHead>
                            <TableHead className="dark:text-white/60 text-[#6B7B8D]">{t("admin.reviews.user")}</TableHead>
                            <TableHead className="dark:text-white/60 text-[#6B7B8D]">{t("admin.reviews.rating")}</TableHead>
                            <TableHead className="dark:text-white/60 text-[#6B7B8D]">{t("admin.reviews.comment")}</TableHead>
                            <TableHead className="dark:text-white/60 text-[#6B7B8D]">{t("admin.reviews.date")}</TableHead>
                            <TableHead className="dark:text-white/60 text-[#6B7B8D]">{t("admin.table.actions")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reviews.filter((r) => r.status === "pending").length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8 dark:text-white/40 text-[#6B7B8D]">
                                {t("admin.reviews.noPendingReviews")}
                              </TableCell>
                            </TableRow>
                          ) : (
                            reviews
                              .filter((r) => r.status === "pending")
                              .map((review) => (
                                <TableRow key={review.id} className="dark:border-white/10 border-[#323D50]/10">
                                  <TableCell className="dark:text-white/80 text-[#323D50] font-medium max-w-[120px] truncate">
                                    {review.perfume_name}
                                  </TableCell>
                                  <TableCell className="dark:text-white/60 text-[#6B7B8D] text-sm">
                                    {review.user_email}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-0.5">
                                      {[1, 2, 3, 4, 5].map((s) => (
                                        <Star
                                          key={s}
                                          className={`w-3.5 h-3.5 ${s <= review.rating ? "text-amber-400 fill-amber-400" : "dark:text-white/20 text-[#6B7B8D]/30"}`}
                                        />
                                      ))}
                                    </div>
                                  </TableCell>
                                  <TableCell className="dark:text-white/60 text-[#6B7B8D] text-sm max-w-[200px] truncate">
                                    {review.comment}
                                  </TableCell>
                                  <TableCell className="dark:text-white/50 text-[#6B7B8D] text-xs">
                                    {new Date(review.created_at).toLocaleDateString()}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-2">
                                      <LoadingButton
                                        size="sm"
                                        onClick={() => handleApproveReview(review.id)}
                                        loading={approvingReview === review.id}
                                        loadingText={t("admin.reviews.approving")}
                                        className="h-8 bg-green-600 hover:bg-green-700 text-white text-xs"
                                      >
                                        <Check className="w-3 h-3 me-1" />
                                        {t("admin.reviews.approve")}
                                      </LoadingButton>
                                      <LoadingButton
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDeleteReview(review.id)}
                                        loading={deletingReview === review.id}
                                        loadingText=""
                                        className="h-8 px-3 border-[#323D50]/15 dark:border-white/20 text-white hover:bg-red-500/20 hover:border-red-500/40 transition-colors"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </LoadingButton>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Approved Reviews */}
                  <div className="glass-card rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b dark:border-white/10 border-[#323D50]/10 flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                      <h3 className="font-semibold dark:text-white text-[#323D50]">
                        {t("admin.reviews.approvedReviews")}
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="dark:border-white/10 border-[#323D50]/10">
                            <TableHead className="dark:text-white/60 text-[#6B7B8D]">{t("admin.reviews.product")}</TableHead>
                            <TableHead className="dark:text-white/60 text-[#6B7B8D]">{t("admin.reviews.user")}</TableHead>
                            <TableHead className="dark:text-white/60 text-[#6B7B8D]">{t("admin.reviews.rating")}</TableHead>
                            <TableHead className="dark:text-white/60 text-[#6B7B8D]">{t("admin.reviews.comment")}</TableHead>
                            <TableHead className="dark:text-white/60 text-[#6B7B8D]">{t("admin.reviews.date")}</TableHead>
                            <TableHead className="dark:text-white/60 text-[#6B7B8D]">{t("admin.table.actions")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reviews.filter((r) => r.status === "approved").length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8 dark:text-white/40 text-[#6B7B8D]">
                                {t("admin.reviews.noApprovedReviews")}
                              </TableCell>
                            </TableRow>
                          ) : (
                            reviews
                              .filter((r) => r.status === "approved")
                              .map((review) => (
                                <TableRow key={review.id} className="dark:border-white/10 border-[#323D50]/10">
                                  <TableCell className="dark:text-white/80 text-[#323D50] font-medium max-w-[120px] truncate">
                                    {review.perfume_name}
                                  </TableCell>
                                  <TableCell className="dark:text-white/60 text-[#6B7B8D] text-sm">
                                    {review.user_email}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-0.5">
                                      {[1, 2, 3, 4, 5].map((s) => (
                                        <Star
                                          key={s}
                                          className={`w-3.5 h-3.5 ${s <= review.rating ? "text-amber-400 fill-amber-400" : "dark:text-white/20 text-[#6B7B8D]/30"}`}
                                        />
                                      ))}
                                    </div>
                                  </TableCell>
                                  <TableCell className="dark:text-white/60 text-[#6B7B8D] text-sm max-w-[200px] truncate">
                                    {review.comment}
                                  </TableCell>
                                  <TableCell className="dark:text-white/50 text-[#6B7B8D] text-xs">
                                    {new Date(review.created_at).toLocaleDateString()}
                                  </TableCell>
                                  <TableCell>
                                    <LoadingButton
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDeleteReview(review.id)}
                                      loading={deletingReview === review.id}
                                      loadingText=""
                                      className="h-8 px-3 border-[#323D50]/15 dark:border-white/20 text-white hover:bg-red-500/20 hover:border-red-500/40 transition-colors"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </LoadingButton>
                                  </TableCell>
                                </TableRow>
                              ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="giftOrders" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold dark:text-[#F5F5F5] text-[#323D50]">
                  {t("admin.tabs.giftOrders")}
                </h2>
                <Button variant="outline" onClick={fetchGiftOrders} disabled={giftOrdersLoading}>
                  {giftOrdersLoading ? t("admin.loadingTitle") : t("admin.refreshOrders")}
                </Button>
              </div>

              {giftOrdersLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#5B8DD9]" />
                </div>
              ) : giftOrders.length === 0 ? (
                <div className="glass-card p-12 rounded-2xl text-center">
                  <Gift className="h-12 w-12 dark:text-white/30 text-[#6B7B8D] mx-auto mb-4" />
                  <p className="dark:text-white/60 text-[#6B7B8D]">No custom gift orders yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {giftOrders.map((order) => (
                    <div key={order.id} className="glass-card p-5 rounded-2xl flex gap-5 items-start">
                      {order.generated_image_url && (
                        <img
                          src={order.generated_image_url}
                          alt="Gift preview"
                          className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold dark:text-[#F5F5F5] text-[#323D50]">
                            {order.recipient_name ?? "No recipient name"}
                          </p>
                          <Badge
                            className={
                              order.status === "pending"
                                ? "bg-amber-500"
                                : order.status === "accepted"
                                ? "bg-green-500"
                                : "bg-blue-500"
                            }
                          >
                            {order.status}
                          </Badge>
                        </div>
                        <p className="text-sm dark:text-white/60 text-[#6B7B8D]">
                          {order.occasion} · {order.box_color} box · {order.wrapping_style}
                        </p>
                        <p className="text-sm dark:text-white/60 text-[#6B7B8D]">
                          Products: {order.products.map((p) => p.name).join(", ")}
                        </p>
                        {order.delivery_date && (
                          <p className="text-sm dark:text-white/60 text-[#6B7B8D]">
                            Delivery: {new Date(order.delivery_date).toLocaleDateString()}
                          </p>
                        )}
                        {order.message_card && (
                          <p className="text-sm dark:text-white/60 text-[#6B7B8D] italic">
                            "{order.message_card}"
                          </p>
                        )}
                        <p className="text-sm font-semibold text-[#5B8DD9]">
                          {order.total_price} LYD
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <select
                          value={order.status}
                          onChange={async (e) => {
                            const { error } = await supabase
                              .from("custom_gift_orders")
                              .update({ status: e.target.value })
                              .eq("id", order.id);
                            if (error) {
                              toast.error("Failed to update status");
                            } else {
                              setGiftOrders((prev) =>
                                prev.map((o) =>
                                  o.id === order.id ? { ...o, status: e.target.value } : o
                                )
                              );
                              toast.success("Status updated");
                            }
                          }}
                          className="glass dark:bg-white/5 bg-white dark:border-white/10 border-[#323D50]/10 dark:text-[#F5F5F5] text-[#323D50] rounded-lg px-3 py-1.5 text-sm"
                        >
                          <option value="pending">Pending</option>
                          <option value="accepted">Accepted</option>
                          <option value="delivered">Delivered</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="memories" className="mt-6">
            <div className="glass-card p-6 rounded-2xl">
              <h2 className="text-xl font-bold text-[#323D50] dark:text-[#F5F5F5] mb-6">
                {t("admin.memories.title")}
              </h2>
              {memoriesLoading ? (
                <div className="text-center py-8 text-[#6B7B8D]">
                  {t("admin.loadingTitle")}
                </div>
              ) : memories.length === 0 ? (
                <p className="text-center text-[#6B7B8D] py-8">
                  {t("admin.memories.empty")}
                </p>
              ) : (
                <div className="space-y-4">
                  {memories.map((memory) => (
                    <div
                      key={memory.id}
                      className="flex items-start justify-between gap-4 p-4 rounded-xl border border-[#5B8DD9]/10 bg-white/5"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#F5F5F5] italic mb-1">
                          "{memory.memory_text}"
                        </p>
                        <p className="text-xs text-[#5B8DD9] mb-1">
                          — {memory.perfume_name}
                        </p>
                        {memory.author_name && (
                          <p className="text-xs text-[#6B7B8D]">
                            {memory.author_name}
                          </p>
                        )}
                        <p className="text-xs text-[#6B7B8D] mt-1">
                          {new Date(memory.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge
                          className={
                            memory.status === "approved"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-amber-500/20 text-amber-400"
                          }
                        >
                          {memory.status === "approved"
                            ? t("admin.memories.approved")
                            : t("admin.memories.pending")}
                        </Badge>
                        {memory.status === "pending" && (
                          <Button
                            size="sm"
                            onClick={() => handleApproveMemory(memory.id)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            {t("admin.memories.approve")}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteMemory(memory.id)}
                        >
                          {t("admin.memories.delete")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      {renderOrderDetailsDialog()}
      {renderImageModal()}
    </div>
  );
}
