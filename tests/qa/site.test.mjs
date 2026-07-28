/**
 * TESTE QA — site construit
 * Rulează peste folderul _site, adică exact ce ajunge pe Netlify.
 * Rulare: npm run test:qa   (rulează întâi build-ul)
 */
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import {
  existaBuild, pagini, pagina, citeste, citesteJson, citesteYaml,
  sursaReala, existaInBuild, fisiere, SITE, RADACINA
} from "../ajutor.mjs";

const site = citesteJson("src/_data/site.json");
const contact = citesteJson("src/_data/contact.json");

test("build-ul există înainte de testele QA", () => {
  assert.ok(existaBuild(), "rulează întâi: npm run build");
});

// ---------------------------------------------------------------------------
// Structura site-ului
// ---------------------------------------------------------------------------

test("cele patru pagini cerute sunt construite", () => {
  const urluri = pagini().map((p) => p.url);
  for (const cerut of ["/", "/proiecte/", "/galerie/", "/contact/"]) {
    assert.ok(urluri.includes(cerut), `lipsește pagina ${cerut}`);
  }
});

test("fiecare proiect are propria pagină", () => {
  const urluri = pagini().map((p) => p.url);
  const proiecte = urluri.filter((u) => u.startsWith("/proiecte/") && u !== "/proiecte/");
  assert.ok(proiecte.length >= 3, `am găsit doar ${proiecte.length} pagini de proiect`);
});

test("pagina 404 și panoul de administrare există", () => {
  assert.ok(existaInBuild("/404.html"), "lipsește pagina 404");
  assert.ok(existaInBuild("/admin/index.html"), "lipsește panoul de administrare");
  assert.ok(existaInBuild("/admin/config.yml"), "lipsește configurația panoului");
});

test("robots.txt și sitemap.xml sunt generate", () => {
  assert.ok(existaInBuild("/robots.txt"));
  assert.ok(existaInBuild("/sitemap.xml"));
});

// ---------------------------------------------------------------------------
// Randare: nimic nerezolvat în HTML-ul livrat
// ---------------------------------------------------------------------------

test("niciun șablon nerandat nu ajunge în HTML", () => {
  for (const p of pagini()) {
    if (p.url === "/admin/") continue;
    assert.ok(!p.html.includes("{{"), `${p.url} conține {{ nerandat`);
    assert.ok(!p.html.includes("{%"), `${p.url} conține {% nerandat`);
  }
});

test("nu apare textul undefined sau null în pagini", () => {
  for (const p of pagini()) {
    const $ = p.$;
    $("script, style, noscript").remove();
    const text = $("body").text();
    assert.ok(!/\bundefined\b/.test(text), `${p.url} afișează "undefined"`);
    assert.ok(!/\bnull\b/.test(text), `${p.url} afișează "null"`);
    assert.ok(!/\bNaN\b/.test(text), `${p.url} afișează "NaN"`);
  }
});

test("diacriticele românești sunt intacte după build", () => {
  const acasa = pagina("/").$("body").text();
  for (const litera of ["ă", "â", "î", "ș", "ț"]) {
    assert.ok(acasa.includes(litera), `lipsește litera ${litera} din pagina principală`);
  }
  assert.ok(!acasa.includes("Ã"), "semn de codificare greșită a diacriticelor");
});

test("limba paginii este româna", () => {
  for (const p of pagini()) {
    if (p.url === "/admin/") continue;
    assert.equal(p.$("html").attr("lang"), "ro", `${p.url} nu declară limba română`);
  }
});

// ---------------------------------------------------------------------------
// Legături
// ---------------------------------------------------------------------------

test("toate legăturile interne duc către pagini care există", () => {
  const urluri = new Set(pagini().map((p) => p.url));
  const lipsa = [];

  for (const p of pagini()) {
    if (p.url === "/admin/") continue;
    p.$("a[href]").each((_, el) => {
      const href = p.$(el).attr("href");
      if (!href.startsWith("/") || href.startsWith("//")) return;
      const curat = href.split("#")[0].split("?")[0];
      if (!curat) return;
      if (urluri.has(curat) || existaInBuild(curat)) return;
      lipsa.push(`${p.url} → ${href}`);
    });
  }

  assert.deepEqual(lipsa, [], `legături interne rupte:\n${lipsa.join("\n")}`);
});

