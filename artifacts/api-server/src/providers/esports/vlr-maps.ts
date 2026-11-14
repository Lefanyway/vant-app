// Map names and round scores from a free community API that reads VLR.gg (vlr.orlandomm.net).
// PandaScore's free plan only says who won each map; this fills in which map it was and the score.
import { normalize } from "./search-rank";
import type { Match, MatchGame } from "./types";

const API = "https://vlr.orlandomm.net/api/v1";
type Listed = { id: string; teams: { name: string }[] };
type VlrMap = { name?: string; status?: string; pickedBy?: string; teams?: { name: string; score?: number }[] };

async function get<T>(path: string): Promise<T | null> {
  const response = await fetch(`${API}${path}`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8_000) }).catch(() => null);
  if (!response?.ok) return null;
  return (await response.json() as { data?: T }).data ?? null;
}

// "LOUD" and "LOUD" or "Team Liquid Brazil" and "Liquid Brazil": same team when one name contains the other.
const same = (a: string, b: string) => { const x = normalize(a), y = normalize(b); return Boolean(x && y) && (x === y || x.includes(y) || y.includes(x)); };

function find(list: Listed[], match: Match) {
  return list.find((item) => item.teams.length >= 2
    && ((same(item.teams[0].name, match.homeTeam.name) && same(item.teams[1].name, match.awayTeam.name))
      || (same(item.teams[0].name, match.awayTeam.name) && same(item.teams[1].name, match.homeTeam.name))));
}

// Live matches are looked up among those in play, finished ones among the latest results (five pages, about a month).
async function vlrId(match: Match): Promise<string | null> {
  if (match.status === "live") return find((await get<Listed[]>("/matches")) ?? [], match)?.id ?? null;
  for (let page = 1; page <= 5; page++) {
    const hit = find((await get<Listed[]>(`/results?page=${page}`)) ?? [], match);
    if (hit) return hit.id;
  }
  return null;
}

// The series' games with the map name and the rounds each side took, in the series' order.
export async function withMapNames(match: Match): Promise<Match> {
  if (match.status !== "live" && match.status !== "finished") return match;
  if (match.startTime && Date.now() - Date.parse(match.startTime) > 35 * 86_400_000) return match;
  const id = await vlrId(match).catch(() => null);
  const detail = id ? await get<{ maps?: VlrMap[] }>(`/matches/${id}`).catch(() => null) : null;
  const maps = (detail?.maps ?? []).filter((map) => map.name && map.name !== "TBD");
  if (!maps.length) return match;
  const games: MatchGame[] = maps.map((map, index) => {
    const known = match.games?.find((game) => game.number === index + 1);
    const home = map.teams?.find((team) => same(team.name, match.homeTeam.name));
    const away = map.teams?.find((team) => same(team.name, match.awayTeam.name));
    const played = map.status === "played" || (home?.score ?? 0) + (away?.score ?? 0) > 0;
    return { ...(known ?? { number: index + 1, status: played ? "finished" : "scheduled" }), mapName: map.name, homeRounds: home?.score, awayRounds: away?.score };
  });
  return { ...match, games };
}
