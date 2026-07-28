/**
 * Calculează un hash scurt din conținutul fiecărui fișier din assets/, ca să
 * putem lipi ?v=<hash> pe linkurile din <head>. Așa browserul și rețeaua
 * Netlify nu mai pot servi din greșeală un CSS sau JS vechi, cache-uit,
 * peste un HTML nou publicat după actualizare.
 *
 * Hash-ul se schimbă DOAR când fișierul chiar se schimbă, deci un deploy
 * fără modificări la un fișier păstrează avantajul cache-ului lung.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function hash(caleRelativa) {
  const cale = path.join(__dirname, "..", caleRelativa);
  try {
    const continut = fs.readFileSync(cale);
    return crypto.createHash("sha1").update(continut).digest("hex").slice(0, 10);
  } catch {
    return "0";
  }
}

module.exports = () => ({
  css: hash("assets/css/style.css"),
  siteJs: hash("assets/js/site.js"),
  analiticeJs: hash("assets/js/analitice.js")
});
