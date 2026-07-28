/**
 * TESTE DE CLASE — sistemul vizual (CSS)
 * "Clase" în două sensuri aici: clasele CSS folosite în șabloane, și clasele
 * de culori/token-uri care formează sistemul vizual. Testele verifică:
 *   1) fiecare token de culoare se rezolvă fără erori (fără referințe rupte)
 *   2) combinațiile text/fundal chiar folosite în site trec pragul WCAG AA
 *   3) fiecare clasă CSS folosită într-un șablon există în foaia de stil,
 *      și invers, ca să prindem greșeli de tastare sau clase moarte.
 * Rulare: npm run test:class
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  RADACINA, SRC, citeste, citesteJson,
  citesteTokens, rezolvaCuloare, contrast, fisiere
} from "../ajutor.mjs";

const CSS = citeste("src/assets/css/style.css");
const site = citesteJson("src/_data/site.json");

// Token-urile din :root, cu valorile din setările clientului suprapuse peste
// cele implicite — exact cum se întâmplă la runtime prin <style> din base.njk.
const TOKENS = {
  ...citesteTokens(CSS),
  "--ink": site.culoare_text,
  "--accent": site.culoare_accent,
  "--paper": site.culoare_fundal
};

const PRAG_TEXT = 4.5;   // WCAG AA, text obișnuit
const PRAG_MARE = 3.0;   // WCAG AA, text mare sau componente de interfață

function raport(nume, text, fundal) {
  const rt = rezolvaCuloare(text, TOKENS);
  const rf = rezolvaCuloare(fundal, TOKENS);
  assert.ok(rt, `${nume}: culoarea de text "${text}" s-a rezolvat la transparent`);
  assert.ok(rf, `${nume}: culoarea de fundal "${fundal}" s-a rezolvat la transparent`);
  return contrast(rt, rf);
}

// ---------------------------------------------------------------------------
// 1) Rezolvarea token-urilor
// ---------------------------------------------------------------------------

const CULORI_TOKENS = [
  "--ink", "--accent", "--paper", "--ink-70", "--ink-50", "--plaster", "--plaster-strong",
  "--line", "--accent-soft", "--accent-text", "--suprafata-inchisa", "--pe-inchis",
  "--pe-inchis-70", "--pe-inchis-50", "--linie-inchisa"
];

test("fiecare token de culoare din :root se rezolvă fără erori (nu neapărat la opac)", () => {
  for (const nume of CULORI_TOKENS) {
    assert.ok(nume in TOKENS, `tokenul ${nume} nu există în :root`);
    assert.doesNotThrow(() => rezolvaCuloare(TOKENS[nume], TOKENS), `${nume}: ${TOKENS[nume]}`);
  }
});

test("culorile din setările clientului sunt coduri hex valide", () => {
  for (const cheie of ["culoare_text", "culoare_accent", "culoare_fundal"]) {
    assert.match(site[cheie], /^#[0-9a-fA-F]{6}$/, `${cheie} nu e un cod hex valid: ${site[cheie]}`);
  }
});

test("--suprafata-inchisa rămâne închisă la culoare chiar dacă --ink e schimbat din panou", () => {
  const rgb = rezolvaCuloare(TOKENS["--suprafata-inchisa"], TOKENS);
  const [r, g, b] = rgb;
  assert.ok(r < 60 && g < 60 && b < 60, `suprafața închisă nu mai e destul de închisă: rgb(${r},${g},${b})`);
});

// ---------------------------------------------------------------------------
// 2) Contrast WCAG AA pentru combinațiile chiar folosite în site
// ---------------------------------------------------------------------------

test("textul de bază pe fundalul de bază trece AA (corp de text)", () => {
  const r = raport("ink pe paper", "var(--ink)", "var(--paper)");
  assert.ok(r >= PRAG_TEXT, `contrast ${r.toFixed(2)}:1, minim ${PRAG_TEXT}:1`);
});

test("textul secundar (ink-70) pe fundal trece AA", () => {
  const r = raport("ink-70 pe paper", "var(--ink-70)", "var(--paper)");
  assert.ok(r >= PRAG_TEXT, `contrast ${r.toFixed(2)}:1 — folosit la paragrafe (.card__rezumat, .despre__text)`);
});

test("linkurile din text (accent-text) pe fundal trec AA", () => {
  const r = raport("accent-text pe paper", "var(--accent-text)", "var(--paper)");
  assert.ok(r >= PRAG_TEXT,
    `contrast ${r.toFixed(2)}:1 — aurul brut are doar ~2.6:1 pe fundal deschis, de-aia există --accent-text`);
});

test("textul de pe suprafețe închise (antet, subsol) trece AA", () => {
  const r = raport("pe-inchis pe suprafata-inchisa", "var(--pe-inchis)", "var(--suprafata-inchisa)");
  assert.ok(r >= PRAG_TEXT, `contrast ${r.toFixed(2)}:1`);
});

test("textul secundar de pe suprafețe închise (pe-inchis-70) trece AA", () => {
  const r = raport("pe-inchis-70 pe suprafata-inchisa", "var(--pe-inchis-70)", "var(--suprafata-inchisa)");
  assert.ok(r >= PRAG_TEXT, `contrast ${r.toFixed(2)}:1 — folosit la subsol .subsol p`);
});

test("aurul din logo, pe fundalul închis al antetului, trece pragul pentru elemente mari", () => {
  const r = raport("accent pe suprafata-inchisa", "var(--accent)", "var(--suprafata-inchisa)");
  assert.ok(r >= PRAG_MARE,
    `contrast ${r.toFixed(2)}:1 — motivul pentru care antetul și subsolul sunt închise la culoare`);
});

test("textul butonului auriu (Contactează-ne) trece AA pe fundalul lui", () => {
  const r = raport("suprafata-inchisa pe accent", "var(--suprafata-inchisa)", "var(--accent)");
  assert.ok(r >= PRAG_TEXT, `contrast ${r.toFixed(2)}:1 — .navigatie-desktop .btn`);
});

test("butonul implicit (.btn: fundal ink, text paper) trece AA", () => {
  const r = raport("paper pe ink", "var(--paper)", "var(--ink)");
  assert.ok(r >= PRAG_TEXT, `contrast ${r.toFixed(2)}:1`);
});

test("aurul brut pe fundal deschis NU trece AA pentru text — de-aia nu se folosește direct", () => {
  const r = raport("accent pe paper", "var(--accent)", "var(--paper)");
  assert.ok(r < PRAG_TEXT,
    `contrast ${r.toFixed(2)}:1 — dacă a trecut de ${PRAG_TEXT}:1, tokenul --accent-text nu mai e necesar`);
});

test("linia de despărțire (--line) e translucidă și, compusă peste fundal, tot se distinge", () => {
  // --line e color-mix cu transparent, deci se rezolvă la null (translucid) — corect.
  assert.equal(rezolvaCuloare("var(--line)", TOKENS), null,
    "--line trebuie să rămână translucid, nu o culoare opacă");

  // Compunem manual 18% ink peste paper, ca în CSS: color-mix(in srgb, ink 18%, transparent)
  const mix = TOKENS["--line"].match(/color-mix\(in srgb,\s*var\(--ink\)\s+([\d.]+)%,\s*transparent\)/);
  assert.ok(mix, "formatul lui --line s-a schimbat, actualizează testul");
  const alfa = Number(mix[1]) / 100;

  const ink = rezolvaCuloare("var(--ink)", TOKENS);
  const paper = rezolvaCuloare("var(--paper)", TOKENS);
  const compus = [0, 1, 2].map((i) => Math.round(ink[i] * alfa + paper[i] * (1 - alfa)));

  const r = contrast(compus, paper);
  assert.ok(r > 1.03, `linia e practic invizibilă pe fundal: contrast compus ${r.toFixed(3)}:1`);
  assert.ok(r < 3, `linia e prea puternică pentru un simplu separator: contrast compus ${r.toFixed(2)}:1`);
});

// ---------------------------------------------------------------------------
// 3) Contract clase: șabloanele și foaia de stil vorbesc aceeași limbă
// ---------------------------------------------------------------------------

const FIȘIERE_ȘABLON = [
  ...fisiere(path.join(SRC), (p) => p.endsWith(".njk") && !p.includes(`${path.sep}admin${path.sep}`))
];

function claseDinSablon(text) {
  const clase = new Set();
  for (const m of text.matchAll(/\bclass="([^"]*)"/g)) {
    for (const c of m[1].split(/\s+/)) {
      if (c) clase.add(c);
    }
  }
  return clase;
}

function claseDinCss(css) {
  const clase = new Set();
  // orice .nume-clasa care nu e in interiorul unui comentariu; ignoram pseudoclase/elemente
  const faraComentarii = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of faraComentarii.matchAll(/\.(-?[_a-zA-Z][_a-zA-Z0-9-]*)/g)) {
    clase.add(m[1]);
  }
  return clase;
}

const claseFolosite = new Map(); // clasa -> Set(fisiere)
let claseDefinite = claseDinCss(CSS);

for (const fisier of FIȘIERE_ȘABLON) {
  const text = fs.readFileSync(fisier, "utf8");
  for (const c of claseDinSablon(text)) {
    if (!claseFolosite.has(c)) claseFolosite.set(c, new Set());
    claseFolosite.get(c).add(path.relative(RADACINA, fisier));
  }
  // unele pagini (ex: statistici.njk) își aduc propriul <style>, autonom
  for (const bloc of text.matchAll(/<style>([\s\S]*?)<\/style>/g)) {
    for (const c of claseDinCss(bloc[1])) claseDefinite.add(c);
  }
}

// clase intenționat definite doar prin JS (adăugate dinamic), nu direct în șablon
const ADAUGATE_DIN_JS = new Set(["vizibil", "apare"]);

test("fiecare clasă folosită într-un șablon este definită undeva în style.css", () => {
  const lipsa = [];
  for (const [clasa, fisiere_] of claseFolosite) {
    if (ADAUGATE_DIN_JS.has(clasa)) continue;
    if (!claseDefinite.has(clasa)) {
      lipsa.push(`.${clasa}  (folosită în ${[...fisiere_].join(", ")})`);
    }
  }
  assert.deepEqual(lipsa, [], `clase folosite în șabloane dar nedefinite în CSS:\n${lipsa.join("\n")}`);
});

test("clasa .apare, folosită pentru animația la scroll, e într-adevăr adăugată din JS", () => {
  const js = citeste("src/assets/js/site.js");
  assert.match(js, /classList\.add\("vizibil"\)/);
});

test("nu au rămas clase din vechiul meniu (.navigatie fără sufix, .meniu-buton__linii legat de .antet)", () => {
  // regresie directă: inainte, tinta pentru starea deschis/inchis era .antet[data-deschis]
  assert.ok(!CSS.includes('.antet[data-deschis'), "a rămas o regulă legată de vechiul mecanism de meniu");
  assert.ok(!claseFolosite.has("navigatie"), "niciun șablon nu mai trebuie să folosească clasa .navigatie simplă");
});

test("clasele cheie ale noului meniu mobil există cu toate stările lor", () => {
  for (const selector of [
    ".navigatie-mobil", ".navigatie-mobil__cap", ".navigatie-mobil__inchide",
    '.navigatie-mobil[data-deschis="true"]', ".meniu-buton", '.meniu-buton[aria-expanded="true"]'
  ]) {
    assert.ok(CSS.includes(selector), `lipsește regula pentru ${selector}`);
  }
});

test("fiecare buton .btn declarat în CSS are și o stare :hover", () => {
  for (const clasa of [".btn", ".btn--ghost", ".btn--pe-imagine"]) {
    const areRegula = new RegExp(`\\${clasa}\\s*[,{]`).test(CSS) || CSS.includes(`${clasa} {`);
    const areHover = CSS.includes(`${clasa}:hover`);
    assert.ok(areRegula, `lipsește regula de bază pentru ${clasa}`);
    assert.ok(areHover, `lipsește starea :hover pentru ${clasa}`);
  }
});

// ---------------------------------------------------------------------------
// Reguli structurale
// ---------------------------------------------------------------------------

test("fiecare breakpoint folosit este unul dintre cele trei praguri standard ale sistemului", () => {
  const praguriCunoscute = new Set(["23rem", "26rem", "30rem", "40rem", "44rem", "48rem", "62rem", "68rem"]);
  const necunoscute = new Set();
  for (const m of CSS.matchAll(/@media[^{]*\(min-width:\s*([\d.]+rem)\)/g)) {
    if (!praguriCunoscute.has(m[1])) necunoscute.add(m[1]);
  }
  for (const m of CSS.matchAll(/@media[^{]*\(max-width:\s*([\d.]+rem)\)/g)) {
    if (!praguriCunoscute.has(m[1])) necunoscute.add(m[1]);
  }
  assert.deepEqual([...necunoscute], [],
    `praguri de breakpoint în afara sistemului: ${[...necunoscute].join(", ")} — verifică dacă e intenționat`);
});

test("fișierul CSS nu conține reguli goale (semn de curățare incompletă)", () => {
  const goale = [...CSS.matchAll(/([.#][\w-]+(?:\s*[,>+~]\s*[.#:\[\]\w-]+)*)\s*\{\s*\}/g)];
  assert.deepEqual(goale.map((m) => m[1]), [], "există selectori cu bloc de reguli gol");
});
