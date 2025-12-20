import { useState, useEffect, useRef } from "react";
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
  Order,
  OrderStats,
} from "@/services/ordersService";
import {
  uploadPerfumeImage,
  deletePerfumeImage,
  getPerfumeImages,
  setPrimaryImage,
  validateImageFile,
  PerfumeImage,
} from "@/services/imageService";

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
  price: number;
  description: string;
  fragrance_notes: {
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
  images?: PerfumeImage[]; // Product images
  samples?: PerfumeSample[]; // Sample variants
  bottle_sizes?: PerfumeBottleSize[]; // Bottle size variants
}

const initialPerfumeData: Omit<Perfume, "id" | "created_at" | "updated_at"> = {
  name: "",
  price: 0,
  description: "",
  fragrance_notes: {
    top: [],
    middle: [],
    base: [],
  },
  size: "",
  type: "bottle", // Always default to bottle for perfumes with bottle sizes
  rating: 4.5,
  gender: "unisex",
  stock_quantity: 0,
  is_active: true,
  has_samples: false,
  has_bottle_sizes: false,
};

export default function AdminPage() {
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
  const [settingPrimary, setSettingPrimary] = useState<string | null>(null);
  const [deletingImage, setDeletingImage] = useState<string | null>(null);

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
    await Promise.all([loadPerfumes(), loadOrders(), loadOrderStats()]);
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
      toast.error("Failed to load perfumes");
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
      toast.error("Failed to load orders");
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
        toast.success("Login successful!");
        loadData();
      } else {
        toast.error(result.error || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Login failed");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    logoutAdmin();
    setIsAuthenticated(false);
    setCurrentAdmin(null);
    setShowLoginDialog(true);
    toast.success("Logged out successfully");
  };

  const handleDeleteOrder = async (id: string) => {
    if (!confirm("Are you sure you want to delete this order?")) return;

    try {
      setDeletingOrder(id);
      const success = await deleteOrder(id);
      if (success) {
        toast.success("Order deleted successfully!");
        loadOrders();
        loadOrderStats();
      } else {
        toast.error("Failed to delete order");
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error("Failed to delete order");
    } finally {
      setDeletingOrder(null);
    }
  };

  const handleAcceptOrder = async (order: Order) => {
    if (
      !confirm(
        "Are you sure you want to accept this order? This will decrease stock quantities."
      )
    )
      return;

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

      toast.success("Order accepted successfully! Stock quantities updated.");
      loadOrders();
      loadOrderStats();
      loadPerfumes();
    } catch (error) {
      console.error("Error accepting order:", error);
      toast.error("Failed to accept order");
    } finally {
      setAcceptingOrder(null);
    }
  };

  const handleBackOrder = async (order: Order) => {
    if (
      !confirm(
        "Are you sure you want to process this return? This will increase stock quantities."
      )
    )
      return;

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

      toast.success("Return processed successfully! Stock quantities updated.");
      loadOrders();
      loadOrderStats();
      loadPerfumes();
    } catch (error) {
      console.error("Error processing return:", error);
      toast.error("Failed to process return");
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
        toast.error("Please fill in all required fields");
        return;
      }

      // Validate bottle sizes if enabled
      if (formData.has_bottle_sizes && perfumeBottleSizes.length > 0) {
        for (const bottleSize of perfumeBottleSizes) {
          if (!bottleSize.price || bottleSize.price <= 0) {
            toast.error(`Please set a valid price for ${bottleSize.size}`);
            return;
          }
          if (bottleSize.stock_quantity < 0) {
            toast.error(
              `Please set a valid stock quantity for ${bottleSize.size}`
            );
            return;
          }
        }
      }

      // Ensure bottle size perfumes are type "bottle"
      if (formData.has_bottle_sizes && formData.type !== "bottle") {
        toast.error("Perfumes with bottle sizes must be type 'bottle'");
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
            toast.error("Failed to update samples");
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
          toast.error("Perfume saved but failed to save samples");
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
            toast.error("Failed to remove samples");
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
            toast.error("Failed to update bottle sizes");
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
          toast.error("Perfume saved but failed to save bottle sizes");
        } else {
          console.log(
            "Bottle sizes created successfully:",
            insertedBottleSizes
          );
          toast.success(
            `${insertedBottleSizes?.length || 0} bottle sizes saved`
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
            toast.error("Failed to remove bottle sizes");
          }
        }
      } else if (formData.has_bottle_sizes && perfumeBottleSizes.length === 0) {
        console.warn("Bottle sizes enabled but no bottle sizes provided");
        toast.warning("Bottle sizes enabled but no sizes were added");
      } else {
        console.log("Bottle sizes not handled because:", {
          has_bottle_sizes: formData.has_bottle_sizes,
          perfumeBottleSizes_length: perfumeBottleSizes.length,
          has_result_id: !!result.data?.[0]?.id,
        });
      }

      toast.success(
        editingPerfume
          ? "Perfume updated successfully!"
          : "Perfume created successfully!"
      );
      setIsDialogOpen(false);
      resetForm();
      loadPerfumes();
    } catch (error) {
      console.error("Error saving perfume:", error);
      toast.error("Failed to save perfume");
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
        toast.error("Failed to upload some images");
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
        toast.success(`${validFiles.length} image(s) ready to upload`);
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
          `${successfulUploads.length} image(s) uploaded successfully`
        );
      }
    } catch (error) {
      console.error("Error uploading pending images:", error);
      toast.error("Failed to upload some images");
    } finally {
      setImageUploading(false);
    }
  };

  const removePendingImage = (index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImageDelete = async (imageId: string) => {
    if (!confirm("Are you sure you want to delete this image?")) return;

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
      price: perfume.price,
      description: perfume.description,
      fragrance_notes: perfume.fragrance_notes,
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
    if (!confirm("Are you sure you want to delete this perfume?")) return;

    try {
      setDeletingPerfume(id);
      const { error } = await supabase.from("perfumes").delete().eq("id", id);

      if (error) throw error;

      toast.success("Perfume deleted successfully!");
      loadPerfumes();
    } catch (error) {
      console.error("Error deleting perfume:", error);
      toast.error("Failed to delete perfume");
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
        `Perfume ${!currentStatus ? "activated" : "deactivated"} successfully!`
      );
      loadPerfumes();
    } catch (error) {
      console.error("Error updating perfume status:", error);
      toast.error("Failed to update perfume status");
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
      <DialogContent className="glass-card bg-[#0e0a1d] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="gradient-text text-center">
            <Lock className="w-8 h-8 mx-auto mb-2" />
            Admin Login
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-white/80">
              Username
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
              className="glass bg-white/5 border-white/20 text-white"
              placeholder="Enter username"
              disabled={loginLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-white/80">
              Password
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
              className="glass bg-white/5 border-white/20 text-white"
              placeholder="Enter password"
              disabled={loginLoading}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>

          <LoadingButton
            onClick={handleLogin}
            loading={loginLoading}
            loadingText="Logging in..."
            disabled={!loginCredentials.username || !loginCredentials.password}
            className="w-full bg-[#b24ce2] hover:bg-[#9a3bc7] text-white"
          >
            Login
          </LoadingButton>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Order details dialog
  const renderOrderDetailsDialog = () => (
    <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
      <DialogContent className="glass-card bg-[#0e0a1d] border-white/10 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="gradient-text text-xl">
            Order Details
          </DialogTitle>
        </DialogHeader>

        {selectedOrder && (
          <div className="space-y-6">
            {/* Customer Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="glass-card border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-lg">
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-white/60">Name:</span>
                    <span className="text-white font-medium">
                      {selectedOrder.first_name} {selectedOrder.last_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Email:</span>
                    <span className="text-white">{selectedOrder.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Phone:</span>
                    <span className="text-white">{selectedOrder.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">City:</span>
                    <span className="text-white">{selectedOrder.city}</span>
                  </div>
                  {selectedOrder.place_name && (
                    <div className="flex justify-between">
                      <span className="text-white/60">Place Name:</span>
                      <span className="text-white">
                        {selectedOrder.place_name}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="glass-card border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-lg">
                    Order Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-white/60">Order ID:</span>
                    <span className="text-white font-mono text-sm">
                      {selectedOrder.id}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Order Date:</span>
                    <span className="text-white">
                      {new Date(selectedOrder.order_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Total Items:</span>
                    <span className="text-white">
                      {selectedOrder.items.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Total Amount:</span>
                    <span className="text-[#b24ce2] font-bold text-lg">
                      {selectedOrder.total.toFixed(2)} LYD
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Order Items */}
            <Card className="glass-card border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-lg">
                  Order Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex-shrink-0">
                        <div
                          className="relative group cursor-pointer"
                          onClick={() => handleImageClick(item.image)}
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-20 h-20 object-cover rounded-md border border-white/20 transition-transform group-hover:scale-105"
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
                        <h4 className="text-white font-medium text-lg truncate">
                          {item.name}
                        </h4>
                        <p className="text-white/60 text-sm">{item.size}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            ID: {item.id.slice(0, 8)}...
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="mb-2">
                          <p className="text-white/60 text-sm">
                            Quantity:{" "}
                            <span className="text-white font-medium">
                              {item.quantity}
                            </span>
                          </p>
                          <p className="text-[#b24ce2] font-semibold">
                            {item.price.toFixed(2)} LYD each
                          </p>
                        </div>
                        <div className="bg-[#b24ce2]/10 px-3 py-1 rounded-md">
                          <p className="text-white font-medium">
                            Subtotal: {(item.price * item.quantity).toFixed(2)}{" "}
                            LYD
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Summary */}
                <div className="mt-6 pt-4 border-t border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-white/60">Total Items:</span>
                    <span className="text-white">
                      {selectedOrder.items.reduce(
                        (sum, item) => sum + item.quantity,
                        0
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-white/60">Order Total:</span>
                    <span className="text-[#b24ce2] font-bold text-xl">
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
      <DialogContent className="glass-card bg-[#0e0a1d] border-white/10 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="gradient-text">Product Image</DialogTitle>
        </DialogHeader>

        {selectedImage && (
          <div className="flex justify-center p-4">
            <img
              src={selectedImage}
              alt="Product"
              className="max-w-full max-h-96 object-contain rounded-lg border border-white/20"
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
            className="border-white/20 text-white hover:bg-white/10"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Loading and authentication checks
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-20 text-center bg-[#0e0a1d] min-h-screen flex items-center justify-center">
        <div className="glass-card p-12 rounded-2xl text-center max-w-md">
          <Lock className="w-16 h-16 text-[#b24ce2] mx-auto mb-6" />
          <h2 className="text-2xl font-bold gradient-text mb-4">
            Authentication Required
          </h2>
          <p className="text-white/60">
            Please login to access the admin panel.
          </p>
        </div>
        {renderLoginDialog()}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center bg-[#0e0a1d] min-h-screen flex items-center justify-center">
        <div className="glass-card p-12 rounded-2xl text-center">
          <Package className="w-16 h-16 text-[#b24ce2] mx-auto mb-6 animate-pulse" />
          <h2 className="text-2xl font-bold gradient-text mb-4">Loading...</h2>
          <p className="text-white/60">Fetching data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pt-[80px] md:pt-24 pb-20 bg-[#0e0a1d] min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-4">
              Admin Dashboard
            </h1>
            <p className="text-white/60">
              Welcome back, {currentAdmin?.username}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="border-white/20 text-white hover:bg-red-500/20"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 glass bg-white/5 border-white/20">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-[#b24ce2]"
            >
              <Package className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="perfumes"
              className="data-[state=active]:bg-[#b24ce2]"
            >
              <Package className="w-4 h-4 mr-2" />
              Perfumes
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="data-[state=active]:bg-[#b24ce2]"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Orders
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="glass-card border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/60 text-sm">Total Orders</p>
                        <p className="text-2xl font-bold text-white">
                          {orderStats.totalOrders}
                        </p>
                      </div>
                      <ShoppingCart className="w-8 h-8 text-[#b24ce2]" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-card border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/60 text-sm">Total Revenue</p>
                        <p className="text-2xl font-bold text-green-400">
                          {orderStats.totalRevenue.toFixed(2)} LYD
                        </p>
                      </div>
                      <DollarSign className="w-8 h-8 text-green-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-card border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/60 text-sm">Avg Order Value</p>
                        <p className="text-2xl font-bold text-blue-400">
                          {orderStats.averageOrderValue.toFixed(2)} LYD
                        </p>
                      </div>
                      <DollarSign className="w-8 h-8 text-blue-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-card border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/60 text-sm">Total Perfumes</p>
                        <p className="text-2xl font-bold text-white">
                          {perfumes.length}
                        </p>
                      </div>
                      <Package className="w-8 h-8 text-[#b24ce2]" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Orders */}
              <Card className="glass-card border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Recent Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {orderStats.recentOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-4 bg-white/5 rounded-lg"
                      >
                        <div>
                          <p className="text-white font-medium">
                            {order.first_name} {order.last_name}
                          </p>
                          <p className="text-white/60 text-sm">{order.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[#b24ce2] font-semibold">
                            {order.total} LYD
                          </p>
                          <p className="text-white/60 text-sm">
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
                <Card className="glass-card border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/60 text-sm">Total Perfumes</p>
                        <p className="text-2xl font-bold text-white">
                          {perfumes.length}
                        </p>
                      </div>
                      <Package className="w-8 h-8 text-[#b24ce2]" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-card border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/60 text-sm">Active</p>
                        <p className="text-2xl font-bold text-green-400">
                          {perfumes.filter((p) => p.is_active).length}
                        </p>
                      </div>
                      <CheckCircle className="w-8 h-8 text-green-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-card border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/60 text-sm">Inactive</p>
                        <p className="text-2xl font-bold text-red-400">
                          {perfumes.filter((p) => !p.is_active).length}
                        </p>
                      </div>
                      <AlertCircle className="w-8 h-8 text-red-400" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-card border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/60 text-sm">Low Stock</p>
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
                    <Search className="absolute left-3 top-3 w-4 h-4 text-white/40" />
                    <Input
                      placeholder="Search perfumes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 glass bg-white/5 border-white/20 text-white"
                    />
                  </div>
                </div>
                <Select
                  value={filterType}
                  onValueChange={(value: any) => setFilterType(value)}
                >
                  <SelectTrigger className="w-40 glass bg-white/5 border-white/20 text-white">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent className="glass bg-[#0e0a1d] border-white/20">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="bottle">Bottles</SelectItem>
                    <SelectItem value="sample">Samples</SelectItem>
                    <SelectItem value="gift">Gift Sets</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filterGender}
                  onValueChange={(value: any) => setFilterGender(value)}
                >
                  <SelectTrigger className="w-40 glass bg-white/5 border-white/20 text-white">
                    <SelectValue placeholder="Filter by gender" />
                  </SelectTrigger>
                  <SelectContent className="glass bg-[#0e0a1d] border-white/20">
                    <SelectItem value="all">All Genders</SelectItem>
                    <SelectItem value="men">Men</SelectItem>
                    <SelectItem value="women">Women</SelectItem>
                    <SelectItem value="unisex">Unisex</SelectItem>
                  </SelectContent>
                </Select>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      className="bg-[#b24ce2] hover:bg-[#9a3bc7] text-white"
                      onClick={resetForm}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Perfume
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="glass-card bg-[#0e0a1d] border-white/10 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="gradient-text">
                        {editingPerfume ? "Edit Perfume" : "Add New Perfume"}
                      </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-white/80">
                            Name *
                          </Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) =>
                              handleInputChange("name", e.target.value)
                            }
                            className="glass bg-white/5 border-white/20 text-white"
                            placeholder="Enter perfume name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="price" className="text-white/80">
                            Price *
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
                            className="glass bg-white/5 border-white/20 text-white"
                            placeholder="Enter price"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description" className="text-white/80">
                          Description *
                        </Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) =>
                            handleInputChange("description", e.target.value)
                          }
                          className="glass bg-white/5 border-white/20 text-white"
                          placeholder="Enter description"
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="size" className="text-white/80">
                            Size
                          </Label>
                          <Input
                            id="size"
                            value={formData.size}
                            onChange={(e) =>
                              handleInputChange("size", e.target.value)
                            }
                            className="glass bg-white/5 border-white/20 text-white"
                            placeholder="e.g. 100ml"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="type" className="text-white/80">
                            Type
                          </Label>
                          <Select
                            value={formData.type}
                            onValueChange={(value: any) =>
                              handleInputChange("type", value)
                            }
                          >
                            <SelectTrigger className="glass bg-white/5 border-white/20 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="glass bg-[#0e0a1d] border-white/20">
                              <SelectItem value="bottle">
                                Single Perfume
                              </SelectItem>
                              <SelectItem value="sample">Sample</SelectItem>
                              <SelectItem value="gift">Gift Set</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="gender" className="text-white/80">
                            Gender
                          </Label>
                          <Select
                            value={formData.gender}
                            onValueChange={(value: any) =>
                              handleInputChange("gender", value)
                            }
                          >
                            <SelectTrigger className="glass bg-white/5 border-white/20 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="glass bg-[#0e0a1d] border-white/20">
                              <SelectItem value="men">Men</SelectItem>
                              <SelectItem value="women">Women</SelectItem>
                              <SelectItem value="unisex">Unisex</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label
                            htmlFor="stock_quantity"
                            className="text-white/80"
                          >
                            Stock Quantity
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
                            className="glass bg-white/5 border-white/20 text-white"
                            placeholder="Enter stock quantity"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="rating" className="text-white/80">
                            Rating
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
                            className="glass bg-white/5 border-white/20 text-white"
                            placeholder="Enter rating (0-5)"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Label className="text-white/80">Fragrance Notes</Label>
                        <div className="space-y-2">
                          <Input
                            value={topNotes}
                            onChange={(e) => setTopNotes(e.target.value)}
                            className="glass bg-white/5 border-white/20 text-white"
                            placeholder="Top notes (comma separated)"
                          />
                          <Input
                            value={middleNotes}
                            onChange={(e) => setMiddleNotes(e.target.value)}
                            className="glass bg-white/5 border-white/20 text-white"
                            placeholder="Middle notes (comma separated)"
                          />
                          <Input
                            value={baseNotes}
                            onChange={(e) => setBaseNotes(e.target.value)}
                            className="glass bg-white/5 border-white/20 text-white"
                            placeholder="Base notes (comma separated)"
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
                            className="rounded border-white/20 bg-white/5"
                          />
                          <Label
                            htmlFor="has_samples"
                            className="text-white/80"
                          >
                            Has Sample Variants
                          </Label>
                        </div>

                        {formData.has_samples && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <Label className="text-white/80">
                                Sample Variants
                              </Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addSample}
                                className="border-white/20 text-white hover:bg-white/10"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Sample
                              </Button>
                            </div>

                            {perfumeSamples.length > 0 ? (
                              <div className="space-y-3">
                                {perfumeSamples.map((sample, index) => (
                                  <div
                                    key={index}
                                    className="grid grid-cols-4 gap-3 p-3 bg-white/5 rounded-lg border border-white/10"
                                  >
                                    <Select
                                      value={sample.size}
                                      onValueChange={(value) =>
                                        updateSample(index, "size", value)
                                      }
                                    >
                                      <SelectTrigger className="glass bg-white/5 border-white/20 text-white">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="glass bg-[#0e0a1d] border-white/20">
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
                                      className="glass bg-white/5 border-white/20 text-white"
                                      placeholder="Price"
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
                                      className="glass bg-white/5 border-white/20 text-white"
                                      placeholder="Stock"
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
                              <div className="text-center py-4 text-white/40">
                                <Package className="w-8 h-8 mx-auto mb-2" />
                                <p>No samples added yet</p>
                                <p className="text-xs">
                                  Click "Add Sample" to create sample variants
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
                            className="rounded border-white/20 bg-white/5"
                          />
                          <Label
                            htmlFor="has_bottle_sizes"
                            className="text-white/80"
                          >
                            Has Bottle Size Variants
                          </Label>
                        </div>

                        {formData.has_bottle_sizes && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <Label className="text-white/80">
                                Bottle Size Variants
                              </Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addBottleSize}
                                className="border-white/20 text-white hover:bg-white/10"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Bottle Size
                              </Button>
                            </div>

                            {perfumeBottleSizes.length > 0 ? (
                              <div className="space-y-3">
                                {perfumeBottleSizes.map((bottleSize, index) => (
                                  <div
                                    key={index}
                                    className="grid grid-cols-4 gap-3 p-3 bg-white/5 rounded-lg border border-white/10"
                                  >
                                    <Select
                                      value={bottleSize.size}
                                      onValueChange={(value) =>
                                        updateBottleSize(index, "size", value)
                                      }
                                    >
                                      <SelectTrigger className="glass bg-white/5 border-white/20 text-white">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="glass bg-[#0e0a1d] border-white/20">
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
                                      className="glass bg-white/5 border-white/20 text-white"
                                      placeholder="Price"
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
                                      className="glass bg-white/5 border-white/20 text-white"
                                      placeholder="Stock"
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
                              <div className="text-center py-4 text-white/40">
                                <Package className="w-8 h-8 mx-auto mb-2" />
                                <p>No bottle sizes added yet</p>
                                <p className="text-xs">
                                  Click "Add Bottle Size" to create bottle size
                                  variants
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
                            <Label className="text-white/80">
                              <ImageIcon className="w-4 h-4 mr-2 inline" />
                              Perfume Images
                            </Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={imageUploading}
                              className="border-white/20 text-white hover:bg-white/10"
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              {imageUploading ? "Uploading..." : "Add Images"}
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
                                  className="relative group bg-white/5 rounded-lg p-2 border border-white/10"
                                >
                                  <img
                                    src={image.image_url}
                                    alt={image.image_name}
                                    className="w-full h-24 object-cover rounded-md"
                                  />

                                  {image.is_primary && (
                                    <div className="absolute top-1 left-1 bg-[#b24ce2] text-white px-2 py-1 rounded-full text-xs flex items-center">
                                      <Star className="w-3 h-3 mr-1" />
                                      Primary
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
                                        className="h-6 w-6 p-0 bg-[#b24ce2] hover:bg-[#9a3bc7] border-none"
                                        title="Set as primary"
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
                                      title="Delete image"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </LoadingButton>
                                  </div>

                                  <div className="mt-2 text-xs text-white/60 text-center truncate">
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
                                  className="relative group bg-white/5 rounded-lg p-2 border border-white/10"
                                >
                                  <img
                                    src={URL.createObjectURL(file)}
                                    alt={file.name}
                                    className="w-full h-24 object-cover rounded-md"
                                  />

                                  {index === 0 && (
                                    <div className="absolute top-1 left-1 bg-[#b24ce2] text-white px-2 py-1 rounded-full text-xs flex items-center">
                                      <Star className="w-3 h-3 mr-1" />
                                      Primary
                                    </div>
                                  )}

                                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => removePendingImage(index)}
                                      className="h-6 w-6 p-0 bg-red-500 hover:bg-red-600 border-none"
                                      title="Remove image"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>

                                  <div className="mt-2 text-xs text-white/60 text-center truncate">
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
                            <div className="text-center py-8 text-white/40">
                              <ImageIcon className="w-12 h-12 mx-auto mb-2" />
                              <p>
                                No images{" "}
                                {editingPerfume ? "uploaded" : "selected"} yet
                              </p>
                              <p className="text-xs">
                                Click "Add Images" to{" "}
                                {editingPerfume ? "upload" : "select"} photos
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
                            editingPerfume ? "Updating..." : "Creating..."
                          }
                          className="flex-1 bg-[#b24ce2] hover:bg-[#9a3bc7] text-white"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {editingPerfume ? "Update" : "Create"}
                        </LoadingButton>
                        <Button
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                          className="flex-1 border-white/20 text-white hover:bg-white/10"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel
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
                      <TableRow className="border-white/10">
                        <TableHead className="text-white/80">Image</TableHead>
                        <TableHead className="text-white/80">Name</TableHead>
                        <TableHead className="text-white/80">Price</TableHead>
                        <TableHead className="text-white/80">Type</TableHead>
                        <TableHead className="text-white/80">Gender</TableHead>
                        <TableHead className="text-white/80">Stock</TableHead>
                        <TableHead className="text-white/80">Images</TableHead>
                        <TableHead className="text-white/80">Status</TableHead>
                        <TableHead className="text-white/80 text-center">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPerfumes.map((perfume) => (
                        <TableRow key={perfume.id} className="border-white/10">
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
                          <TableCell className="text-white font-medium">
                            {perfume.name}
                          </TableCell>
                          <TableCell className="text-[#b24ce2] font-semibold">
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
                                  : "text-white"
                              }`}
                            >
                              {perfume.stock_quantity}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <ImageIcon className="w-4 h-4 text-white/60" />
                              <span className="text-white">
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
                              {perfume.is_active ? "Active" : "Inactive"}
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
                                className="h-8 px-3 border-white/20 text-white hover:bg-white/10 transition-colors"
                                title={
                                  perfume.is_active ? "Deactivate" : "Activate"
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
                                className="h-8 px-3 border-white/20 text-white hover:bg-blue-500/20 hover:border-blue-500/40 transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <LoadingButton
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(perfume.id)}
                                loading={deletingPerfume === perfume.id}
                                loadingText=""
                                className="h-8 px-3 border-white/20 text-white hover:bg-red-500/20 hover:border-red-500/40 transition-colors"
                                title="Delete"
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
                <h2 className="text-2xl font-bold text-white">
                  Orders Management
                </h2>
                <Button
                  onClick={loadOrders}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Refresh Orders
                </Button>
              </div>

              {/* Orders Table */}
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead className="text-white/80">
                          Order ID
                        </TableHead>
                        <TableHead className="text-white/80">
                          Customer
                        </TableHead>
                        <TableHead className="text-white/80">Email</TableHead>
                        <TableHead className="text-white/80">Phone</TableHead>
                        <TableHead className="text-white/80">City</TableHead>
                        <TableHead className="text-white/80">
                          Place Name
                        </TableHead>
                        <TableHead className="text-white/80">Total</TableHead>
                        <TableHead className="text-white/80">Date</TableHead>
                        <TableHead className="text-white/80">Items</TableHead>
                        <TableHead className="text-white/80">Status</TableHead>
                        <TableHead className="text-white/80 text-center">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ordersLoading ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-8">
                            <div className="text-white/60">
                              Loading orders...
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : orders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-8">
                            <div className="text-white/60">No orders found</div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        orders.map((order) => (
                          <TableRow key={order.id} className="border-white/10">
                            <TableCell className="text-white font-mono text-sm">
                              {order.id.slice(0, 8)}...
                            </TableCell>
                            <TableCell className="text-white font-medium">
                              {order.first_name} {order.last_name}
                            </TableCell>
                            <TableCell className="text-white/80">
                              {order.email}
                            </TableCell>
                            <TableCell className="text-white/80">
                              {order.phone}
                            </TableCell>
                            <TableCell className="text-white/80">
                              {order.city}
                            </TableCell>
                            <TableCell className="text-white/80">
                              {order.place_name || "-"}
                            </TableCell>
                            <TableCell className="text-[#b24ce2] font-semibold">
                              {order.total.toFixed(2)} LYD
                            </TableCell>
                            <TableCell className="text-white/80">
                              {new Date(order.order_date).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-white/80">
                              {order.items.length} item(s)
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  order.status === "accepted"
                                    ? "default"
                                    : order.status === "returned"
                                    ? "secondary"
                                    : "outline"
                                }
                                className={
                                  order.status === "accepted"
                                    ? "bg-green-500/20 text-green-400 border-green-500/40"
                                    : order.status === "returned"
                                    ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/40"
                                    : "bg-blue-500/20 text-blue-400 border-blue-500/40"
                                }
                              >
                                {order.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewOrderDetails(order)}
                                  className="h-8 px-3 border-white/20 text-white hover:bg-blue-500/20 hover:border-blue-500/40 transition-colors"
                                  title="View Details"
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                                <LoadingButton
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAcceptOrder(order)}
                                  loading={acceptingOrder === order.id}
                                  loadingText=""
                                  className="h-8 px-3 border-white/20 text-white hover:bg-green-500/20 hover:border-green-500/40 transition-colors"
                                  title="Accept Order"
                                >
                                  <Check className="w-3 h-3" />
                                </LoadingButton>
                                <LoadingButton
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleBackOrder(order)}
                                  loading={returningOrder === order.id}
                                  loadingText=""
                                  className="h-8 px-3 border-white/20 text-white hover:bg-yellow-500/20 hover:border-yellow-500/40 transition-colors"
                                  title="Back Order"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </LoadingButton>
                                <LoadingButton
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteOrder(order.id)}
                                  loading={deletingOrder === order.id}
                                  loadingText=""
                                  className="h-8 px-3 border-white/20 text-white hover:bg-red-500/20 hover:border-red-500/40 transition-colors"
                                  title="Delete Order"
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
        </Tabs>
      </div>
      {renderOrderDetailsDialog()}
      {renderImageModal()}
    </div>
  );
}
