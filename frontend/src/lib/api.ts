import { auth } from "./auth";

/**
 * Production-ready API Client for Lead Generator Frontend.
 * Automatically handles base URL resolution, headers, and JWT auth tokens.
 */
const getBaseUrl = (): string => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "");
  }
  // In production (served via Nginx), relative '/api' works seamlessly
  if (import.meta.env.PROD) {
    return "/api";
  }
  // Fallback for local Vite dev server
  return "http://localhost:8000/api";
};

export const API_BASE_URL = getBaseUrl();

export const api = {
  /**
   * Helper method for REST GET requests
   */
  async get<T = any>(endpoint: string): Promise<T> {
    const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...auth.getAuthHeader(),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP Error ${response.status}`);
    }

    return response.json();
  },

  /**
   * Helper method for REST POST requests
   */
  async post<T = any>(endpoint: string, body?: any): Promise<T> {
    const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...auth.getAuthHeader(),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP Error ${response.status}`);
    }

    return response.json();
  },

  /**
   * Dynamically resolves the WebSocket URL for live task log streaming.
   */
  getWsUrl(): string {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    if (import.meta.env.VITE_WS_URL) {
      return import.meta.env.VITE_WS_URL;
    }
    if (import.meta.env.PROD) {
      return `${protocol}//${window.location.host}/api/ws`;
    }
    return "ws://localhost:8000/api/ws";
  },
};
