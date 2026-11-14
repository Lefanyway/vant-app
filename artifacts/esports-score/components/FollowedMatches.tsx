import { useQuery } from "@tanstack/react-query";
import { StyleSheet, Text, View } from "react-native";
import { EmptyState, ListSkeleton } from "@/components/MobileChrome";
import { UpcomingCard } from "@/components/UpcomingCard";
import { CompetitionGroups } from "@/components/RecentByTeam";
import { useColors } from "@/hooks/useColors";
import { fetchCompetitionMatches, fetchTeamMatches, toMatch } from "@/lib/api";
import type { Match } from "@/lib/data";

const dayKey = (iso: string) => { const date = new Date(iso); return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`; };

// Upcoming matches of everything the user follows, one card per day, split by competition inside it.
export function FollowedMatches({ kind, ids, filter = "upcoming" }: { kind: "team" | "competition"; ids: string[]; filter?: "upcoming" | "finished" }) {
  const colors = useColors();
  const query = useQuery({
    queryKey: ["followed-matches", kind, ids, filter], staleTime: 5 * 60_000,
    queryFn: async () => {
      const pages = await Promise.allSettled(ids.slice(0, 12).map((id) => kind === "team" ? fetchTeamMatches(id, filter) : fetchCompetitionMatches(id, filter)));
      const rows = pages.flatMap((page) => page.status === "fulfilled" ? page.value.matches : []);
      const matches = [...new Map(rows.map((row) => [row.id, toMatch(row)])).values()].filter((match) => match.startTime);
      // Upcoming reads forward from today; past results start with the most recent.
      const direction = filter === "upcoming" ? 1 : -1;
      return matches.sort((a, b) => direction * (Date.parse(a.startTime!) - Date.parse(b.startTime!))).slice(0, filter === "upcoming" ? 30 : 15);
    },
  });
  if (query.isLoading) return <ListSkeleton />;
  if (query.isError) return <EmptyState title="Não foi possível carregar" onRetry={() => void query.refetch()} />;
  const days = new Map<string, Match[]>();
  for (const match of query.data ?? []) days.set(dayKey(match.startTime!), [...(days.get(dayKey(match.startTime!)) ?? []), match]);
  if (!days.size) return filter === "upcoming" ? <Text style={[styles.none, { color: colors.mutedForeground }]}>Nenhuma partida marcada por enquanto.</Text> : null;
  // Upcoming matches use the standard card; past results stay grouped by day.
  if (filter === "upcoming") return <View>{(query.data ?? []).map((match) => <UpcomingCard key={match.id} match={match} />)}</View>;
  return <CompetitionGroups matches={query.data ?? []} />;
}

const styles = StyleSheet.create({
  
  
  none: { fontSize: 14, paddingHorizontal: 4, paddingVertical: 8 }
});