test("legăturile către telefon și email folosesc datele din setări", () => {
  const c = pagina("/contact/").$;
  const tel = c('a[href^="tel:"]').first().attr("href");
  const mail = c('a[href^="mailto:"]').first().attr("href");

  assert.equal(tel, "tel:" + contact.telefon.replace(/[^\d+]/g, ""));
  assert.ok(mail.startsWith("mailto:" + contact.email), "adresa de email nu vine din setări");
});

test("pagina de contact nu conține formular, așa cum s-a cerut", () => {
  const c = pagina("/contact/").$;
  assert.equal(c("form").length, 0, "pagina de contact nu trebuie să aibă formular");
  assert.equal(c("input").length, 0);
});

test("pagina de contact arată numele, funcția și fotografia persoanei", () => {
  const text = pagina("/contact/").$("body").text();
  assert.ok(text.includes(contact.nume), "lipsește numele persoanei de contact");
  assert.ok(text.includes(contact.rol), "lipsește funcția");
  assert.ok(pagina("/contact/").$(".persoana img").length === 1, "lipsește fotografia");
});

test("legăturile externe se deschid în siguranță", () => {
  for (const p of pagini()) {
    p.$('a[target="_blank"]').each((_, el) => {
      const rel = p.$(el).attr("rel") || "";
      assert.ok(rel.includes("noopener"), `${p.url}: legătură externă fără rel="noopener"`);
    });
  }
});

// ---------------------------------------------------------------------------
// Imagini
// ---------------------------------------------------------------------------

test("fiecare imagine trimite către un fișier care există în build", () => {
  const lipsa = [];
  for (const p of pagini()) {
    if (p.url === "/admin/") continue;
    p.$("img").each((_, el) => {
      const real = sursaReala(p.$(el).attr("src"));
      if (real && !existaInBuild(real)) lipsa.push(`${p.url} → ${real}`);
    });
  }
  assert.deepEqual(lipsa, [], `imagini lipsă:\n${lipsa.join("\n")}`);
});

test("fiecare variantă din srcset trimite către un fișier care există", () => {
  const lipsa = [];
  for (const p of pagini()) {
    p.$("img[srcset]").each((_, el) => {
      for (const varianta of (p.$(el).attr("srcset") || "").split(",")) {
        const real = sursaReala(varianta.trim().split(" ")[0]);
        if (real && !existaInBuild(real)) lipsa.push(`${p.url} → ${real}`);
      }
    });
  }
  assert.deepEqual(lipsa, [], `variante lipsă:\n${lipsa.join("\n")}`);
});

test("pozele din conținut trec prin redimensionare, ca să nu încarce greu pe telefon", () => {
  const netransformate = [];
  for (const p of pagini()) {
    if (p.url === "/admin/") continue;
    p.$("img").each((_, el) => {
      const src = p.$(el).attr("src") || "";
      if (src.startsWith("/images/uploads/")) netransformate.push(`${p.url} → ${src}`);
    });
  }
  assert.deepEqual(netransformate, [],
    `poze încărcate din panou fără redimensionare:\n${netransformate.join("\n")}`);
});

test("fiecare imagine are dimensiuni declarate, ca pagina să nu sară la încărcare", () => {
  const fara = [];
  for (const p of pagini()) {
    if (p.url === "/admin/") continue;
    p.$("img").each((_, el) => {
      const $el = p.$(el);
      if (!$el.attr("width") || !$el.attr("height")) fara.push(`${p.url} → ${$el.attr("src")}`);
    });
  }
  assert.deepEqual(fara, [], `imagini fără width/height:\n${fara.join("\n")}`);
});

test("doar prima imagine a paginii se încarcă imediat, restul întârziat", () => {
  for (const url of ["/", "/galerie/", "/proiecte/"]) {
    const $ = pagina(url).$;
    const imagini = $("img").toArray();
    const imediate = imagini.filter((el) => $(el).attr("loading") !== "lazy");
    assert.ok(imediate.length <= 2,
      `${url}: prea multe imagini fără loading="lazy" (${imediate.length})`);
  }
});

