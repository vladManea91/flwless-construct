/**
 * TESTE DEV — statistici
 * Verifică logica din spatele funcțiilor Netlify, fără rețea și fără depozit.
 * Rulare: npm run test:dev
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  gol, numara, sursaDin, numeSursa, dispozitiv, aplica,
  adunaObiecte, top, cheiPentruInterval, normalizeazaZile, agregheaza, SHARDS
} from "../../lib/analitice.mjs";

const GAZDA = "flawlessconstruct.ro";

test("gol: pornește de la zero, cu toate secțiunile prezente", () => {
  const s = gol();
  assert.equal(s.vizualizari, 0);
  assert.equal(s.vizite, 0);
  for (const cheie of ["pagini", "surse", "referinte", "campanii", "medii", "dispozitive", "tari", "evenimente"]) {
    assert.deepEqual(s[cheie], {}, `lipsește secțiunea ${cheie}`);
  }
});

test("numara: crește contorul și ignoră cheile goale", () => {
  const o = {};
  numara(o, "Google");
  numara(o, "Google");
  numara(o, "");
  numara(o, null);
  numara(o, undefined);
  assert.deepEqual(o, { Google: 2 });
});

test("numara: taie cheile foarte lungi, ca să nu umple depozitul", () => {
  const o = {};
  numara(o, "x".repeat(500));
  assert.equal(Object.keys(o)[0].length, 120);
});

test("sursaDin: scoate gazda fără www", () => {
  assert.equal(sursaDin("https://www.google.com/search?q=amenajari"), "google.com");
  assert.equal(sursaDin("https://m.facebook.com/"), "m.facebook.com");
});

test("sursaDin: fără proveniență înseamnă trafic direct", () => {
  assert.equal(sursaDin(""), "direct");
  assert.equal(sursaDin(null), "direct");
  assert.equal(sursaDin("nu-i o adresă"), "direct");
});

test("numeSursa: traduce gazdele cunoscute în nume citibile", () => {
  assert.equal(numeSursa("google.ro"), "Google");
  assert.equal(numeSursa("l.instagram.com"), "Instagram");
  assert.equal(numeSursa("chatgpt.com"), "ChatGPT");
});

test("numeSursa: lasă gazdele necunoscute așa cum sunt", () => {
  assert.equal(numeSursa("blog-constructii.ro"), "blog-constructii.ro");
});

test("dispozitiv: împarte corect pe lățimea ecranului", () => {
  assert.equal(dispozitiv(390), "telefon");
  assert.equal(dispozitiv(639), "telefon");
  assert.equal(dispozitiv(640), "tabletă");
  assert.equal(dispozitiv(1023), "tabletă");
  assert.equal(dispozitiv(1024), "desktop");
  assert.equal(dispozitiv(1920), "desktop");
});

test("dispozitiv: lățimea lipsă nu produce o categorie inventată", () => {
  assert.equal(dispozitiv(undefined), "desktop");
  assert.equal(dispozitiv(0), "desktop");
  assert.equal(dispozitiv("aiurea"), "desktop");
});

test("aplica: o vizualizare crește contoarele potrivite", () => {
  const s = aplica(gol(), {
    tip: "pagina", cale: "/proiecte/", latime: 390,
    referinta: "https://www.google.com/", vizita_noua: true
  }, GAZDA, "România");

  assert.equal(s.vizualizari, 1);
  assert.equal(s.vizite, 1);
  assert.equal(s.pagini["/proiecte/"], 1);
  assert.equal(s.surse["Google"], 1);
  assert.equal(s.referinte["google.com"], 1);
  assert.equal(s.dispozitive["telefon"], 1);
  assert.equal(s.tari["România"], 1);
});

test("aplica: navigarea în interiorul site-ului nu se numără ca sursă nouă", () => {
  const s = aplica(gol(), {
    tip: "pagina", cale: "/contact/", latime: 1440,
    referinta: `https://${GAZDA}/proiecte/`
  }, GAZDA);

  assert.equal(s.vizualizari, 1);
  assert.deepEqual(s.surse, {}, "sursa nu trebuie contorizată la navigarea internă");
  assert.deepEqual(s.referinte, {});
});

test("aplica: traficul direct apare ca sursă, dar nu ca site care trimite trafic", () => {
  const s = aplica(gol(), { tip: "pagina", cale: "/", latime: 1440 }, GAZDA);
  assert.equal(s.surse["direct"], 1);
  assert.deepEqual(s.referinte, {}, "traficul direct nu are site de proveniență");
});

test("aplica: UTM are prioritate față de proveniență", () => {
  const s = aplica(gol(), {
    tip: "pagina", cale: "/", latime: 1440,
    referinta: "https://l.facebook.com/",
    utm_source: "facebook", utm_medium: "cpc", utm_campaign: "renovari-iulie"
  }, GAZDA);

  assert.equal(s.surse["facebook"], 1);
  assert.equal(s.medii["cpc"], 1);
  assert.equal(s.campanii["renovari-iulie"], 1);
  assert.equal(s.surse["Facebook"], undefined, "sursa nu trebuie numărată de două ori");
});

test("aplica: UTM fără mediu sau campanie primește etichete implicite", () => {
  const s = aplica(gol(), { tip: "pagina", cale: "/", utm_source: "newsletter" }, GAZDA);
  assert.equal(s.medii["necunoscut"], 1);
  assert.equal(s.campanii["fără nume"], 1);
});

test("aplica: vizita se numără o singură dată pe sesiune", () => {
  let s = aplica(gol(), { tip: "pagina", cale: "/", vizita_noua: true }, GAZDA);
  s = aplica(s, { tip: "pagina", cale: "/proiecte/", vizita_noua: false }, GAZDA);
  s = aplica(s, { tip: "pagina", cale: "/contact/", vizita_noua: false }, GAZDA);

  assert.equal(s.vizualizari, 3);
  assert.equal(s.vizite, 1);
});

test("aplica: evenimentele nu umflă numărul de pagini văzute", () => {
  const s = aplica(gol(), { tip: "eveniment", nume: "telefon-contact" }, GAZDA);
  assert.equal(s.vizualizari, 0);
  assert.equal(s.evenimente["telefon-contact"], 1);
  assert.deepEqual(s.pagini, {});
});

test("aplica: nu modifică starea primită ca argument", () => {
  const initial = gol();
  const copie = JSON.parse(JSON.stringify(initial));
  aplica(initial, { tip: "pagina", cale: "/", latime: 390 }, GAZDA);
  assert.deepEqual(initial, copie, "starea de intrare trebuie să rămână neatinsă");
});

test("aplica: o cale lipsă cade pe pagina principală", () => {
  const s = aplica(gol(), { tip: "pagina", latime: 1440 }, GAZDA);
  assert.equal(s.pagini["/"], 1);
});

test("adunaObiecte: însumează contoarele din două zile", () => {
  const a = { "/": 3, "/contact/": 1 };
  adunaObiecte(a, { "/": 2, "/proiecte/": 5 });
  assert.deepEqual(a, { "/": 5, "/contact/": 1, "/proiecte/": 5 });
});

test("top: ordonează descrescător și limitează", () => {
  const r = top({ a: 1, b: 9, c: 5 }, 2);
  assert.deepEqual(r, [{ nume: "b", numar: 9 }, { nume: "c", numar: 5 }]);
});

test("top: ordine stabilă la egalitate", () => {
  assert.deepEqual(top({ b: 2, a: 2 }), [{ nume: "a", numar: 2 }, { nume: "b", numar: 2 }]);
});

test("top: obiect gol nu produce eroare", () => {
  assert.deepEqual(top({}), []);
  assert.deepEqual(top(undefined), []);
});

test("normalizeazaZile: limitează intervalul între 1 și 90", () => {
  assert.equal(normalizeazaZile("7"), 7);
  assert.equal(normalizeazaZile("0"), 1);
  assert.equal(normalizeazaZile("-5"), 1);
  assert.equal(normalizeazaZile("999"), 90);
  assert.equal(normalizeazaZile(null), 30);
  assert.equal(normalizeazaZile("abc"), 30);
});

test("cheiPentruInterval: o cheie pentru fiecare zi și fiecare shard", () => {
  const acum = new Date("2026-07-28T10:00:00Z");
  const chei = cheiPentruInterval(3, acum);
  assert.equal(chei.length, 3 * SHARDS);
  assert.ok(chei.some((c) => c.cheie === "zi/2026-07-28/0"));
  assert.ok(chei.some((c) => c.cheie === "zi/2026-07-26/1"));
  assert.ok(!chei.some((c) => c.zi === "2026-07-25"), "nu trebuie să depășească intervalul");
});

test("cheiPentruInterval: trece corect peste începutul lunii", () => {
  const chei = cheiPentruInterval(3, new Date("2026-03-01T10:00:00Z"));
  const zile = [...new Set(chei.map((c) => c.zi))].sort();
  assert.deepEqual(zile, ["2026-02-27", "2026-02-28", "2026-03-01"]);
});

test("agregheaza: adună shard-urile aceleiași zile într-un singur total", () => {
  const acum = new Date("2026-07-28T10:00:00Z");
  const bucati = [
    { zi: "2026-07-28", valoare: { ...gol(), vizualizari: 4, vizite: 2, surse: { Google: 4 } } },
    { zi: "2026-07-28", valoare: { ...gol(), vizualizari: 3, vizite: 1, surse: { Google: 1, direct: 2 } } }
  ];
  const r = agregheaza(bucati, 2, acum);

  assert.equal(r.vizualizari, 7);
  assert.equal(r.vizite, 3);
  assert.deepEqual(r.surse, [{ nume: "Google", numar: 5 }, { nume: "direct", numar: 2 }]);
  assert.equal(r.serie.at(-1).numar, 7, "ziua curentă e ultima din serie");
});

test("agregheaza: seria acoperă toate zilele, inclusiv cele fără trafic", () => {
  const acum = new Date("2026-07-28T10:00:00Z");
  const r = agregheaza([{ zi: "2026-07-26", valoare: { ...gol(), vizualizari: 5 } }], 7, acum);

  assert.equal(r.serie.length, 7);
  assert.deepEqual(r.serie.map((p) => p.zi).sort(), r.serie.map((p) => p.zi), "seria e în ordine cronologică");
  assert.equal(r.serie.find((p) => p.zi === "2026-07-26").numar, 5);
  assert.equal(r.serie.find((p) => p.zi === "2026-07-27").numar, 0);
});

test("agregheaza: bucățile lipsă sau goale sunt sărite fără eroare", () => {
  const r = agregheaza([null, undefined, { zi: "2026-07-28", valoare: null }], 1, new Date("2026-07-28T10:00:00Z"));
  assert.equal(r.vizualizari, 0);
  assert.equal(r.serie.length, 1);
});

test("agregheaza: raportul conține toate secțiunile așteptate de panou", () => {
  const r = agregheaza([], 30, new Date("2026-07-28T10:00:00Z"));
  for (const cheie of ["zile", "vizualizari", "vizite", "serie", "pagini", "surse",
                       "referinte", "campanii", "medii", "dispozitive", "tari", "evenimente"]) {
    assert.ok(cheie in r, `raportul nu conține ${cheie}`);
  }
});

test("flux complet: trei vizitatori diferiți produc un raport corect", () => {
  let s = gol();
  s = aplica(s, { tip: "pagina", cale: "/", latime: 390, referinta: "https://www.google.com/", vizita_noua: true }, GAZDA, "România");
  s = aplica(s, { tip: "pagina", cale: "/proiecte/", latime: 390, referinta: `https://${GAZDA}/` }, GAZDA, "România");
  s = aplica(s, { tip: "eveniment", nume: "telefon-contact" }, GAZDA);
  s = aplica(s, { tip: "pagina", cale: "/", latime: 1440, utm_source: "facebook", utm_medium: "cpc", utm_campaign: "iulie", vizita_noua: true }, GAZDA, "România");
  s = aplica(s, { tip: "pagina", cale: "/contact/", latime: 820, vizita_noua: true }, GAZDA, "Germania");

  const r = agregheaza([{ zi: "2026-07-28", valoare: s }], 1, new Date("2026-07-28T10:00:00Z"));

  assert.equal(r.vizualizari, 4);
  assert.equal(r.vizite, 3);
  assert.equal(r.pagini.find((p) => p.nume === "/").numar, 2);
  assert.deepEqual(r.dispozitive.map((d) => d.nume).sort(), ["desktop", "tabletă", "telefon"]);
  assert.equal(r.evenimente[0].nume, "telefon-contact");
  assert.equal(r.tari.find((t) => t.nume === "România").numar, 3);
});
