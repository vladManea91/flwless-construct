# Site client — Eleventy + Decap CMS + Netlify

Site de prezentare în limba română, cu panou de administrare pentru client.
Pagini: Acasă, Proiecte, Galerie, Contact.

Stack: Eleventy 2.x, Decap CMS 3.x (auth prin DecapBridge), Netlify Functions +
Netlify Blobs pentru statistici, Netlify Image CDN pentru redimensionarea pozelor.

---

## 1. Ce faci înainte de deploy

Configurația e deja completată cu valorile reale (repo GitHub, site-ul DecapBridge,
domeniul `flawlessconstruct.ro`), deci nu mai trebuie umplute placeholdere.
Verifică doar că, dacă schimbi domeniul mai târziu, îl actualizezi în **două** locuri:

- **`src/_data/site.json`**, câmpul `url` — fără `/` la final.
- **`src/admin/config.yml`**, câmpurile `site_url` și `display_url`.

Restul (nume firmă, telefon, email) le poate schimba clientul singur din panou.

---

## 2. GitHub

1. Creează un repo nou, gol, privat sau public.
2. Urcă **conținutul** acestui folder în rădăcina repo-ului, nu folderul în sine.
   Adică `package.json`, `netlify.toml`, `eleventy.config.js` și `src/` trebuie să
   fie direct în rădăcină.
3. Fișierele care încep cu punct (`.gitignore`, `.nvmrc`) sunt ascunse în Finder.
   Dacă urci prin interfața web GitHub, activează afișarea fișierelor ascunse
   (`Cmd + Shift + .` pe Mac) înainte să le tragi în browser.

Fișierul de config se numește `eleventy.config.js`, nu `.eleventy.js`, exact ca să
nu fie tratat ca fișier ascuns la upload.

---

## 3. Netlify

1. **Add new site → Import an existing project** → alege repo-ul.
2. Setările de build sunt citite din `netlify.toml`, deci nu trebuie completate manual
   (Node 22, `npm run build`, publică din `_site`):
   - Build command: `npm run build`
   - Publish directory: `_site`
   - Functions directory: `netlify/functions`
   - Node 22
3. Deploy. Site-ul urcă pe un subdomeniu de tip `nume-random.netlify.app`.
4. **Site configuration → Change site name** ca să pui un subdomeniu decent,
   de exemplu `flawless-construct.netlify.app`.
5. Pune adresa asta înapoi în `site.json` (`url`) și în `config.yml`
   (`site_url`, `display_url`), apoi commit. Fără asta, sitemap-ul și linkurile de
   share către Facebook/WhatsApp arată greșit.

Domeniul se adaugă mai târziu din **Domain management**, fără să schimbi codul,
în afară de câmpul `url` din setări.

---

## 4. Autentificare pentru client (DecapBridge, PKCE)

Netlify Identity a fost repus pe listă în februarie 2026, dar DecapBridge rămâne
varianta mai bună aici: clientul se loghează cu emailul lui, fără cont de GitHub.

Configurația din `src/admin/config.yml` folosește deja autentificarea PKCE a
DecapBridge (`auth_type: pkce`, `base_url`, `auth_endpoint`, `auth_token_endpoint`),
cu site-ul deja creat pe DecapBridge. Dacă trebuie refăcut de la zero:

1. Cont pe <https://decapbridge.com>, apoi **Create New Site**.
2. Completează:
   - **Repository**: `vladManea91/flwless-construct`
   - **GitHub token**: token fine-grained, generat din GitHub → Settings →
     Developer Settings → Personal access tokens → Fine-grained tokens.
     Expirare: **No expiration**. Acces: doar repo-ul ăsta. Permisiuni:
     **Contents: Read and write** și **Pull requests: Read and write**.
   - **Decap CMS URL**: `https://flawlessconstruct.ro/admin/`
3. DecapBridge generează blocul `backend:` (cu `auth_endpoint`, `auth_token_endpoint`,
   `gateway_url`) — se copiază peste blocul din `config.yml`.
4. **Manage Collaborators** → adaugi numele și emailul clientului →
   **Send Invitation Email**. Primește invitație, își face parola, gata.

### Eroarea „Access token does not have permission to access this repository”

Aproape întotdeauna e una dintre astea trei, verificate direct pe token-ul din
GitHub → Settings → Developer settings → Fine-grained tokens → tokenul respectiv:

- **Lipsește o permisiune.** Trebuie bifate explicit **Contents: Read and write**
  ȘI **Pull requests: Read and write** — nu doar Read la ambele.
- **Token-ul e legat de alt repo.** Sub „Repository access”, verifică exact
  `vladManea91/flwless-construct`, nu un fork sau un alt nume vechi de repo.
- **Repo-ul e sub o organizație.** Un token de cont personal are nevoie de
  aprobare explicită de „Organization access” dacă repo-ul nu e pe contul
  personal — poate rămâne „pending” până un admin de organizație îl aprobă.

Dacă `/admin` se învârte la login (altă eroare, diferită de cea de mai sus),
verifică în ordinea asta: site-id-ul din `auth_endpoint`/`auth_token_endpoint`,
permisiunile tokenului, numele branch-ului (`main`).

---

## 5. Statistici

Statisticile sunt proprii, fără Google Analytics și fără cookie-uri. Se văd pe
`/statistici/`, iar în panoul de administrare există un buton fix, stânga-jos.

Ca să meargă:

1. Netlify → **Site configuration → Environment variables → Add a variable**
2. Key: `ANALYTICS_TOKEN`, Value: o parolă la alegerea ta.
3. Redeploy (orice commit nou, sau **Trigger deploy → Clear cache and deploy site**).

