/**
 * API base URL configuration.
 *
 * In development (localhost), points to the local FastAPI server.
 * In production (Render or any other host), requests go to the same origin
 * since the FastAPI backend also serves the built frontend assets.
 */
const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const envApiUrl = (import.meta as any).env?.VITE_API_URL;
const windowApiUrl = (window as any).__API_BASE__;

export const API_BASE = envApiUrl || windowApiUrl || (isLocalhost ? "http://localhost:8000" : "");

