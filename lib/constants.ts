/**
 * Application-wide Constants
 * Centralized configuration for API endpoints, validation rules, and default values
 */

// =============================================================================
// API Configuration
// =============================================================================

// Debug: Log the environment variable at build time
const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
console.log(
  "[API Config] NEXT_PUBLIC_API_BASE_URL:",
  process.env.NEXT_PUBLIC_API_BASE_URL
);
console.log("[API Config] Final BASE_URL:", baseUrl);

export const API = {
  BASE_URL: "https://navtrack.navgurukul.org/api",
  TIMEOUT_MS: 10000,
} as const;

export const DEV_PROXY = {
  BACKEND_URL: process.env.BACKEND_PROXY_TARGET || "http://localhost:9900",
  FRONTEND_API_PREFIX: "/api",
} as const;

// =============================================================================
// API Endpoints
// =============================================================================

export const API_PATHS = {
  AUTH_LOGIN: "/v1/auth/login",
  AUTH_REFRESH: "/v1/auth/refresh",
  AUTH_ME: "/v1/auth/me",
  ACTIVITIES_SUBMIT: "/v1/timesheets",
  MONTHLY_TIMESHEET: "/v1/timesheets/monthly",
  LEAVES_APPLICATION: "/v1/leaves/application",
  LEAVES_REQUESTS: "/v1/leaves/requests",
  LEAVES_HISTORY: "/v1/leaves/history",
  LEAVES_BALANCES: "/v1/leaves/balances",
  EMPLOYEES: "/v1/users",
  COMPOFF_REQUEST: "/v1/leaves/comp-offs",
  LEAVES_TYPES: "/v1/leaves/types",
  PROJECTS: "/v1/projects",
  DEPARTMENTS: "/v1/departments",
} as const;

export type ApiPathKey = keyof typeof API_PATHS;

// =============================================================================
// Application Routes
// =============================================================================

export const AUTH_ROUTES = {
  LOGIN: "/auth/login",
} as const;

// Auth endpoint substrings for checking if URL is an auth endpoint
export const AUTH_ENDPOINT_SUBSTRINGS = {
  LOGIN: "/auth/login",
  REFRESH: "/auth/refresh",
  ME: "/auth/me",
} as const;

// =============================================================================
// Date Formats
// =============================================================================

export const DATE_FORMATS = {
  /** Display format for user-facing dates (e.g., "January 1, 2024") */
  DISPLAY: "PPP",
  /** API format for backend communication (e.g., "2024-01-01") */
  API: "yyyy-MM-dd",
} as const;

// =============================================================================
// Validation Rules
// =============================================================================

export const VALIDATION = {
  /** Minimum hours allowed per activity entry */
  MIN_HOURS_PER_ENTRY: 0.5,
  /** Maximum hours allowed per activity entry */
  MAX_HOURS_PER_ENTRY: 15,
  /** Maximum total hours allowed per day across all entries */
  MAX_TOTAL_HOURS_PER_DAY: 15,
  /** Step value for hours input field */
  HOURS_INPUT_STEP: 0.5,
  /** Minimum characters for task description */
  MIN_TASK_DESCRIPTION_LENGTH: 10,
  /** Minimum characters for leave reason */
  MIN_LEAVE_REASON_LENGTH: 10,
} as const;

// =============================================================================
// HTTP Headers
// =============================================================================

export const HEADERS = {
  CONTENT_TYPE_JSON: "application/json",
  CROSS_ORIGIN_OPENER_POLICY: "same-origin-allow-popups",
} as const;

// =============================================================================
// UI Constants
// =============================================================================

export const RESPONSIVE_WIDTHS = {
  /** Maximum width for two-column layout container */
  MAX_CONTAINER_WIDTH: "1600px",
  /** Minimum width for cards */
  MIN_CARD_WIDTH: "180px",
} as const;

// =============================================================================
// Mock Data Defaults (to be replaced with API data)
// =============================================================================

export const DEFAULT_USER_EMAIL = "john.doe@company.com";
