/* Statistici proprii, fără cookie-uri și fără date personale.
   Trimite: pagina, de unde a venit vizitatorul, campania UTM, tipul de ecran. */
(function () {
  "use strict";

  if (navigator.doNotTrack === "1" || window.doNotTrack === "1") return;
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return;

  var parametri = new URLSearchParams(location.search);

  function param(nume) {
    return (parametri.get(nume) || "").slice(0, 80);
  }

  /* Prima pagină din vizită: reținem sursa pentru restul sesiunii. */
  var vizitaNoua = false;
  try {
    if (!sessionStorage.getItem("vizita")) {
      sessionStorage.setItem("vizita", "1");
      vizitaNoua = true;
    }
  } catch (e) {
    vizitaNoua = true;
  }

  function trimite(date) {
    try {
      var corp = JSON.stringify(date);
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/track", new Blob([corp], { type: "application/json" }));
      } else {
        fetch("/api/track", { method: "POST", body: corp, keepalive: true });
      }
    } catch (e) { /* statisticile nu strică niciodată pagina */ }
  }

  trimite({
    tip: "pagina",
    cale: location.pathname,
    titlu: document.title.slice(0, 120),
    referinta: document.referrer.slice(0, 200),
    utm_source: param("utm_source"),
    utm_medium: param("utm_medium"),
    utm_campaign: param("utm_campaign"),
    utm_content: param("utm_content"),
    latime: window.innerWidth,
    vizita_noua: vizitaNoua
  });

  /* Click-uri importante: telefon, email, WhatsApp. */
  document.addEventListener("click", function (e) {
    var link = e.target.closest("a[data-eveniment], a[href^='tel:'], a[href^='mailto:']");
    if (!link) return;
    var nume = link.getAttribute("data-eveniment");
    if (!nume) {
      nume = link.getAttribute("href").indexOf("tel:") === 0 ? "telefon" : "email";
    }
    trimite({ tip: "eveniment", nume: nume, cale: location.pathname });
  });
})();
