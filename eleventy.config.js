const { DateTime } = require("luxon");

module.exports = function (eleventyConfig) {
  // Fisiere copiate ca atare in _site
  eleventyConfig.addPassthroughCopy({ "src/admin": "admin" });
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/images": "images" });
  eleventyConfig.addPassthroughCopy({ "src/_redirects": "_redirects" });

  // Panoul de administrare este copiat ca atare, nu procesat ca sablon
  eleventyConfig.ignores.add("src/admin/**");

  // ---------------------------------------------------------------
  // Colectii
  // ---------------------------------------------------------------
  eleventyConfig.addCollection("proiecte", (collection) => {
    return collection
      .getFilteredByGlob("src/proiecte/*.md")
      .filter((item) => !item.data.ascuns)
      .sort((a, b) => {
        const oa = Number(a.data.ordine ?? 999);
        const ob = Number(b.data.ordine ?? 999);
        if (oa !== ob) return oa - ob;
        return b.date - a.date;
      });
  });

  // ---------------------------------------------------------------
  // Netlify Image CDN: redimensionare automata la cerere.
  // Clientul incarca o poza mare din telefon, vizitatorul primeste
  // varianta potrivita pentru ecranul lui.
  // ---------------------------------------------------------------
  const cdn = (src, width, ratio) => {
    if (!src) return "";
    if (/^https?:\/\//.test(src)) return src;
    let url = `/.netlify/images?url=${encodeURIComponent(src)}&w=${width}&fit=cover`;
    if (ratio) url += `&h=${Math.round(width * ratio)}`;
    return url;
  };

  eleventyConfig.addFilter("img", (src, width = 1200, ratio = null) => cdn(src, width, ratio));

  eleventyConfig.addFilter("srcset", (src, ratio = null, maxim = 2000) => {
    if (!src || /^https?:\/\//.test(src)) return "";
    return [480, 768, 1080, 1600, 2000]
      .filter((w) => w <= maxim)
      .map((w) => `${cdn(src, w, ratio)} ${w}w`)
      .join(", ");
  });

  // ---------------------------------------------------------------
  // Filtre utile
  // ---------------------------------------------------------------
  const LUNI = [
    "ianuarie", "februarie", "martie", "aprilie", "mai", "iunie",
    "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"
  ];

  eleventyConfig.addFilter("dataRo", (dateObj) => {
    if (!dateObj) return "";
    const d = DateTime.fromJSDate(new Date(dateObj), { zone: "utc" });
    return `${d.day} ${LUNI[d.month - 1]} ${d.year}`;
  });

  eleventyConfig.addFilter("anul", (dateObj) => {
    if (!dateObj) return "";
    return DateTime.fromJSDate(new Date(dateObj), { zone: "utc" }).year;
  });

  eleventyConfig.addFilter("isoDate", (dateObj) => {
    if (!dateObj) return "";
    return DateTime.fromJSDate(new Date(dateObj), { zone: "utc" }).toISODate();
  });

  eleventyConfig.addFilter("scurt", (text, limita = 160) => {
    const curat = (text || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return curat.length > limita ? curat.slice(0, limita).trim() + "…" : curat;
  });

  eleventyConfig.addFilter("telLink", (nr) => (nr || "").replace(/[^\d+]/g, ""));

  eleventyConfig.addFilter("unice", (arr) => [...new Set((arr || []).filter(Boolean))]);

  eleventyConfig.addFilter("slugRo", (text) =>
    (text || "")
      .toString()
      .toLowerCase()
      .replace(/ă|â/g, "a").replace(/î/g, "i").replace(/ș|ş/g, "s").replace(/ț|ţ/g, "t")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  );

  eleventyConfig.addFilter("json", (value) => JSON.stringify(value));

  eleventyConfig.addFilter("head", (arr, n) => {
    if (!Array.isArray(arr)) return [];
    return n < 0 ? arr.slice(n) : arr.slice(0, n);
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk"
  };
};
