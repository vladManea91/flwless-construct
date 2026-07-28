/**
 * Unelte comune pentru testele QA și testele de clase.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";
import * as yaml from "js-yaml";

export const RADACINA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const SITE = path.join(RADACINA, "_site");
export const SRC = path.join(RADACINA, "src");

export function existaBuild() {
  return fs.existsSync(path.join(SITE, "index.html"));
}

/** Toate fișierele dintr-un folder, recursiv. */
export function fisiere(dir, filtru = () => true) {
  const rezultat = [];
  if (!fs.existsSync(dir)) return rezultat;
  for (const intrare of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, intrare.name);
    if (intrare.isDirectory()) rezultat.push(...fisiere(p, filtru));
    else if (filtru(p)) rezultat.push(p);
  }
  return rezultat;
}

/** Toate paginile HTML construite, cu adresa lor publică. */
export function pagini() {
  return fisiere(SITE, (p) => p.endsWith(".html")).map((fisier) => {
    const relativ = "/" + path.relative(SITE, fisier).split(path.sep).join("/");
    const url = relativ.endsWith("/index.html") ? relativ.slice(0, -"index.html".length) : relativ;
    return {
      fisier,
      url,
      html: fs.readFileSync(fisier, "utf8"),
      get $() { return cheerio.load(fs.readFileSync(fisier, "utf8")); }
    };
  });
}

export function pagina(url) {
  const gasita = pagini().find((p) => p.url === url);
  if (!gasita) throw new Error(`Pagina ${url} nu a fost construită`);
  return gasita;
}

export const citeste = (p) => fs.readFileSync(path.join(RADACINA, p), "utf8");
export const citesteJson = (p) => JSON.parse(citeste(p));
export const citesteYaml = (p) => yaml.load(citeste(p));

/** Desface adresa Netlify Image CDN și întoarce calea reală a fișierului. */
export function sursaReala(src) {
  if (!src) return null;
  if (/^https?:\/\//.test(src)) return null;
  if (src.startsWith("/.netlify/images")) {
    const q = new URLSearchParams(src.split("?")[1] || "");
    return q.get("url");
  }
  return src;
}

/** Verifică dacă un fișier public există în build. */
export function existaInBuild(caleaPublica) {
  if (!caleaPublica || !caleaPublica.startsWith("/")) return false;
  return fs.existsSync(path.join(SITE, caleaPublica.replace(/^\//, "")));
}

/** Front matter dintr-un fișier markdown. */
export function frontMatter(fisier) {
  const text = fs.readFileSync(fisier, "utf8");
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  return yaml.load(m[1]) || {};
}

// ---------------------------------------------------------------------------
// Culori: rezolvă variabilele CSS și color-mix, ca să putem testa contrastul.
// ---------------------------------------------------------------------------

export function citesteTokens(css) {
  const bloc = css.match(/:root\s*\{([\s\S]*?)\n\}/);
  if (!bloc) return {};
  const tokens = {};
  for (const m of bloc[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    tokens[m[1]] = m[2].trim();
  }
  return tokens;
}

const hexRgb = (hex) => {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};

/** Rezolvă o valoare de culoare la [r,g,b]. Întoarce null pentru transparent. */
export function rezolvaCuloare(valoare, tokens, adancime = 0) {
  if (adancime > 12) throw new Error("referință circulară între culori");
  const v = String(valoare).trim();

  if (v === "transparent") return null;
  if (v.startsWith("#")) return hexRgb(v);

  const varMatch = v.match(/^var\((--[\w-]+)\)$/);
  if (varMatch) {
    const t = tokens[varMatch[1]];
    if (!t) throw new Error(`token necunoscut: ${varMatch[1]}`);
    return rezolvaCuloare(t, tokens, adancime + 1);
  }

  const mix = v.match(/^color-mix\(in srgb,\s*(.+?)\s+([\d.]+)%,\s*(.+?)\)$/);
  if (mix) {
    const a = rezolvaCuloare(mix[1], tokens, adancime + 1);
    const b = rezolvaCuloare(mix[3], tokens, adancime + 1);
    const p = Number(mix[2]) / 100;
    if (a === null || b === null) return null; // amestec cu transparent
    return [0, 1, 2].map((i) => Math.round(a[i] * p + b[i] * (1 - p)));
  }

  throw new Error(`nu pot rezolva culoarea: ${v}`);
}

const canal = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

export const luminanta = ([r, g, b]) => 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);

export function contrast(a, b) {
  const [l1, l2] = [luminanta(a), luminanta(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
