/**
 * Token Service
 * Manages authentication tokens in localStorage
 */

export interface UserData {
  id?: number;
  email: string;
  name?: string;
  avatarUrl?: string;
  orgId?: number;
  roles?: string[];
  permissions?: string[];
  managerId?: number | null;
  departmentId?: number;
  department?: {
    id: number;
    name: string;
    code: string;
    description?: string | null;
  };
  backfill?: {
    limit: number;
    remaining: number;
  };
}

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_DATA_KEY = "AUTH";

export const tokenService = {
  /**
   * Get access token from localStorage
   */
  getAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  /**
   * Get refresh token from localStorage
   */
  getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  /**
   * Get user data from localStorage
   */
  getUserData(): UserData | null {
    if (typeof window === "undefined") return null;
    const data = localStorage.getItem(USER_DATA_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  /**
   * Set authentication tokens
   * Validates tokens before storing
   */
  setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === "undefined") return;

    // Validate tokens are non-empty
    if (!accessToken || !refreshToken) {
      console.error("Attempted to set invalid tokens:", {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
      });
      throw new Error("Cannot store empty tokens");
    }

    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  /**
   * Set user data
   */
  setUserData(userData: UserData): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
  },

  /**
   * Clear all authentication data
   */
  clearAll(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
  },

  /**
   * Check if user is authenticated (has access token)
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  },
};