// ---------------------------------------------------------------------------
// Marca clientului
// ---------------------------------------------------------------------------

test("logo-ul clientului apare în antet și în subsol", () => {
  const $ = pagina("/").$;
  assert.equal($(".marca img").attr("src"), site.logo, "logo-ul din antet nu vine din setări");
  assert.equal($(".subsol__logo").attr("src"), site.logo, "logo-ul din subsol nu vine din setări");
  assert.ok(existaInBuild(site.logo), "fișierul logo lipsește din build");
});

test("logo-ul din antet are text alternativ cu numele firmei", () => {
  assert.equal(pagina("/").$(".marca img").attr("alt"), site.nume);
});

test("logo-ul folosit pe fundal închis este varianta pentru fundal închis", () => {
  assert.match(site.logo, /inchis/, "pe antetul închis trebuie folosită varianta -inchis");
  assert.ok(existaInBuild("/images/brand/logo-orizontal-deschis.png"),
    "varianta pentru fundal deschis trebuie livrată clientului");
});

test("iconițele de marcă sunt livrate", () => {
  for (const f of ["/images/brand/favicon-32.png", "/images/brand/favicon-512.png",
                   "/images/brand/apple-touch-icon.png", "/images/brand/og-image.jpg"]) {
    assert.ok(existaInBuild(f), `lipsește ${f}`);
  }
});

// ---------------------------------------------------------------------------
// SEO
// ---------------------------------------------------------------------------

test("fiecare pagină are titlu și descriere", () => {
  for (const p of pagini()) {
    if (p.url === "/admin/") continue;
    const $ = p.$;
    assert.ok(($("title").text() || "").length > 10, `${p.url}: titlu lipsă sau prea scurt`);
    const d = $('meta[name="description"]').attr("content") || "";
    assert.ok(d.length > 30, `${p.url}: descriere lipsă sau prea scurtă`);
    assert.ok(d.length < 200, `${p.url}: descriere prea lungă (${d.length})`);
  }
});

test("titlurile sunt unice între pagini", () => {
  const titluri = pagini().filter((p) => p.url !== "/admin/").map((p) => p.$("title").text());
  assert.equal(new Set(titluri).size, titluri.length, "există titluri duplicate");
});

test("adresa canonică și cea din Open Graph sunt aceeași", () => {
  for (const p of pagini()) {
    if (p.url === "/admin/") continue;
    const $ = p.$;
    const canonic = $('link[rel="canonical"]').attr("href");
    assert.equal(canonic, site.url + p.url, `${p.url}: canonical greșit`);
    assert.equal($('meta[property="og:url"]').attr("content"), canonic, `${p.url}: og:url diferit`);
  }
});

test("imaginea de distribuire este o adresă absolută către un fișier existent", () => {
  const og = pagina("/").$('meta[property="og:image"]').attr("content");
  assert.ok(og.startsWith("http"), "og:image trebuie să fie adresă absolută");
  assert.ok(existaInBuild(og.replace(site.url, "")), "fișierul og:image lipsește");
});

test("datele structurate sunt JSON valid și descriu firma", () => {
  const brut = pagina("/").$('script[type="application/ld+json"]').html();
  const date = JSON.parse(brut);
  assert.equal(date["@type"], "HomeAndConstructionBusiness");
  assert.equal(date.name, site.nume);
  assert.equal(date.telephone, site.telefon);
});

test("sitemap-ul conține paginile publice și nu le conține pe cele private", () => {
  const sitemap = citeste("_site/sitemap.xml");
  for (const u of ["/", "/proiecte/", "/galerie/", "/contact/"]) {
    assert.ok(sitemap.includes(`<loc>${site.url}${u}</loc>`), `sitemap fără ${u}`);
  }
  assert.ok(!sitemap.includes("/admin"), "sitemap-ul nu trebuie să conțină panoul");
  assert.ok(!sitemap.includes("/statistici"), "sitemap-ul nu trebuie să conțină statisticile");
  assert.ok(!sitemap.includes("404"), "sitemap-ul nu trebuie să conțină pagina 404");
});

