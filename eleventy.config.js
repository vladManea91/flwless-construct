const filtre = require("./lib/filtre.js");

module.exports = function (eleventyConfig) {
  // Fișiere copiate ca atare în _site
  eleventyConfig.addPassthroughCopy({ "src/admin": "admin" });
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/images": "images" });
  eleventyConfig.addPassthroughCopy({ "src/_redirects": "_redirects" });

  // Panoul de administrare e copiat ca atare, nu procesat ca șablon
  eleventyConfig.ignores.add("src/admin/**");

  // ---------------------------------------------------------------
  // Colecții
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
  // Filtre (implementarea stă în lib/filtre.js și e acoperită de teste)
  // ---------------------------------------------------------------
  eleventyConfig.addFilter("img", (src, width = 1200, ratio = null) => filtre.cdn(src, width, ratio));
  eleventyConfig.addFilter("srcset", (src, ratio = null, maxim = 2000) => filtre.srcset(src, ratio, maxim));
  eleventyConfig.addFilter("dataRo", filtre.dataRo);
  eleventyConfig.addFilter("anul", filtre.anul);
  eleventyConfig.addFilter("isoDate", filtre.isoDate);
  eleventyConfig.addFilter("scurt", filtre.scurt);
  eleventyConfig.addFilter("telLink", filtre.telLink);
  eleventyConfig.addFilter("unice", filtre.unice);
  eleventyConfig.addFilter("slugRo", filtre.slugRo);
  eleventyConfig.addFilter("head", filtre.head);
  eleventyConfig.addFilter("json", (value) => JSON.stringify(value));

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
