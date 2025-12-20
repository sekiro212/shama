import { supabase } from "@/lib/supabase";

export interface Order {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  city: string;
  place_name?: string; // Add this line
  total: number;
  order_date: string;
  items: OrderItem[];
  status: "pending" | "accepted" | "returned";
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  size: string;
  quantity: number;
  image: string;
}

export interface OrderFilters {
  startDate?: string;
  endDate?: string;
  city?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

export interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  topCities: { city: string; count: number; revenue: number }[];
  recentOrders: Order[];
}

// Fetch all orders with optional filters
export const fetchOrders = async (filters?: OrderFilters): Promise<Order[]> => {
  try {
    let query = supabase
      .from("orders")
      .select("*")
      .order("order_date", { ascending: false });

    // Apply filters if provided
    if (filters) {
      if (filters.startDate) {
        query = query.gte("order_date", filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte("order_date", filters.endDate);
      }
      if (filters.city) {
        query = query.eq("city", filters.city);
      }
      if (filters.minAmount) {
        query = query.gte("total", filters.minAmount);
      }
      if (filters.maxAmount) {
        query = query.lte("total", filters.maxAmount);
      }
      if (filters.search) {
        query = query.or(
          `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
        );
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching orders:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching orders:", error);
    return [];
  }
};

// Fetch single order by ID
export const fetchOrderById = async (id: string): Promise<Order | null> => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching order:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error fetching order:", error);
    return null;
  }
};

// Get order statistics
export const getOrderStats = async (): Promise<OrderStats> => {
  try {
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .order("order_date", { ascending: false });

    if (error) {
      console.error("Error fetching order stats:", error);
      return {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        topCities: [],
        recentOrders: [],
      };
    }

    const totalOrders = orders?.length || 0;
    const totalRevenue =
      orders?.reduce((sum, order) => sum + order.total, 0) || 0;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Calculate top cities
    const cityStats =
      orders?.reduce((acc, order) => {
        if (!acc[order.city]) {
          acc[order.city] = { count: 0, revenue: 0 };
        }
        acc[order.city].count++;
        acc[order.city].revenue += order.total;
        return acc;
      }, {} as Record<string, { count: number; revenue: number }>) || {};

    const topCities = Object.entries(cityStats)
      .map(([city, stats]) => ({
        city,
        count: (stats as { count: number; revenue: number }).count,
        revenue: (stats as { count: number; revenue: number }).revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const recentOrders = orders?.slice(0, 5) || [];

    return {
      totalOrders,
      totalRevenue,
      averageOrderValue,
      topCities,
      recentOrders,
    };
  } catch (error) {
    console.error("Error calculating order stats:", error);
    return {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      topCities: [],
      recentOrders: [],
    };
  }
};

// Delete order (admin only)
export const deleteOrder = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from("orders").delete().eq("id", id);

    if (error) {
      console.error("Error deleting order:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error deleting order:", error);
    return false;
  }
};

// Get orders by date range
export const getOrdersByDateRange = async (
  startDate: string,
  endDate: string
): Promise<Order[]> => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .gte("order_date", startDate)
      .lte("order_date", endDate)
      .order("order_date", { ascending: false });

    if (error) {
      console.error("Error fetching orders by date range:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching orders by date range:", error);
    return [];
  }
};

// Get orders count by status/city
export const getOrdersAnalytics = async () => {
  try {
    const { data: orders, error } = await supabase.from("orders").select("*");

    if (error) {
      console.error("Error fetching orders analytics:", error);
      return null;
    }

    const analytics = {
      totalOrders: orders?.length || 0,
      totalRevenue: orders?.reduce((sum, order) => sum + order.total, 0) || 0,
      ordersByCity:
        orders?.reduce((acc, order) => {
          acc[order.city] = (acc[order.city] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {},
      ordersByMonth:
        orders?.reduce((acc, order) => {
          const month = new Date(order.order_date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
          });
          acc[month] = (acc[month] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {},
      averageOrderValue: orders?.length
        ? orders.reduce((sum, order) => sum + order.total, 0) / orders.length
        : 0,
    };

    return analytics;
  } catch (error) {
    console.error("Error fetching orders analytics:", error);
    return null;
  }
};
