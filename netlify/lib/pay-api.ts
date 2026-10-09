// Outside the function folders so Netlify doesn't take it for a function: the API base the pay functions share.
// Same variable and production fallback as src/lib/api.ts.
export const payApiUrl = () => Netlify.env.get("VITE_API_URL") || "https://tsa.mcgpchain.com/api";