test("robots.txt blochează zonele private și indică sitemap-ul", () => {
  const robots = citeste("_site/robots.txt");
  assert.match(robots, /Disallow: \/admin\//);
  assert.match(robots, /Disallow: \/statistici\//);
  assert.ok(robots.includes(`${site.url}/sitemap.xml`));
});

test("paginile private cer motoarelor de căutare să nu le indexeze", () => {
  for (const url of ["/statistici/"]) {
    const robots = pagina(url).$('meta[name="robots"]').attr("content") || "";
    assert.match(robots, /noindex/, `${url} ar trebui marcată noindex`);
  }
  assert.match(citeste("_site/admin/index.html"), /noindex/);
});

// ---------------------------------------------------------------------------
// Funcționalități
// ---------------------------------------------------------------------------

test("pagina de proiecte are butoane de filtrare pe categorii", () => {
  const $ = pagina("/proiecte/").$;
  const filtre = $("[data-filtru]");
  assert.ok(filtre.length >= 2, "lipsesc butoanele de filtrare");
  assert.equal($('[data-filtru="toate"]').attr("aria-pressed"), "true", "filtrul Toate trebuie activ inițial");
});

test("fiecare card de proiect are categoria pe el, ca filtrarea să funcționeze", () => {
  const $ = pagina("/proiecte/").$;
  const carduri = $("[data-lista-proiecte] .card").toArray();
  assert.ok(carduri.length >= 3);
  for (const card of carduri) {
    assert.ok(($(card).attr("data-categorie") || "").length > 0, "card fără categorie");
  }
});

test("categoriile din filtre acoperă toate categoriile cardurilor", () => {
  const $ = pagina("/proiecte/").$;
  const dinFiltre = new Set($("[data-filtru]").toArray().map((el) => $(el).attr("data-filtru")));
  for (const card of $(".card").toArray()) {
    const c = $(card).attr("data-categorie");
    assert.ok(dinFiltre.has(c), `categoria "${c}" nu are buton de filtrare`);
  }
});

test("galeria pregătește pozele pentru vizualizare mărită", () => {
  const $ = pagina("/galerie/").$;
  const item = $(".galerie__item").first();
  assert.ok($(".galerie__item").length >= 6, "prea puține poze în galerie");
  assert.ok(item.attr("data-mare"), "lipsește adresa pozei mari");
  assert.equal(item.attr("tabindex"), "0", "poza trebuie să fie accesibilă de la tastatură");
  assert.equal(item.attr("role"), "button");
});

test("pagina unui proiect afișează fișa tehnică și galeria lui", () => {
  const p = pagini().find((x) => x.url.startsWith("/proiecte/") && x.url !== "/proiecte/");
  const $ = p.$;
  assert.ok($(".fisa dt").length >= 3, "fișa tehnică are prea puține rânduri");
  assert.ok($(".fisa dd").length === $(".fisa dt").length, "fișa are etichete fără valori");
  assert.ok($('a[href="/proiecte/"]').length >= 1, "lipsește legătura înapoi la listă");
});

test("statisticile se încarcă doar dacă sunt pornite din setări", () => {
  const areScript = pagina("/").html.includes("/assets/js/analitice.js");
  assert.equal(areScript, Boolean(site.analitice_interne),
    "scriptul de statistici nu respectă setarea din panou");
});

test("scriptul de statistici nu trimite date personale", () => {
  const js = citeste("src/assets/js/analitice.js");
  assert.ok(!/document\.cookie/.test(js), "scriptul nu trebuie să folosească cookie-uri");
  assert.ok(!/localStorage/.test(js), "scriptul nu trebuie să scrie în localStorage");
  assert.ok(/doNotTrack/.test(js), "scriptul trebuie să respecte setarea Do Not Track");
});

test("panoul de administrare trimite către pagina de statistici", () => {
  assert.match(citeste("_site/admin/index.html"), /\/statistici\//);
});

test("culorile din setări ajung în pagină ca variabile CSS", () => {
  const html = pagina("/").html;
  assert.ok(html.includes(`--ink: ${site.culoare_text}`), "culoarea textului nu e injectată");
  assert.ok(html.includes(`--accent: ${site.culoare_accent}`), "culoarea de accent nu e injectată");
  assert.ok(html.includes(`--paper: ${site.culoare_fundal}`), "culoarea de fundal nu e injectată");
});

test("meniul din setări apare identic în antetul de pe desktop", () => {
  const $ = pagina("/").$;
  const dinPagina = $(".navigatie-desktop ul a").toArray().map((el) => ({
    eticheta: $(el).text().trim(),
    link: $(el).attr("href")
  }));
  assert.deepEqual(dinPagina, site.meniu);
});

test("meniul din setări apare identic și în sertarul mobil", () => {
  const $ = pagina("/").$;
  const dinSertar = $(".navigatie-mobil nav ul a").toArray().map((el) => ({
    eticheta: $(el).text().trim(),
    link: $(el).attr("href")
  }));
  assert.deepEqual(dinSertar, site.meniu);
});

test("sertarul mobil nu conține butonul de contact", () => {
  const $ = pagina("/").$;
  assert.equal($(".navigatie-mobil .btn").length, 0,
    "sertarul mobil nu trebuie să mai aibă butonul de contact");
});

test("sertarul mobil are un buton de închidere cu simbol X, sus", () => {
  const $ = pagina("/").$;
  const inchide = $(".navigatie-mobil__inchide");
  assert.equal(inchide.length, 1, "lipsește butonul de închidere");
  assert.ok(inchide.text().includes("×"), "butonul de închidere trebuie să arate un X");
  // trebuie să fie primul element din sertar, adică deasupra legăturilor
  const copii = $(".navigatie-mobil").children().toArray();
  assert.equal($(copii[0]).hasClass("navigatie-mobil__cap"), true,
    "butonul de închidere trebuie să fie primul, deasupra meniului");
});

test("butonul de meniu e primul element din antet, deci stă în stânga", () => {
  const $ = pagina("/").$;
  const copii = $(".antet__bara").children().toArray();
  assert.ok($(copii[0]).hasClass("meniu-buton"), "butonul de meniu trebuie să fie primul din antet");
});

test("pagina curentă este marcată în ambele meniuri", () => {
  for (const url of ["/", "/proiecte/", "/galerie/", "/contact/"]) {
    const $ = pagina(url).$;
    const activDesktop = $('.navigatie-desktop ul a[aria-current="page"]');
    const activMobil = $('.navigatie-mobil ul a[aria-current="page"]');
    assert.equal(activDesktop.length, 1, `${url}: meniul desktop trebuie să marcheze exact o pagină`);
    assert.equal(activMobil.length, 1, `${url}: sertarul mobil trebuie să marcheze exact o pagină`);
    assert.equal(activDesktop.attr("href"), url);
    assert.equal(activMobil.attr("href"), url);
  }
});

// ---------------------------------------------------------------------------
// Datele firmei: nume, telefon, email, persoana de contact
// ---------------------------------------------------------------------------

test("numele firmei este Flawless Construct peste tot", () => {
  assert.equal(site.nume, "Flawless Construct");
  const acasa = pagina("/").$("body").text();
  assert.ok(acasa.includes("Flawless Construct"));
  assert.ok(!acasa.includes("Atelier Nord"), "a rămas o referință la numele vechi al firmei");
});

test("numele vechi al firmei nu mai apare nicăieri în site-ul construit", () => {
  for (const p of pagini()) {
    assert.ok(!p.html.includes("Atelier Nord"), `${p.url} conține încă "Atelier Nord"`);
  }
});

test("telefonul și emailul din setări sunt cele noi", () => {
  assert.equal(site.telefon, "+40 730 122 097");
  assert.equal(contact.telefon, "+40 730 122 097");
  assert.equal(site.email, "flawless.construct@gmail.com");
  assert.equal(contact.email, "flawless.construct@gmail.com");
});

test("antetul nu mai are nicio legătură de telefon sau email — doar pagina Contact", () => {
  const $ = pagina("/").$;
  assert.equal($('.navigatie-desktop a[href^="tel:"]').length, 0);
  assert.equal($('.navigatie-desktop a[href^="mailto:"]').length, 0);
  assert.equal($('.navigatie-mobil a[href^="tel:"]').length, 0);
  assert.equal($('.navigatie-mobil a[href^="mailto:"]').length, 0);
});

test("pagina de contact sună și scrie la datele noi", () => {
  const $ = pagina("/contact/").$;
  assert.equal($('a[href^="tel:"]').first().attr("href"), "tel:+40730122097");
  assert.ok($('a[href^="mailto:"]').first().attr("href").startsWith("mailto:flawless.construct@gmail.com"));
});

test("nu mai există un buton de contact în antet — Contact e doar o pagină în meniu", () => {
  const $ = pagina("/").$;
  assert.equal($(".antet .btn").length, 0, "antetul nu mai trebuie să aibă un buton de contact");
  assert.equal($(".navigatie-desktop .btn").length, 0);
  assert.ok(!pagina("/").html.includes("Contactează-ne"),
    "textul „Contactează-ne” nu mai trebuie să apară în afara paginii de contact");
});

test("bara fixă de contact de pe telefon a fost eliminată", () => {
  assert.equal(pagina("/").$(".bara-mobil").length, 0, "bara-mobil nu mai trebuie să existe în pagină");
  assert.ok(!fs.existsSync(path.join(RADACINA, "src/_includes/partials/bara-mobil.njk")),
    "fișierul bara-mobil.njk ar trebui șters, nu doar dezactivat");
  assert.ok(!citeste("src/_includes/layouts/base.njk").includes("bara-mobil"),
    "layout-ul de bază nu mai trebuie să includă bara-mobil");
});

test("sloganul apare direct sub logo, în antet, pe orice ecran", () => {
  const $ = pagina("/").$;
  const marca = $(".marca");
  assert.equal(marca.children("img").length, 1, "lipsește imaginea logo-ului din antet");
  const tag = marca.find(".marca__tag");
  assert.equal(tag.length, 1, "lipsește sloganul din antet");
  assert.equal(tag.text().trim(), site.tagline);
  // ordinea în DOM garantează ordinea vizuală într-un lockup stivuit pe coloană
  const copii = marca.children().toArray();
  const indexImg = copii.findIndex((el) => el.tagName === "img");
  const indexTag = copii.findIndex((el) => $(el).hasClass("marca__tag"));
  assert.ok(indexImg < indexTag, "sloganul trebuie să fie după logo în DOM, adică sub el vizual");
});

test("sloganul din antet nu mai e ascuns pe mobil", () => {
  const css = citeste("src/assets/css/style.css");
  const bloc = css.match(/\.marca__tag\s*\{([^}]*)\}/)[1];
  assert.ok(!/display:\s*none/.test(bloc), "sloganul nu mai trebuie ascuns implicit");
  assert.match(bloc, /display:\s*block/);
});

test("lockup-ul logo + slogan e stivuit pe coloană, nu unul lângă altul", () => {
  const css = citeste("src/assets/css/style.css");
  const bloc = css.match(/\.marca\s*\{([^}]*)\}/)[1];
  assert.match(bloc, /flex-direction:\s*column/, "logo-ul și sloganul trebuie stivuite, nu puse unul lângă altul");
});

test("câmpul mort „buton din meniu” a fost scos din panoul de administrare", () => {
  const cms = citesteYaml("src/admin/config.yml");
  assert.ok(!JSON.stringify(cms).includes("buton_antet_text"),
    "câmpul buton_antet_text nu mai trebuie să apară în admin/config.yml, de vreme ce butonul nu mai există");
});

test("persoana de contact este Gabriel, fără funcție afișată", () => {
  assert.equal(contact.nume, "Gabriel");
  assert.equal(contact.rol, "", "funcția trebuie să fie goală în setări");

  const $ = pagina("/contact/").$;
  assert.equal($(".persoana__nume").text().trim(), "Gabriel");
  assert.equal($(".persoana__rol").length, 0, "eticheta de funcție nu trebuie afișată deloc");
  assert.ok(!$("body").text().includes("Coordonator lucrări"), "vechea funcție nu mai trebuie să apară");
  assert.ok(!$("body").text().includes("Andrei Popescu"), "vechiul nume nu mai trebuie să apară");
});

// ---------------------------------------------------------------------------
// Poze placeholder
// ---------------------------------------------------------------------------

test("toate pozele din /images/uploads/ există și au fost înlocuite cu placeholder-uri", () => {
  const uploads = fisiere(path.join(SITE, "images/uploads"), (p) => p.endsWith(".jpg"));
  assert.ok(uploads.length >= 11, "lipsesc fișiere din images/uploads");
});

// ---------------------------------------------------------------------------
// Banda de cifre pe un rând
// ---------------------------------------------------------------------------

test("banda de cifre are exact trei coloane, indiferent de ecran", () => {
  const css = citeste("src/assets/css/style.css");
  const bloc = css.match(/\.cifre\s*\{([^}]*)\}/)[1];
  assert.match(bloc, /grid-template-columns:\s*repeat\(3,\s*1fr\)/,
    "banda de cifre trebuie să aibă mereu 3 coloane, ca să stea pe un rând și pe telefon");
});

