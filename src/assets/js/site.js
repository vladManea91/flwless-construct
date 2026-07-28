(function () {
  "use strict";

  /* ---------- meniu mobil ---------- */
  var antet = document.querySelector("[data-antet]");
  var butonMeniu = document.querySelector("[data-meniu]");

  if (antet && butonMeniu) {
    butonMeniu.addEventListener("click", function () {
      var deschis = antet.getAttribute("data-deschis") === "true";
      antet.setAttribute("data-deschis", deschis ? "false" : "true");
      butonMeniu.setAttribute("aria-expanded", deschis ? "false" : "true");
      var text = butonMeniu.querySelector("[data-meniu-text]");
      if (text) text.textContent = deschis ? "Meniu" : "Închide";
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && antet.getAttribute("data-deschis") === "true") {
        butonMeniu.click();
        butonMeniu.focus();
      }
    });
  }

  /* ---------- filtre pe categorii ---------- */
  document.querySelectorAll("[data-filtre]").forEach(function (grup) {
    var container = grup.parentElement;
    grup.addEventListener("click", function (e) {
      var buton = e.target.closest("[data-filtru]");
      if (!buton) return;

      grup.querySelectorAll("[data-filtru]").forEach(function (b) {
        b.setAttribute("aria-pressed", b === buton ? "true" : "false");
      });

      var valoare = buton.getAttribute("data-filtru");
      container.querySelectorAll("[data-categorie]").forEach(function (element) {
        var potrivire = valoare === "toate" || element.getAttribute("data-categorie") === valoare;
        element.style.display = potrivire ? "" : "none";
      });
    });
  });

  /* ---------- lupa (vizualizare poze mari) ---------- */
  var poze = Array.prototype.slice.call(document.querySelectorAll("[data-mare]"));

  if (poze.length) {
    var lupa = document.createElement("div");
    lupa.className = "lupa";
    lupa.setAttribute("role", "dialog");
    lupa.setAttribute("aria-modal", "true");
    lupa.setAttribute("aria-label", "Vizualizare fotografie");
    lupa.innerHTML =
      '<img alt="">' +
      '<p class="lupa__jos" data-lupa-text></p>' +
      '<button class="lupa__buton lupa__buton--prev" type="button" aria-label="Fotografia anterioară">‹</button>' +
      '<button class="lupa__buton lupa__buton--next" type="button" aria-label="Fotografia următoare">›</button>' +
      '<button class="lupa__buton lupa__buton--close" type="button" aria-label="Închide">×</button>';
    document.body.appendChild(lupa);

    var imgLupa = lupa.querySelector("img");
    var textLupa = lupa.querySelector("[data-lupa-text]");
    var indexCurent = 0;
    var ultimulFocus = null;

    function vizibile() {
      return poze.filter(function (p) { return p.offsetParent !== null; });
    }

    function arata(index) {
      var lista = vizibile();
      if (!lista.length) return;
      indexCurent = (index + lista.length) % lista.length;
      var element = lista[indexCurent];
      imgLupa.src = element.getAttribute("data-mare");
      imgLupa.alt = element.getAttribute("data-descriere") || "";
      textLupa.textContent = element.getAttribute("data-descriere") || "";
    }

    function deschide(element) {
      ultimulFocus = document.activeElement;
      arata(vizibile().indexOf(element));
      lupa.setAttribute("open", "");
      document.body.style.overflow = "hidden";
      lupa.querySelector(".lupa__buton--close").focus();
    }

    function inchide() {
      lupa.removeAttribute("open");
      document.body.style.overflow = "";
      imgLupa.src = "";
      if (ultimulFocus) ultimulFocus.focus();
    }

    poze.forEach(function (element) {
      element.addEventListener("click", function () { deschide(element); });
      element.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          deschide(element);
        }
      });
    });

    lupa.querySelector(".lupa__buton--close").addEventListener("click", inchide);
    lupa.querySelector(".lupa__buton--prev").addEventListener("click", function () { arata(indexCurent - 1); });
    lupa.querySelector(".lupa__buton--next").addEventListener("click", function () { arata(indexCurent + 1); });

    lupa.addEventListener("click", function (e) {
      if (e.target === lupa) inchide();
    });

    document.addEventListener("keydown", function (e) {
      if (!lupa.hasAttribute("open")) return;
      if (e.key === "Escape") inchide();
      if (e.key === "ArrowLeft") arata(indexCurent - 1);
      if (e.key === "ArrowRight") arata(indexCurent + 1);
    });
  }

  /* ---------- apariție la scroll ---------- */
  var deAratat = document.querySelectorAll(".apare");
  if (deAratat.length && "IntersectionObserver" in window) {
    var observator = new IntersectionObserver(function (intrari) {
      intrari.forEach(function (intrare) {
        if (intrare.isIntersecting) {
          intrare.target.classList.add("vizibil");
          observator.unobserve(intrare.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    deAratat.forEach(function (element) { observator.observe(element); });
  } else {
    deAratat.forEach(function (element) { element.classList.add("vizibil"); });
  }
})();
