/**
 * Logica statisticilor, separată de funcțiile Netlify ca să fie testabilă.
 * Aici nu se face nicio operație de rețea și nicio scriere pe disc.
 */

export const SHARDS = 2;

export const gol = () => ({
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

/** Crește un contor dintr-un obiect, ignorând cheile goale. */
export function numara(obiect, cheie, cat = 1) {
  if (cheie === undefined || cheie === null || cheie === "") return obiect;
  const k = String(cheie).slice(0, 120);
  obiect[k] = (obiect[k] || 0) + cat;
  return obiect;
}

/** Din adresa de proveniență scoate doar gazda, fără www. */
export function sursaDin(referinta) {
  if (!referinta) return "direct";
  try {
    const gazda = new URL(referinta).hostname.replace(/^www\./, "");
    return gazda || "direct";
  } catch {
    return "direct";
  }
}

const NUME = {
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

/** Nume prietenos pentru o gazdă cunoscută. */
export function numeSursa(gazda) {
  return NUME[gazda] || gazda;
}

/** Împarte vizitatorii pe tip de ecran. */
export function dispozitiv(latime) {
  const w = Number(latime) || 0;
  if (w > 0 && w < 640) return "telefon";
  if (w > 0 && w < 1024) return "tabletă";
  return "desktop";
}

/**
 * Aplică un eveniment primit de la browser peste starea unei zile.
 * Întoarce o stare nouă, nu o modifică pe cea primită.
 */
export function aplica(stare, date, gazdaProprie, tara = "necunoscut") {
  const s = { ...gol(), ...(stare || {}) };
  for (const cheie of ["pagini", "surse", "referinte", "campanii", "medii", "dispozitive", "tari", "evenimente"]) {
    s[cheie] = { ...s[cheie] };
  }

  if (date.tip === "eveniment") {
    numara(s.evenimente, date.nume);
    return s;
  }

  s.vizualizari += 1;
  if (date.vizita_noua) s.vizite += 1;

  numara(s.pagini, date.cale || "/");
  numara(s.dispozitive, dispozitiv(date.latime));
  numara(s.tari, tara || "necunoscut");

  const gazda = sursaDin(date.referinta);
  const intern = gazda === gazdaProprie;

  if (date.utm_source) {
    numara(s.surse, date.utm_source);
    numara(s.medii, date.utm_medium || "necunoscut");
    numara(s.campanii, date.utm_campaign || "fără nume");
  } else if (!intern) {
    numara(s.surse, numeSursa(gazda));
    if (gazda !== "direct") numara(s.referinte, gazda);
  }

  return s;
}

/** Adună contoarele din sursă în țintă. */
export function adunaObiecte(tinta, sursa) {
  for (const [cheie, valoare] of Object.entries(sursa || {})) {
    tinta[cheie] = (tinta[cheie] || 0) + valoare;
  }
  return tinta;
}

/** Primele n intrări dintr-un obiect de contoare, ordonate descrescător. */
export function top(obiect, limita = 10) {
  return Object.entries(obiect || {})
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
    .slice(0, limita)
    .map(([nume, numar]) => ({ nume, numar }));
}

/** Cheile de citit pentru un interval de zile, terminând cu ziua curentă. */
export function cheiPentruInterval(zile, acum = new Date()) {
  const chei = [];
  for (let i = 0; i < zile; i++) {
    const d = new Date(acum);
    d.setUTCDate(d.getUTCDate() - i);
    const zi = d.toISOString().slice(0, 10);
    for (let s = 0; s < SHARDS; s++) chei.push({ zi, cheie: `zi/${zi}/${s}` });
  }
  return chei;
}

/** Limitează intervalul cerut la ceva rezonabil. */
export function normalizeazaZile(valoare) {
  const n = parseInt(valoare, 10);
  if (Number.isNaN(n)) return 30;
  return Math.min(Math.max(n, 1), 90);
}

/** Combină bucățile citite din depozit într-un singur raport. */
export function agregheaza(bucati, zile, acum = new Date()) {
  const total = gol();
  const peZi = {};

  for (const bucata of bucati) {
    if (!bucata || !bucata.valoare) continue;
    const v = bucata.valoare;
    total.vizualizari += v.vizualizari || 0;
    total.vizite += v.vizite || 0;
    peZi[bucata.zi] = (peZi[bucata.zi] || 0) + (v.vizualizari || 0);
    for (const cheie of ["pagini", "surse", "referinte", "campanii", "medii", "dispozitive", "tari", "evenimente"]) {
      adunaObiecte(total[cheie], v[cheie]);
    }
  }

  const serie = [];
  for (let i = zile - 1; i >= 0; i--) {
    const d = new Date(acum);
    d.setUTCDate(d.getUTCDate() - i);
    const zi = d.toISOString().slice(0, 10);
    serie.push({ zi, numar: peZi[zi] || 0 });
  }

  return {
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
  };
}
