// In a subfolder so Netlify doesn't take it for a function: the API base shared by the pay edge functions.
// Same variable and production fallback as src/lib/api.ts.
export const payApiUrl = () => Netlify.env.get("VITE_API_URL") || "https://tsa.mcgpchain.com/api";
