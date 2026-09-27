// Shared by every fetch-calling module (private-sale form, TSA Pay checkout)
// so the API base URL resolves the same way everywhere — see this repo's
// CLAUDE.md "Env" section.
const PRODUCTION_API_URL = "https://tsa.mcgpchain.com/api";
const DEV_FALLBACK_API_URL = "http://localhost:5000/api";

/**
 * Resolves the API base URL from VITE_API_URL.
 *
 * In a production build, a missing env var falls back to the real
 * production API rather than localhost: if the deploy host ever forgets to
 * set VITE_API_URL, every request would otherwise silently target
 * localhost and fail for every real visitor, with nothing to catch it at
 * build time. In dev, it falls back to the backend's default dev port.
 */
export const API_URL: string =
  import.meta.env.VITE_API_URL || (import.meta.env.PROD ? PRODUCTION_API_URL : DEV_FALLBACK_API_URL);