test("pagina principală are exact trei cifre în bandă", () => {
  const $ = pagina("/").$;
  assert.equal($(".cifre__item").length, 3);
});

// ---------------------------------------------------------------------------
// Meniul mobil: structură completă
// ---------------------------------------------------------------------------

test("scriptul site.js controlează sertarul mobil prin data-deschis, nu prin antet", () => {
  const js = citeste("src/assets/js/site.js");
  assert.match(js, /data-navigatie-mobil/, "lipsește logica pentru sertarul mobil");
  assert.match(js, /data-meniu-inchide/, "lipsește gestionarea butonului de închidere");
  assert.ok(!js.includes('antet.setAttribute("data-deschis"'),
    "scriptul nu mai trebuie să seteze data-deschis pe antet");
});

test("meniul mobil se închide la Escape și la click pe o legătură", () => {
  const js = citeste("src/assets/js/site.js");
  assert.match(js, /Escape/);
  assert.match(js, /addEventListener\("click", function \(\) \{ inchideMeniul/);
});

test("antetul rămâne deasupra sertarului mobil, ca hamburgerul să poată închide meniul singur", () => {
  // regresie: sertarul avea z-index mai mare decât antetul, deci acoperea
  // butonul de hamburger — se putea deschide meniul, dar nu se mai putea închide.
  const css = citeste("src/assets/css/style.css");
  const zAntet = Number(css.match(/\.antet\s*\{[^}]*z-index:\s*(\d+)/)[1]);
  const zSertar = Number(css.match(/\.navigatie-mobil\s*\{[^}]*z-index:\s*(\d+)/)[1]);
  assert.ok(zAntet > zSertar,
    `antetul (z-index ${zAntet}) trebuie să fie deasupra sertarului (z-index ${zSertar})`);
});

test("sertarul mobil pornește sub antet, nu peste el", () => {
  const css = citeste("src/assets/css/style.css");
  const bloc = css.match(/\.navigatie-mobil\s*\{([^}]*)\}/)[1];
  assert.ok(!/inset:\s*0/.test(bloc), "sertarul nu mai trebuie să acopere tot ecranul de la y=0");
  assert.match(bloc, /top:\s*\d/, "sertarul trebuie să înceapă de sub înălțimea antetului");
});

test("CSS-ul și JS-ul principale au adresă cu hash de conținut, ca să nu rămână în cache la actualizări", () => {
  const html = pagina("/").html;
  assert.match(html, /assets\/css\/style\.css\?v=[0-9a-f]{6,}/,
    "CSS-ul trebuie servit cu ?v=<hash>, altfel un redeploy poate rămâne cu stilul vechi în cache-ul browserului");
  assert.match(html, /assets\/js\/site\.js\?v=[0-9a-f]{6,}/,
    "JS-ul principal trebuie servit cu ?v=<hash>, din același motiv");
});

test("hash-ul de cache-busting se schimbă dacă schimbi conținutul fișierului", () => {
  const continut = citeste("src/assets/js/site.js");
  const hashAsteptat = crypto.createHash("sha1").update(continut).digest("hex").slice(0, 10);
  const html = pagina("/").html;
  assert.match(html, new RegExp(`site\\.js\\?v=${hashAsteptat}`),
    "hash-ul din HTML nu corespunde cu conținutul curent al fișierului — build-ul e neactualizat");
});
