import { supabase } from "@/lib/supabase";

export interface User {
  id: string;
  username: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}

// Admin authentication function
export const authenticateAdmin = async (
  credentials: LoginCredentials
): Promise<AuthResponse> => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", credentials.username)
      .eq("password", credentials.password)
      .eq("is_active", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return {
          success: false,
          error: "Invalid username or password",
        };
      }
      return {
        success: false,
        error: "Authentication failed",
      };
    }

    if (!data) {
      return {
        success: false,
        error: "Invalid username or password",
      };
    }

    // Store authentication in localStorage
    localStorage.setItem(
      "admin_auth",
      JSON.stringify({
        user: data,
        timestamp: new Date().getTime(),
      })
    );

    return {
      success: true,
      user: data,
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return {
      success: false,
      error: "Authentication failed",
    };
  }
};

// Check if admin is authenticated
export const isAdminAuthenticated = (): boolean => {
  try {
    const authData = localStorage.getItem("admin_auth");
    if (!authData) return false;

    const { user, timestamp } = JSON.parse(authData);
    const now = new Date().getTime();
    const authAge = now - timestamp;

    // Session expires after 24 hours
    if (authAge > 24 * 60 * 60 * 1000) {
      localStorage.removeItem("admin_auth");
      return false;
    }

    return user && user.role === "admin" && user.is_active;
  } catch (error) {
    console.error("Auth check error:", error);
    return false;
  }
};

// Get current admin user
export const getCurrentAdmin = (): User | null => {
  try {
    const authData = localStorage.getItem("admin_auth");
    if (!authData) return null;

    const { user } = JSON.parse(authData);
    return user;
  } catch (error) {
    console.error("Get current admin error:", error);
    return null;
  }
};

// Logout admin
export const logoutAdmin = (): void => {
  localStorage.removeItem("admin_auth");
};

// Refresh authentication (extend session)
export const refreshAuthentication = (): void => {
  const authData = localStorage.getItem("admin_auth");
  if (authData) {
    const { user } = JSON.parse(authData);
    localStorage.setItem(
      "admin_auth",
      JSON.stringify({
        user,
        timestamp: new Date().getTime(),
      })
    );
  }
};
