import { router } from "expo-router";
import { fetchMatchDetails, fetchMatchMaps, fetchMatchStats, fetchTeamNews, fetchTeamOverview } from "@/lib/api";
import type { Match, Team } from "@/lib/data";
import { queryClient } from "@/lib/queryClient";

export function goBackOrHome() {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

export function openCompetition(id: string) {
  router.push(`/competitions/${encodeURIComponent(id)}`);
}

// Called on touch-down, so the next screen's data is usually there when it opens.
export function warmTeam(team: Team) {
  queryClient.setQueryData(["team-preview", team.id], team);
  void queryClient.prefetchQuery({ queryKey: ["team-overview", team.id], queryFn: () => fetchTeamOverview(team.id), staleTime: 6 * 60 * 60_000 });
  void queryClient.prefetchQuery({ queryKey: ["team-news", team.id], queryFn: () => fetchTeamNews(team.id), staleTime: 15 * 60_000 });
}

export function warmMatch(id: string, match: Match) {
  queryClient.setQueryData(["match-preview", id], match);
  void queryClient.prefetchQuery({ queryKey: ["match-details", id], queryFn: () => fetchMatchDetails(id), staleTime: 60_000 });
  void queryClient.prefetchQuery({ queryKey: ["match-stats", id], queryFn: () => fetchMatchStats(id), staleTime: 60_000 });
  if (match.status === "Finished" || match.status === "Live") void queryClient.prefetchQuery({ queryKey: ["match-maps", id], queryFn: () => fetchMatchMaps(id), staleTime: 5 * 60_000 });
}

export function openTeam(team: Team) {
  warmTeam(team);
  router.push(`/teams/${encodeURIComponent(team.id)}`);
}

export function openMatch(id: string, match?: Match) {
  if (match) warmMatch(id, match);
  router.push(`/match/${encodeURIComponent(id)}`);
}
