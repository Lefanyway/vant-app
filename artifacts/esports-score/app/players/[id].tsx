import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BackButton } from "@/components/BackButton";
import { Flag } from "@/components/Flag";
import { ListSkeleton } from "@/components/MobileChrome";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { CompetitionGroups } from "@/components/RecentByTeam";
import { RecentForm } from "@/components/RecentForm";
import { ResolvedLogo } from "@/components/ResolvedLogo";
import { UpcomingCard } from "@/components/UpcomingCard";
import { font } from "@/constants/type";
import { useColors } from "@/hooks/useColors";
import { fetchPlayerPhoto, fetchTeam, fetchTeamMatches, toMatch } from "@/lib/api";
import { openTeam } from "@/lib/navigation";

const roles: Record<string, string> = { duelist: "Duelista", initiator: "Iniciador", controller: "Controlador", sentinel: "Sentinela", flex: "Flex", igl: "Capitão (IGL)" };

// A player's page: who they are, their team, and how the team has been doing in the matches they play.
export default function PlayerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; name?: string; fullName?: string; country?: string; imageUrl?: string; imageCredit?: string; role?: string; teamId?: string }>();
  const name = params.name ?? "Jogador";
  const teamId = params.teamId ?? "";
  const team = useQuery({ queryKey: ["team-preview", teamId], queryFn: () => fetchTeam(teamId), enabled: Boolean(teamId), staleTime: 10 * 60_000 });
  const photo = useQuery({ queryKey: ["player-photo", name], queryFn: () => fetchPlayerPhoto(name), enabled: !params.imageUrl, staleTime: Infinity });
  const matches = useQuery({ queryKey: ["team-matches", teamId, "all", 1], queryFn: () => fetchTeamMatches(teamId, "all"), enabled: Boolean(teamId), staleTime: 5 * 60_000 });
  const imageUrl = params.imageUrl || photo.data?.imageUrl;
  const credit = params.imageUrl ? params.imageCredit : photo.data?.credit;
  const all = (matches.data?.matches ?? []).map(toMatch);
  const next = all.filter((match) => match.status === "Upcoming" || match.status === "Live").sort((a, b) => Date.parse(a.startTime ?? "") - Date.parse(b.startTime ?? ""))[0];
  const past = all.filter((match) => match.status === "Finished").sort((a, b) => Date.parse(b.startTime ?? "0") - Date.parse(a.startTime ?? "0"));
  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <View style={[styles.nav, { paddingTop: Math.max(insets.top, 8) }]}><BackButton /></View>
    <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: insets.bottom + 40 }}>
      <View style={[styles.hero, { backgroundColor: colors.card }]}>
        <PlayerAvatar name={name} imageUrl={imageUrl} size={96} />
        <Text style={[styles.name, { color: colors.foreground }]}>{name}</Text>
        {params.fullName && params.fullName !== name ? <Text style={[styles.fullName, { color: colors.mutedForeground }]}>{params.fullName.replace(/\s+/g, " ")}</Text> : null}
        <View style={styles.chips}>
          {params.country ? <View style={[styles.chip, { backgroundColor: colors.secondary }]}><Flag code={params.country} width={18} /></View> : null}
          {params.role && roles[params.role] ? <View style={[styles.chip, { backgroundColor: colors.secondary }]}><Text style={[styles.chipText, { color: colors.foreground }]}>{roles[params.role]}</Text></View> : null}
        </View>
        {team.data ? <Pressable accessibilityRole="link" onPress={() => openTeam(team.data!)} style={[styles.team, { backgroundColor: colors.secondary }]}>
          <ResolvedLogo type="team" name={team.data.name} entityId={team.data.id} logoUrl={team.data.logoUrl} size={24} />
          <Text style={[styles.teamName, { color: colors.foreground }]}>{team.data.name}</Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </Pressable> : null}
        {credit && imageUrl ? <Text style={[styles.credit, { color: colors.mutedForeground }]}>Foto: {credit} (CC BY-SA)</Text> : null}
      </View>

      {matches.isLoading ? <ListSkeleton count={2} /> : <>
        {past.length ? <RecentForm matches={past} teamId={teamId} /> : null}
        <Text style={[styles.section, { color: colors.mutedForeground }]}>Próxima partida</Text>
        {next ? <UpcomingCard match={next} /> : <Text style={[styles.empty, { color: colors.mutedForeground }]}>Nenhuma partida marcada.</Text>}
        <Text style={[styles.section, { color: colors.mutedForeground }]}>Últimas partidas</Text>
        {past.length ? <CompetitionGroups matches={past.slice(0, 8)} /> : <Text style={[styles.empty, { color: colors.mutedForeground }]}>Sem partidas recentes.</Text>}
      </>}

      <View style={[styles.note, { backgroundColor: colors.card }]}>
        <Feather name="bar-chart-2" size={16} color={colors.mutedForeground} />
        <Text style={[styles.noteText, { color: colors.mutedForeground }]}>Estatísticas por partida (ACS, K/D) e nota do jogador chegam quando a fonte de estatísticas detalhadas estiver ligada.</Text>
      </View>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  nav: { paddingHorizontal: 8 },
  hero: { borderRadius: 24, padding: 20, alignItems: "center", gap: 8 },
  name: { fontSize: 24, fontFamily: font.bold, marginTop: 6 },
  fullName: { fontSize: 14, fontFamily: font.medium },
  chips: { flexDirection: "row", gap: 8, marginTop: 4 },
  chip: { height: 28, borderRadius: 14, paddingHorizontal: 10, alignItems: "center", justifyContent: "center" },
  chipText: { fontSize: 12, fontFamily: font.semibold },
  team: { marginTop: 8, minHeight: 40, borderRadius: 20, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 8 },
  teamName: { fontSize: 14, fontFamily: font.semibold },
  credit: { fontSize: 10, marginTop: 4 },
  section: { fontSize: 15, fontFamily: font.semibold, marginTop: 24, marginBottom: 9 },
  empty: { fontSize: 14, paddingHorizontal: 4 },
  note: { marginTop: 24, borderRadius: 16, padding: 14, flexDirection: "row", gap: 10, alignItems: "flex-start" },
  noteText: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: font.medium },
});
