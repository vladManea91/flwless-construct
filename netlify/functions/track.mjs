import { getStore } from "@netlify/blobs";
import { SHARDS, aplica, gol } from "../../lib/analitice.mjs";

export const config = { path: "/api/track" };

export default async (req, context) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let date;
  try {
    date = await req.json();
  } catch {
    return new Response("", { status: 204 });
  }
  if (!date || typeof date !== "object") {
    return new Response("", { status: 204 });
  }

  const gazdaProprie = new URL(req.url).hostname;
  const tara = (context && context.geo && context.geo.country && context.geo.country.name) || "necunoscut";
  const zi = new Date().toISOString().slice(0, 10);
  const cheie = `zi/${zi}/${Math.floor(Math.random() * SHARDS)}`;

  const store = getStore({ name: "analitice", consistency: "strong" });

  let stare;
  try {
    stare = (await store.get(cheie, { type: "json" })) || gol();
  } catch {
    stare = gol();
  }

  try {
    await store.setJSON(cheie, aplica(stare, date, gazdaProprie, tara));
  } catch {
    // dacă scrierea eșuează, pagina vizitatorului nu are de suferit
  }

  return new Response("", { status: 204 });
};
