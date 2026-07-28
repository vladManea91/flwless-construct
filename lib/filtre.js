/**
 * Logica filtrelor, scoasă din eleventy.config.js ca să poată fi testată
 * separat, fără să pornim tot Eleventy.
 */

const LATIMI = [480, 768, 1080, 1600, 2000];

const LUNI = [
  "ianuarie", "februarie", "martie", "aprilie", "mai", "iunie",
  "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"
];

const esteExtern = (src) => /^https?:\/\//.test(src);

/** Construiește o adresă Netlify Image CDN pentru o poză locală. */
function cdn(src, width = 1200, ratio = null) {
  if (!src) return "";
  if (esteExtern(src)) return src;
  let url = `/.netlify/images?url=${encodeURIComponent(src)}&w=${width}&fit=cover`;
  if (ratio) url += `&h=${Math.round(width * ratio)}`;
  return url;
}

/** Listă de variante pentru atributul srcset, limitată la o lățime maximă. */
function srcset(src, ratio = null, maxim = 2000) {
  if (!src || esteExtern(src)) return "";
  return LATIMI.filter((w) => w <= maxim)
    .map((w) => `${cdn(src, w, ratio)} ${w}w`)
    .join(", ");
}

function dataRo(valoare) {
  if (!valoare) return "";
  const d = new Date(valoare);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCDate()} ${LUNI[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function anul(valoare) {
  if (!valoare) return "";
  const d = new Date(valoare);
  if (Number.isNaN(d.getTime())) return "";
  return d.getUTCFullYear();
}

function isoDate(valoare) {
  if (!valoare) return "";
  const d = new Date(valoare);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/** Taie textul la o limită, fără să rupă un cuvânt în două. */
function scurt(text, limita = 160) {
  const curat = String(text || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (curat.length <= limita) return curat;
  const taiat = curat.slice(0, limita);
  const ultimulSpatiu = taiat.lastIndexOf(" ");
  return (ultimulSpatiu > limita * 0.6 ? taiat.slice(0, ultimulSpatiu) : taiat).trim() + "…";
}

/** Curăță un număr de telefon pentru href="tel:". */
function telLink(nr) {
  return String(nr || "").replace(/[^\d+]/g, "");
}

function unice(arr) {
  return [...new Set((arr || []).filter(Boolean))];
}

/** Slug fără diacritice românești. */
function slugRo(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[ăâ]/g, "a")
    .replace(/î/g, "i")
    .replace(/[șş]/g, "s")
    .replace(/[țţ]/g, "t")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function head(arr, n) {
  if (!Array.isArray(arr)) return [];
  return n < 0 ? arr.slice(n) : arr.slice(0, n);
}

module.exports = {
  LATIMI, LUNI,
  cdn, srcset, dataRo, anul, isoDate, scurt, telLink, unice, slugRo, head
};
