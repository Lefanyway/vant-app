import { absoluteLogo, fetchCompetitions, type ApiSearchResult } from "@/lib/api";
import { supabase } from "@/lib/supabase";

// Per-account flag: the onboarding is shown once, on the first visit.
export const onboardingKey = (userId?: string) => `vant:onboarded:${userId ?? "anon"}`;

const DAY = 24 * 60 * 60_000;
const SIDE = /(^|\s)(academy|female|fem|women|gc|youth|junior|jr|white|black)(\s|$)/i;
const sideRoster = (name: string, acronym: string | null) => SIDE.test(name) || /\.[a-z0-9]+$/i.test(acronym ?? "");

// The teams people know: strongest first by the model's Elo, only those that played in the last six months.
// Read straight from the database (no provider call), so the list is ready the moment the step opens.
export async function popularTeams(): Promise<ApiSearchResult[]> {
  const { data: elo, error } = await supabase.from("team_elo").select("team_id, elo").gte("rated_at", new Date(Date.now() - 180 * DAY).toISOString()).order("elo", { ascending: false }).limit(40);
  if (error) throw error;
  const ids = (elo ?? []).map((row) => row.team_id as string);
  const { data: teams } = ids.length ? await supabase.from("teams").select("id, name, acronym, logo_url, country").in("id", ids) : { data: [] };
  const byId = new Map((teams ?? []).map((team) => [team.id as string, team]));
  return ids.flatMap((id) => {
    const team = byId.get(id);
    // Main rosters only here: academy, women's and youth teams are still a search away.
    return team && !sideRoster(team.name as string, team.acronym as string | null) ? [{ type: "team" as const, id, name: team.name as string, acronym: team.acronym ?? undefined, logoUrl: absoluteLogo(team.logo_url ?? undefined), country: team.country ?? undefined, countryName: team.country === "BR" ? "Brasil" : undefined }] : [];
  });
}

// The big events first (VCT, Champions, Masters, Game Changers, Challengers), then the rest.
const MAJOR = /\b(vct|champions|masters|game changers|challengers)\b/i;
export async function popularCompetitions(): Promise<ApiSearchResult[]> {
  const rows = await fetchCompetitions("valorant");
  return rows.map((row) => ({ type: "competition" as const, id: row.id, name: row.name, logoUrl: row.logoUrl, season: row.serieName }))
    .sort((a, b) => Number(MAJOR.test(b.name)) - Number(MAJOR.test(a.name)));
}
