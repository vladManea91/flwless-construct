import { getStore } from "@netlify/blobs";
import { agregheaza, cheiPentruInterval, normalizeazaZile } from "../../lib/analitice.mjs";

export const config = { path: "/api/stats" };

export default async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const asteptat = process.env.ANALYTICS_TOKEN || "";

  if (!asteptat) {
    return Response.json(
      { eroare: "Variabila ANALYTICS_TOKEN nu este setată în Netlify." },
      { status: 500 }
    );
  }
  if (token !== asteptat) {
    return Response.json({ eroare: "Parolă greșită." }, { status: 401 });
  }

  const zile = normalizeazaZile(url.searchParams.get("zile"));
  const store = getStore({ name: "analitice", consistency: "strong" });

  const bucati = await Promise.all(
    cheiPentruInterval(zile).map(async ({ zi, cheie }) => {
      try {
        const valoare = await store.get(cheie, { type: "json" });
        return valoare ? { zi, valoare } : null;
      } catch {
        return null;
      }
    })
  );

  return Response.json(agregheaza(bucati, zile), {
    headers: { "Cache-Control": "no-store" }
  });
};
