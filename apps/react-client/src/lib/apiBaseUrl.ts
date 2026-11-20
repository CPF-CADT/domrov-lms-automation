declare global {
  interface Window {
    __DOMROV_CONFIG__?: { apiBaseUrl?: string };
  }
}

const fallbackApiUrl = import.meta.env.DEV ? "http://localhost:8088" : "";

function resolveApiBaseUrl(): string {
  const configuredUrl = window.__DOMROV_CONFIG__?.apiBaseUrl?.trim()
    || import.meta.env.VITE_API_URL?.trim()
    || fallbackApiUrl;
  try {
    const url = new URL(configuredUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("VITE_API_URL must use HTTP or HTTPS");
    }
    if (import.meta.env.PROD && url.protocol !== "https:") {
      throw new Error("VITE_API_URL must use HTTPS in production builds");
    }
    // Local browser traffic must use the Compose gateway. Port 3000 is the
    // gateway's internal legacy upstream and is not a browser-facing API.
    if (import.meta.env.DEV && (url.hostname === "localhost" || url.hostname === "127.0.0.1") && url.port === "3000") {
      url.port = "8088";
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    if (!fallbackApiUrl) {
      throw new Error("VITE_API_URL must be an absolute URL in production builds");
    }
    return fallbackApiUrl;
  }
}

export const API_BASE_URL = resolveApiBaseUrl();
