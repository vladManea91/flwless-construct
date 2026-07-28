import { getStore } from "@netlify/blobs";

export const config = { path: "/api/track" };

const SHARDS = 2;

const gol = () => ({
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
});

const numara = (obiect, cheie, cat = 1) => {
  if (!cheie) return;
  const k = String(cheie).slice(0, 120);
  obiect[k] = (obiect[k] || 0) + cat;
};

const sursaDin = (referinta) => {
  if (!referinta) return "direct";
  try {
    const gazda = new URL(referinta).hostname.replace(/^www\./, "");
    return gazda || "direct";
  } catch {
    return "direct";
  }
};

const numeSursa = (gazda) => {
  const harta = {
    "google.com": "Google", "google.ro": "Google", "google.de": "Google",
    "bing.com": "Bing", "duckduckgo.com": "DuckDuckGo",
    "facebook.com": "Facebook", "m.facebook.com": "Facebook", "l.facebook.com": "Facebook",
    "instagram.com": "Instagram", "l.instagram.com": "Instagram",
    "tiktok.com": "TikTok", "youtube.com": "YouTube",
    "linkedin.com": "LinkedIn", "lnkd.in": "LinkedIn",
    "t.co": "X (Twitter)", "x.com": "X (Twitter)",
    "olx.ro": "OLX", "chat.openai.com": "ChatGPT", "chatgpt.com": "ChatGPT",
    "claude.ai": "Claude", "perplexity.ai": "Perplexity"
  };
  return harta[gazda] || gazda;
};

const dispozitiv = (latime) => {
  const w = Number(latime) || 0;
  if (w && w < 640) return "telefon";
  if (w && w < 1024) return "tabletă";
  return "desktop";
};

export default async (req, context) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let date;
  try {
    date = await req.json();
  } catch {
    return new Response("", { status: 204 });
  }

  const gazdaProprie = new URL(req.url).hostname;
  const zi = new Date().toISOString().slice(0, 10);
  const shard = Math.floor(Math.random() * SHARDS);
  const cheie = `zi/${zi}/${shard}`;

  const store = getStore({ name: "analitice", consistency: "strong" });

  let stare;
  try {
    stare = (await store.get(cheie, { type: "json" })) || gol();
  } catch {
    stare = gol();
  }
  stare = { ...gol(), ...stare };

  if (date.tip === "eveniment") {
    numara(stare.evenimente, date.nume);
  } else {
    stare.vizualizari += 1;
    if (date.vizita_noua) stare.vizite += 1;

    numara(stare.pagini, date.cale || "/");
    numara(stare.dispozitive, dispozitiv(date.latime));
    numara(stare.tari, (context.geo && context.geo.country && context.geo.country.name) || "necunoscut");

    const gazda = sursaDin(date.referinta);
    const intern = gazda === gazdaProprie;

    if (date.utm_source) {
      numara(stare.surse, date.utm_source);
      numara(stare.medii, date.utm_medium || "necunoscut");
      numara(stare.campanii, date.utm_campaign || "fără nume");
    } else if (intern) {
      // navigare în interiorul site-ului, nu e sursă nouă
    } else {
      numara(stare.surse, numeSursa(gazda));
      if (gazda !== "direct") numara(stare.referinte, gazda);
    }
  }

  try {
    await store.setJSON(cheie, stare);
  } catch {
    // dacă scrierea eșuează, pagina nu are de suferit
  }

  return new Response("", { status: 204 });
};
