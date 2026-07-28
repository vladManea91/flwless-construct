import { getStore } from "@netlify/blobs";

export const config = { path: "/api/stats" };

const SHARDS = 2;

const adunaObiecte = (tinta, sursa) => {
  for (const [cheie, valoare] of Object.entries(sursa || {})) {
    tinta[cheie] = (tinta[cheie] || 0) + valoare;
  }
};

const top = (obiect, limita = 10) =>
  Object.entries(obiect)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limita)
    .map(([nume, numar]) => ({ nume, numar }));

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

  const zile = Math.min(Math.max(parseInt(url.searchParams.get("zile") || "30", 10), 1), 90);
  const store = getStore({ name: "analitice", consistency: "strong" });

  const chei = [];
  const azi = new Date();
  for (let i = 0; i < zile; i++) {
    const d = new Date(azi);
    d.setUTCDate(d.getUTCDate() - i);
    const zi = d.toISOString().slice(0, 10);
    for (let s = 0; s < SHARDS; s++) chei.push({ zi, cheie: `zi/${zi}/${s}` });
  }

  const bucati = await Promise.all(
    chei.map(async ({ zi, cheie }) => {
      try {
        const valoare = await store.get(cheie, { type: "json" });
        return valoare ? { zi, valoare } : null;
      } catch {
        return null;
      }
    })
  );

  const total = {
    vizualizari: 0,
    vizite: 0,
    pagini: {},
    surse: {},
    referinte: {},
    campanii: {},
    medii: {},
    dispozitive: {},
    tari: {},
    evenimente: {}
  };
  const peZi = {};

  for (const bucata of bucati) {
    if (!bucata) continue;
    const v = bucata.valoare;
    total.vizualizari += v.vizualizari || 0;
    total.vizite += v.vizite || 0;
    peZi[bucata.zi] = (peZi[bucata.zi] || 0) + (v.vizualizari || 0);
    adunaObiecte(total.pagini, v.pagini);
    adunaObiecte(total.surse, v.surse);
    adunaObiecte(total.referinte, v.referinte);
    adunaObiecte(total.campanii, v.campanii);
    adunaObiecte(total.medii, v.medii);
    adunaObiecte(total.dispozitive, v.dispozitive);
    adunaObiecte(total.tari, v.tari);
    adunaObiecte(total.evenimente, v.evenimente);
  }

  const serie = [];
  for (let i = zile - 1; i >= 0; i--) {
    const d = new Date(azi);
    d.setUTCDate(d.getUTCDate() - i);
    const zi = d.toISOString().slice(0, 10);
    serie.push({ zi, numar: peZi[zi] || 0 });
  }

  return Response.json(
    {
      zile,
      vizualizari: total.vizualizari,
      vizite: total.vizite,
      serie,
      pagini: top(total.pagini),
      surse: top(total.surse),
      referinte: top(total.referinte),
      campanii: top(total.campanii),
      medii: top(total.medii),
      dispozitive: top(total.dispozitive, 5),
      tari: top(total.tari),
      evenimente: top(total.evenimente)
    },
    { headers: { "Cache-Control": "no-store" } }
  );
};
