import "dotenv/config";
import fetch from "node-fetch";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..");

const FPL_BASE = process.env.FPL_BASE || "https://fantasy.premierleague.com/api";
// DATA_DIR ligger ett steg över /api → ../data
const DATA_DIR = resolve(__dirname, "../../data");

async function fetchJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": "fpl-edge-mvp" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function main() {
  console.log("Fetching FPL bootstrap & fixtures...");
  const bootstrap = await fetchJson(`${FPL_BASE}/bootstrap-static/`);
  const fixtures  = await fetchJson(`${FPL_BASE}/fixtures/`);

  await writeFile(resolve(DATA_DIR, "bootstrap.json"), JSON.stringify(bootstrap, null, 2));
  await writeFile(resolve(DATA_DIR, "fixtures.json"), JSON.stringify(fixtures,  null, 2));

  console.log("Saved to /data/bootstrap.json and /data/fixtures.json");
}

main().catch(err => {
  console.error("Fetch failed:", err);
  process.exit(1);
});