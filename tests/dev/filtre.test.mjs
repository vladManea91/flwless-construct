/**
 * TESTE DEV — filtre
 * Verifică funcțiile pure folosite în șabloane, fără să pornească Eleventy.
 * Rulare: npm run test:dev
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const f = require("../../lib/filtre.js");

test("cdn: construiește o adresă Netlify Image CDN cu lățimea cerută", () => {
  const url = f.cdn("/images/uploads/a.jpg", 800);
  assert.ok(url.startsWith("/.netlify/images?"));
  assert.match(url, /url=%2Fimages%2Fuploads%2Fa\.jpg/);
  assert.match(url, /w=800/);
  assert.match(url, /fit=cover/);
});

test("cdn: adaugă înălțimea doar când primește un raport", () => {
  assert.ok(!f.cdn("/a.jpg", 800).includes("&h="));
  assert.match(f.cdn("/a.jpg", 800, 0.75), /&h=600/);
  assert.match(f.cdn("/a.jpg", 1000, 0.667), /&h=667/);
});

test("cdn: codifică diacriticele și spațiile din numele fișierului", () => {
  const url = f.cdn("/images/uploads/baie mică.jpg", 400);
  assert.ok(!url.includes(" "), "adresa nu trebuie să conțină spații");
  assert.ok(url.includes("%20") || url.includes("baie%20"), "spațiul trebuie codificat");
  assert.ok(url.includes("mic%C4%83"), "diacriticele trebuie codificate");
});

test("cdn: lasă neatinse adresele externe", () => {
  const extern = "https://exemplu.ro/poza.jpg";
  assert.equal(f.cdn(extern, 800), extern);
});

test("cdn: întoarce șir gol pentru valori lipsă", () => {
  assert.equal(f.cdn(""), "");
  assert.equal(f.cdn(null), "");
  assert.equal(f.cdn(undefined), "");
});

test("srcset: produce toate lățimile, în ordine crescătoare", () => {
  const s = f.srcset("/a.jpg");
  const latimi = [...s.matchAll(/ (\d+)w/g)].map((m) => Number(m[1]));
  assert.deepEqual(latimi, f.LATIMI);
  assert.deepEqual(latimi, [...latimi].sort((a, b) => a - b));
});

test("srcset: respectă lățimea maximă, ca pozele mici să nu ceară variante uriașe", () => {
  const latimi = [...f.srcset("/a.jpg", 1, 768).matchAll(/ (\d+)w/g)].map((m) => Number(m[1]));
  assert.deepEqual(latimi, [480, 768]);
});

test("srcset: fiecare variantă are aceeași proporție ca lățimea ei", () => {
  const perechi = f.srcset("/a.jpg", 0.5, 1080).split(", ");
  for (const p of perechi) {
    const w = Number(p.match(/w=(\d+)/)[1]);
    const h = Number(p.match(/&h=(\d+)/)[1]);
    assert.equal(h, Math.round(w * 0.5), `proporție greșită pentru lățimea ${w}`);
  }
});

test("srcset: gol pentru adrese externe sau lipsă", () => {
  assert.equal(f.srcset("https://exemplu.ro/a.jpg"), "");
  assert.equal(f.srcset(""), "");
});

test("telLink: păstrează cifrele și plusul, scoate restul", () => {
  assert.equal(f.telLink("+40 721 000 000"), "+40721000000");
  assert.equal(f.telLink("0721-000.000"), "0721000000");
  assert.equal(f.telLink("(+40) 721 000 000"), "+40721000000");
  assert.equal(f.telLink(""), "");
  assert.equal(f.telLink(null), "");
});

test("dataRo: scrie data cu luna în română", () => {
  assert.equal(f.dataRo("2026-04-18"), "18 aprilie 2026");
  assert.equal(f.dataRo("2026-01-01"), "1 ianuarie 2026");
  assert.equal(f.dataRo("2026-12-31"), "31 decembrie 2026");
});

test("dataRo și anul: nu crapă pe valori invalide", () => {
  assert.equal(f.dataRo("nu e o dată"), "");
  assert.equal(f.dataRo(null), "");
  assert.equal(f.anul(undefined), "");
  assert.equal(f.anul("aiurea"), "");
});

test("anul: întoarce anul ca număr", () => {
  assert.equal(f.anul("2026-05-06"), 2026);
  assert.equal(f.anul(new Date("2024-02-29T12:00:00Z")), 2024);
});

test("isoDate: format bun pentru sitemap", () => {
  assert.equal(f.isoDate("2026-04-18T15:30:00Z"), "2026-04-18");
  assert.match(f.isoDate(new Date()), /^\d{4}-\d{2}-\d{2}$/);
});

test("scurt: lasă textul scurt neatins", () => {
  assert.equal(f.scurt("Text scurt", 100), "Text scurt");
});

test("scurt: taie la limită și nu rupe cuvântul în două", () => {
  const text = "Renovare completă a unui apartament de bloc din 1978, cu recompartimentare între bucătărie și living.";
  const r = f.scurt(text, 40);
  assert.ok(r.length <= 41, `prea lung: ${r.length}`);
  assert.ok(r.endsWith("…"));
  assert.ok(!r.slice(0, -1).endsWith(" "), "nu trebuie să rămână spațiu înainte de puncte");
  assert.ok(text.startsWith(r.slice(0, -1)), "începutul trebuie păstrat identic");
});

test("scurt: curăță etichetele HTML și spațiile multiple", () => {
  assert.equal(f.scurt("<p>Un   text</p>  <b>gros</b>", 100), "Un text gros");
});

test("unice: elimină duplicatele și valorile goale", () => {
  assert.deepEqual(f.unice(["Baie", "Casă", "Baie", "", null, "Casă"]), ["Baie", "Casă"]);
  assert.deepEqual(f.unice([]), []);
  assert.deepEqual(f.unice(null), []);
});

test("unice: păstrează ordinea primei apariții", () => {
  assert.deepEqual(f.unice(["c", "a", "b", "a"]), ["c", "a", "b"]);
});

test("slugRo: transformă diacriticele românești corect", () => {
  assert.equal(f.slugRo("Casă P+1, Otopeni"), "casa-p-1-otopeni");
  assert.equal(f.slugRo("Baie și bucătărie"), "baie-si-bucatarie");
  assert.equal(f.slugRo("Înălțime"), "inaltime");
});

test("slugRo: acceptă ambele variante de ș și ț din Unicode", () => {
  assert.equal(f.slugRo("șantier"), f.slugRo("şantier"));
  assert.equal(f.slugRo("preț"), f.slugRo("preţ"));
  assert.equal(f.slugRo("șantier"), "santier");
});

test("slugRo: fără liniuțe la început sau la final", () => {
  assert.equal(f.slugRo("  Apartament!  "), "apartament");
  assert.equal(f.slugRo("---"), "");
});

test("head: taie lista la numărul cerut", () => {
  assert.deepEqual(f.head([1, 2, 3, 4], 2), [1, 2]);
  assert.deepEqual(f.head([1, 2], 5), [1, 2]);
  assert.deepEqual(f.head([1, 2, 3], -1), [3]);
  assert.deepEqual(f.head(null, 3), []);
});
