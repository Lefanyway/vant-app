// Player photos the provider lacks, looked up on Liquipedia (photos there are CC BY-SA; the app credits them).
// Liquipedia asks API clients for a descriptive User-Agent and at most one request every 2 seconds.
const API = "https://liquipedia.net/valorant/api.php";
const USER_AGENT = "VANT/1.0 (https://github.com/Lefanyway/vant_app)";
const GAP_MS = 2_100;

import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

// Found photos (and misses) survive API restarts, so a roster never goes back to initials.
const store = path.join(process.env.LOGO_CACHE_DIR || path.join(tmpdir(), "vant-logos-v3"), "player-photos.json");
const found = new Map<string, string | null>(Object.entries((() => { try { return JSON.parse(readFileSync(store, "utf8")) as Record<string, string | null>; } catch { return {}; } })()));
let saving: Promise<void> = Promise.resolve();
const save = () => { saving = saving.then(() => mkdir(path.dirname(store), { recursive: true })).then(() => writeFile(store, JSON.stringify(Object.fromEntries(found)))).catch(() => undefined); };
let queue: Promise<unknown> = Promise.resolve();
let last = 0;

// Event photos are named after the player: "Darker at VCT 2026 Americas Stage 1.jpg". Newest event first.
export function pickPhoto(name: string, files: { title: string; url?: string }[]): string | null {
  const nick = name.trim().toLowerCase();
  const photos = files.filter((file) => {
    const title = file.title.replace(/^File:/, "").toLowerCase();
    // The team sometimes comes first: "LOUD erde at VCT Americas 2026 Stage 1.jpg".
    return file.url && /\.(jpe?g|png)$/.test(title) && [" at ", " in ", " -"].some((joint) => ` ${title}`.includes(` ${nick}${joint}`));
  });
  const year = (title: string) => Number(title.match(/20\d\d/)?.[0] ?? 0);
  return photos.sort((a, b) => year(b.title) - year(a.title))[0]?.url ?? null;
}

async function lookup(name: string): Promise<string | null> {
  const wait = last + GAP_MS - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  last = Date.now();
  const params = new URLSearchParams({ action: "query", titles: name, generator: "images", gimlimit: "50", prop: "imageinfo", iiprop: "url", iiurlwidth: "240", format: "json", redirects: "1" });
  const response = await fetch(`${API}?${params}`, { headers: { "User-Agent": USER_AGENT, "Accept-Encoding": "gzip" }, signal: AbortSignal.timeout(8_000) });
  if (!response.ok) return null;
  const body = await response.json() as { query?: { pages?: Record<string, { title: string; imageinfo?: { thumburl?: string; url?: string }[] }> } };
  const files = Object.values(body.query?.pages ?? {}).map((page) => ({ title: page.title, url: page.imageinfo?.[0]?.thumburl ?? page.imageinfo?.[0]?.url }));
  return pickPhoto(name, files);
}

// One lookup per name for the life of the process, failures included, all through the same queue.
export function playerPhoto(name: string): Promise<string | null> {
  const key = name.trim().toLowerCase();
  if (!key) return Promise.resolve(null);
  if (found.has(key)) return Promise.resolve(found.get(key)!);
  const next = queue.then(() => found.has(key) ? found.get(key)! : lookup(name).catch(() => null)).then((url) => { found.set(key, url); save(); return url; });
  queue = next.catch(() => undefined);
  return next;
}

export const cachedPlayerPhoto = (name: string) => found.get(name.trim().toLowerCase());
