import { type ApiMatch, toMatch } from "@/lib/api";
import type { Match } from "@/lib/data";
import { supabase } from "@/lib/supabase";

export type MyPick = { matchId: string; teamId: string; homeScore: number | null; awayScore: number | null; match: Match };
export type Graded = MyPick & { state: "open" | "hit" | "exact" | "miss"; points: number };
export type OpenMatch = { match: Match; homeChance: number | null };
export type LeagueRow = { userId: string; name: string; avatar: string | null; points: number; hits: number; total: number };

// 10 points for the right winner, 15 more for the exact series score.
export const HIT_POINTS = 10;
export const EXACT_BONUS = 15;

export async function fetchOpenMatches(): Promise<OpenMatch[]> {
  const { data, error } = await supabase.from("matches").select("payload, predictions(home_win_prob)").eq("status", "scheduled").gt("start_time", new Date().toISOString()).order("start_time").limit(30);
  if (error) throw error;
  return (data ?? []).map((row: { payload: ApiMatch; predictions: { home_win_prob: number } | { home_win_prob: number }[] | null }) => {
    const prediction = Array.isArray(row.predictions) ? row.predictions[0] : row.predictions;
    return { match: toMatch(row.payload), homeChance: prediction?.home_win_prob ?? null };
  });
}

export async function fetchMyPicks(): Promise<MyPick[]> {
  const { data, error } = await supabase.from("picks").select("match_id, team_id, home_score, away_score, matches(payload)").order("created_at", { ascending: false }).limit(300);
  if (error) throw error;
  return (data ?? []).flatMap((row: { match_id: string; team_id: string; home_score: number | null; away_score: number | null; matches: { payload: ApiMatch } | { payload: ApiMatch }[] | null }) => {
    const match = Array.isArray(row.matches) ? row.matches[0] : row.matches;
    return match ? [{ matchId: row.match_id, teamId: row.team_id, homeScore: row.home_score, awayScore: row.away_score, match: toMatch(match.payload) }] : [];
  });
}

export async function savePick(matchId: string, teamId: string, homeScore: number | null = null, awayScore: number | null = null) {
  const { error } = await supabase.from("picks").upsert({ match_id: matchId, team_id: teamId, home_score: homeScore, away_score: awayScore });
  if (error) throw error;
}

// How the crowd split on each match: { matchId: { teamId: count } }.
export async function fetchSplit(matchIds: string[]): Promise<Record<string, Record<string, number>>> {
  if (!matchIds.length) return {};
  const { data, error } = await supabase.rpc("pick_split", { match_ids: matchIds });
  if (error) throw error;
  const split: Record<string, Record<string, number>> = {};
  for (const row of (data ?? []) as { match_id: string; team_id: string; picks: number }[]) (split[row.match_id] ??= {})[row.team_id] = Number(row.picks);
  return split;
}

// This week's league (since Monday), like a weekly league table.
export function weekStart(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

export async function fetchLeague(): Promise<LeagueRow[]> {
  const { data, error } = await supabase.rpc("pick_leaderboard", { since: weekStart().toISOString(), max_rows: 20 });
  if (error) throw error;
  return ((data ?? []) as { user_id: string; display_name: string | null; avatar: string | null; points: number; hits: number; total: number }[])
    .map(row => ({ userId: row.user_id, name: row.display_name || "Fã do VANT", avatar: row.avatar, points: Number(row.points), hits: Number(row.hits), total: Number(row.total) }));
}

export function grade(pick: MyPick): Graded {
  const { match } = pick;
  if (match.status !== "Finished" || match.scoreA === undefined || match.scoreB === undefined || match.scoreA === match.scoreB) return { ...pick, state: "open", points: 0 };
  const winner = match.scoreA > match.scoreB ? match.teamA.id : match.teamB.id;
  if (pick.teamId !== winner) return { ...pick, state: "miss", points: 0 };
  const exact = pick.homeScore === match.scoreA && pick.awayScore === match.scoreB;
  return { ...pick, state: exact ? "exact" : "hit", points: HIT_POINTS + (exact ? EXACT_BONUS : 0) };
}

const startOf = (match: Match) => Date.parse(match.scheduledTime ?? match.startTime ?? "") || 0;

// Right picks in a row, counting back from the most recent finished one.
export function currentStreak(graded: Graded[]) {
  let streak = 0;
  for (const pick of graded.filter(p => p.state !== "open").sort((a, b) => startOf(b.match) - startOf(a.match))) {
    if (pick.state === "miss") break;
    streak += 1;
  }
  return streak;
}

// Maps the winner needs: BO1 → 1, BO3 → 2, BO5 → 3.
export const winsNeeded = (format: Match["format"]) => format === "BO5" ? 3 : format === "BO1" ? 1 : 2;

// A series score is complete when exactly one side reached the maps needed.
export function isValidScore(format: Match["format"], home: number, away: number) {
  const need = winsNeeded(format);
  return (home === need) !== (away === need) && home <= need && away <= need;
}