Fără variabila asta, pagina de statistici răspunde cu eroare, ceea ce e intenționat.
Datele se scriu în Netlify Blobs, se activează singur, nu trebuie configurat nimic.

Ce vezi acolo: pagini văzute, vizite, de unde vin oamenii (Google, Facebook,
Instagram, direct, ChatGPT etc.), site-uri care trimit trafic, campanii UTM,
pagini vizitate, țări, dispozitive, și click-urile pe telefon / email / WhatsApp.

Pentru campanii plătite, adaugă UTM la link:
`https://site.ro/?utm_source=facebook&utm_medium=cpc&utm_campaign=renovari-iunie`

Datele se păstrează pe zile, 90 de zile în urmă fiind maximul afișat.

---

## 6. Structura proiectului

```
eleventy.config.js        colecții, filtre, Netlify Image CDN
netlify.toml              build, funcții, headere
netlify/functions/
  track.mjs               scrie vizitele în Netlify Blobs (/api/track)
  stats.mjs               agregă datele pentru panou (/api/stats)
src/
  _data/
    site.json             setări generale, meniu, culori
    acasa.json            tot textul de pe prima pagină
    proiecteIndex.json    textul paginii Proiecte
    galerie.json          pozele din galerie
    contact.json          persoana de contact, telefon, email
    build.js              anul curent pentru subsol
  _includes/
    layouts/base.njk      HTML, SEO, culori injectate din setări
    layouts/proiect.njk   pagina unui proiect
    partials/             antet, subsol, card proiect, CTA, bară mobil
  proiecte/*.md           câte un fișier per proiect
  admin/                  Decap CMS (index.html + config.yml)
  assets/css/style.css    tot CSS-ul
  assets/js/site.js       meniu, filtre, lightbox
  assets/js/analitice.js  trimite datele către /api/track
  images/uploads/         pozele încărcate din panou
  index.njk               Acasă
  proiecte.njk            lista de proiecte
  galerie.njk             galeria
  contact.njk             contact
  statistici.njk          panoul de statistici, protejat cu parolă
```

---

## 7. Local

```bash
npm install
npm start          # http://localhost:8080
```

`npm start` rulează doar Eleventy, deci pozele redimensionate prin Netlify Image
CDN nu se încarcă local (linkurile `/.netlify/images` dau 404). E normal.
Dacă vrei și pozele și funcțiile local:

```bash
npm install -g netlify-cli
netlify dev
```

## 7bis. Teste

Trei seturi de teste automate, fără niciun serviciu extern:

```bash
npm test              # rulează toate cele trei seturi, în ordine
npm run test:dev      # ~50 teste peste funcțiile pure (filtre, statistici)
npm run test:qa       # construiește site-ul, apoi verifică HTML-ul rezultat
npm run test:class    # verifică sistemul de culori și clasele CSS
```

**`test:dev`** — testează bucățile de logică din `lib/filtre.js` și
`lib/analitice.mjs` izolat, fără Eleventy și fără rețea: formatarea datelor în
română, generarea adreselor de imagine, agregarea statisticilor pe zile.

**`test:qa`** — construiește site-ul (`npm run build`) și verifică rezultatul din
`_site/`: toate paginile există, linkurile interne nu sunt rupte, pozele
referite chiar există, titlurile SEO sunt unice, sitemap-ul e corect, datele de
contact din pagină corespund cu setările, meniul mobil are structura cerută.

**`test:class`** — verifică sistemul vizual: fiecare token de culoare din
`:root` se rezolvă corect, combinațiile text/fundal folosite în site trec
pragul de contrast WCAG AA, iar fiecare clasă CSS folosită într-un șablon
există cu adevărat în foaia de stil (și invers).

Dacă modifici culorile din panoul de administrare (Setări site), rulează din
nou `npm run test:class` — testele de contrast recalculează totul cu culorile
noi din `src/_data/site.json` și pică dacă o combinație nu mai e lizibilă.

---

## 8. Poze

Clientul urcă poze direct din telefon, deci vor fi mari. Nu trebuie să faci nimic:
fiecare `<img>` trece prin Netlify Image CDN și primește variante de
480 / 768 / 1080 / 1600 / 2000 px, servite după lățimea ecranului.

Nu există o limită de mărime impusă din panou (asta necesită o bibliotecă externă
de media, cum ar fi Uploadcare, ceea ce complică autentificarea pentru client).
În practică limita reală vine de la GitHub: fișiere peste 100 MB sunt refuzate
direct de git. Pentru poze de telefon, asta nu e niciodată o problemă.

Pozele stau în repo, în `src/images/uploads/`. Dacă în timp devin multe sute,
merită mutate pe Cloudinary, dar până la câteva sute de MB nu e o problemă.

---

## 9. Culori și fonturi

Cele trei culori se schimbă din panou, **Setări site**, și se aplică pe tot site-ul.
Sunt injectate ca variabile CSS în `base.njk`.

Fonturile sunt Archivo (titluri, etichete) și Literata (text). Se schimbă în două
locuri: linkul Google Fonts din `src/_includes/layouts/base.njk` și variabilele
`--display` / `--body` din capul fișierului `src/assets/css/style.css`.

---

## 10. Ce urmează după predare

Când clientul salvează ceva în panou, Decap face commit pe GitHub, Netlify vede
commit-ul și reconstruiește site-ul. Durează în jur de un minut. Nu trebuie să
faci nimic manual.

Fișierul `GHID-ADMIN.md` este pentru client. Trimite-i-l ca PDF sau pune-i textul
într-un document, e scris în română, fără termeni tehnici.
