import { buzz, Confetti, RollingNumber } from "@/components/Motion";
import { useApp } from "@/context/AppContext";
import { useSpoilers } from "@/context/SpoilerContext";
import { MatchTimeline } from "@/components/MatchTimeline";
import { ResolvedLogo } from "@/components/ResolvedLogo";
import Feather from "@expo/vector-icons/Feather";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BackButton } from "@/components/BackButton";
import { Pulse } from "@/components/MobileChrome";
import { ApiError, errorMessage, fetchMatch, fetchMatchDetails, type MatchDetails } from "@/lib/api";
import type { Match } from "@/lib/data";
import { hasScore } from "@/lib/matches";
import { goBackOrHome, openCompetition } from "@/lib/navigation";
import { TeamBadge } from "@/components/MatchCard";
import { useColors } from "@/hooks/useColors";
import { TeamLink } from "@/components/TeamLink";
import { useActiveScreen } from "@/hooks/useActiveScreen";
import { WinProbability } from "@/components/WinProbability";
import { CompetitionGroups, RecentByTeam } from "@/components/RecentByTeam";
import { ShareButton } from "@/components/ShareButton";
import { officialStreams, WatchOptions } from "@/components/WatchOptions";

type Tab = "Overview" | "H2H";

export default function MatchDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const active = useActiveScreen();
  const [tab, setTab] = useState<Tab>("Overview");
  const previewQuery = useQuery({ queryKey: ["match-preview", id], queryFn: () => fetchMatch(String(id)), enabled: Boolean(id), staleTime: 60_000 });
  const detailsQuery = useQuery({ queryKey: ["match-details", id], queryFn: ({ signal }) => fetchMatchDetails(String(id), signal), enabled: Boolean(id), staleTime: 60_000, refetchInterval: (query) => active && query.state.data?.match.status === "Live" ? 45_000 : false });
  const knownMatch = detailsQuery.data?.match ?? previewQuery.data;
  const details = detailsQuery.data ?? null;
  // A missing match gets a way back instead of a retry that would fail again.
  const notFound = [previewQuery.error, detailsQuery.error].some(error => error instanceof ApiError && error.status === 404) || (!previewQuery.isError && !detailsQuery.isError);
  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <View style={[styles.nav, { paddingTop: Math.max(insets.top, 8), paddingHorizontal: 8 }]}><BackButton /></View>
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 50 }}>
    {knownMatch ? <DetailContent match={knownMatch} details={details} detailsLoading={detailsQuery.isLoading} updatedAt={detailsQuery.dataUpdatedAt} detailsError={detailsQuery.isError ? errorMessage(detailsQuery.error, "Não foi possível carregar o restante da partida.") : null} onRetry={() => { void detailsQuery.refetch(); }} tab={tab} setTab={setTab} colors={colors} /> : previewQuery.isLoading || detailsQuery.isLoading ? <DetailSkeleton colors={colors} /> : notFound ? <View style={styles.errorBox}><Text style={[styles.message, { color: colors.mutedForeground }]}>Partida não encontrada.</Text><Pressable onPress={goBackOrHome}><Text style={[styles.retry, { color: colors.primary }]}>Voltar</Text></Pressable></View> : <View style={styles.errorBox}><Text style={[styles.message, { color: colors.mutedForeground }]}>{errorMessage(detailsQuery.error ?? previewQuery.error, "Não foi possível carregar a partida.")}</Text><Pressable onPress={() => { void previewQuery.refetch(); void detailsQuery.refetch(); }}><Text style={[styles.retry, { color: colors.primary }]}>Tentar novamente</Text></Pressable></View>}
  </ScrollView>
  </View>;
}

function DetailContent({ match, details, detailsLoading, updatedAt, detailsError, onRetry, tab, setTab, colors }: { match: Match; details: MatchDetails | null; detailsLoading: boolean; updatedAt: number; detailsError: string | null; onRetry: () => void; tab: Tab; setTab: (tab: Tab) => void; colors: ReturnType<typeof useColors> }) {
  const spoilers = useSpoilers();
  const party = useCelebration(match, !spoilers.isHidden(match.id));
  const tabs: { key: Tab; label: string }[] = [
    { key: "Overview", label: "Detalhes" },
    ...((details?.headToHead.length ?? 0) > 0 ? [{ key: "H2H" as const, label: "Confrontos" }] : []),
  ];
  return <>
    {party ? <Confetti /> : null}
    <View style={[styles.hero, { backgroundColor: colors.card }]}>
      <View style={styles.heroActions}><ShareButton label="Compartilhar partida" message={`${match.teamA.name} vs ${match.teamB.name} · ${match.tournament} · ${match.time}`} /></View>
      <View style={styles.teams}>
        <TeamColumn team={match.teamA} colors={colors} />
        <View style={styles.scoreBlock}>
          {hasScore(match) && spoilers.isHidden(match.id) ? <Pressable accessibilityRole="button" accessibilityLabel="Mostrar placar" onPress={() => spoilers.reveal(match.id)} style={[styles.reveal, { backgroundColor: colors.secondary }]}><Feather name="eye" size={15} color={colors.foreground} /><Text style={[styles.revealText, { color: colors.foreground }]}>Ver placar</Text></Pressable> : hasScore(match) ? <View style={styles.scoreRow}><RollingNumber value={match.scoreA ?? 0} style={[styles.score, { color: colors.foreground }]} /><Text style={[styles.score, { color: colors.foreground }]}> – </Text><RollingNumber value={match.scoreB ?? 0} style={[styles.score, { color: colors.foreground }]} /></View> : <Text style={[styles.score, { color: colors.foreground }]}>{match.time}</Text>}
          <Text style={[styles.status, { color: match.status === "Live" ? colors.destructive : colors.mutedForeground }]}>{match.status === "Live" ? "● Ao vivo" : match.status === "Finished" ? "Finalizada" : match.status === "Cancelled" ? "Cancelada" : match.status === "Postponed" ? "Adiada" : match.startTime ? new Date(match.startTime).toLocaleDateString("pt-BR", { day: "numeric", month: "short" }) : "A definir"}</Text>
          {match.format ? <Text style={[styles.format, { color: colors.mutedForeground }]}>{match.format}</Text> : null}
        </View>
        <TeamColumn team={match.teamB} colors={colors} />
      </View>
      {details && updatedAt ? <Text style={[styles.updated, { color: colors.mutedForeground }]}>Atualizado às {new Date(updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</Text> : null}
    </View>
    {tabs.length > 1 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>{tabs.map(item => <Pressable key={item.key} accessibilityRole="tab" aria-selected={tab === item.key} onPress={() => setTab(item.key)} style={[styles.tab, { borderBottomColor: tab === item.key ? colors.foreground : "transparent" }]}><Text style={[styles.tabText, { color: tab === item.key ? colors.foreground : colors.mutedForeground }]}>{item.label}</Text></Pressable>)}</ScrollView> : null}
    <Pressable disabled={!match.competitionId || match.competitionId.startsWith("unknown:")} onPress={() => match.competitionId && openCompetition(match.competitionId)} style={[styles.competitionRow, { backgroundColor: colors.card }]}>
      <ResolvedLogo type="competition" name={match.tournament} entityId={match.competitionId} logoUrl={match.competitionLogoUrl} size={34} />
      <Text style={[styles.competitionCopy, { color: colors.foreground }]}>{match.tournament}<Text style={{ color: colors.mutedForeground }}>{"\n"}{[match.format, match.startTime ? new Date(match.startTime).toLocaleString("pt-BR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Data a definir"].filter(Boolean).join(" · ")}</Text></Text>
      <Feather name="chevron-right" size={22} color={colors.primary} />
    </Pressable>
    {details ? <>{tab === "Overview" ? <Overview details={details} colors={colors} /> : <H2H details={details} colors={colors} />}</> : detailsLoading ? <DetailSkeleton colors={colors} /> : <View style={styles.errorBox}><Text style={[styles.message, { color: colors.mutedForeground }]}>{detailsError ?? "Não foi possível carregar os detalhes."}</Text><Pressable onPress={onRetry}><Text style={[styles.retry, { color: colors.primary }]}>Tentar novamente</Text></Pressable></View>}
  </>;
}
function Overview({ details, colors }: { details: MatchDetails; colors: ReturnType<typeof useColors> }) {
  const match = details.match;
  return <View>
    {match.status !== "Finished" && match.status !== "Cancelled" && (match.streams?.length || officialStreams(match.tournament).length) ? <WatchOptions streams={match.streams?.length ? match.streams : officialStreams(match.tournament)} /> : null}
    <MatchTimeline match={match} hidden={useSpoilers().isHidden(match.id)} />
    <WinProbability match={match} />
    {details.maps.some(map => map.mapName) ? <SectionTitle title="Mapas" colors={colors} /> : null}
    {!details.maps.some(map => map.mapName) ? null : <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>{details.maps.filter((map) => map.mapName).map((map, index, named) => <InfoRow key={map.id} last={index === named.length - 1} label={map.mapName ?? `Mapa ${map.mapNumber}`} value={typeof map.homeScore === "number" && typeof map.awayScore === "number" ? `${map.homeScore}–${map.awayScore}` : "A definir"} colors={colors} />)}</View>}
    <RecentMatches details={details} colors={colors} />
  </View>;
}

function H2H({ details, colors }: { details: MatchDetails; colors: ReturnType<typeof useColors> }) {
  return <View><SectionTitle title="Confrontos anteriores" colors={colors} />{details.headToHead.length === 0 ? <Unavailable text="Ainda não há confrontos anteriores disponíveis." colors={colors} /> : <CompetitionGroups matches={details.headToHead.slice(0, 5)} />}</View>;
}

function RecentMatches({ details }: { details: MatchDetails; colors: ReturnType<typeof useColors> }) {
  const matchesByTeam = Object.fromEntries(details.recentMatches.map((group) => [group.teamId, group.matches]));
  return <RecentByTeam teams={[details.match.teamA, details.match.teamB]} matchesByTeam={matchesByTeam} />;
}

// A followed team's win is celebrated once per match; a live score change gives a tap.
const celebrated = new Set<string>();
function useCelebration(match: Match, visible: boolean) {
  const { favoriteTeams } = useApp();
  const [party, setParty] = useState(false);
  const winner = match.status === "Finished" && visible && hasScore(match) && match.scoreA !== match.scoreB ? ((match.scoreA ?? 0) > (match.scoreB ?? 0) ? match.teamA.id : match.teamB.id) : null;
  const won = !!winner && favoriteTeams.includes(winner);
  useEffect(() => { if (won && !celebrated.has(match.id)) { celebrated.add(match.id); buzz(true); setParty(true); } }, [won, match.id]);
  const score = `${match.scoreA}-${match.scoreB}`;
  const last = useRef(score);
  useEffect(() => { if (last.current !== score && match.status === "Live") buzz(true); last.current = score; }, [score, match.status]);
  return party;
}

function TeamColumn({ team, colors }: { team: Match["teamA"]; colors: ReturnType<typeof useColors> }) { return <TeamLink team={team} fill><View style={styles.teamColumn}><TeamBadge {...team} size={62} /><Text numberOfLines={2} style={[styles.teamName, { color: colors.foreground }]}>{team.name}</Text></View></TeamLink>; }
function SectionTitle({ title, colors }: { title: string; colors: ReturnType<typeof useColors> }) { return <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text>; }
function InfoRow({ label, value, colors, last = false }: { label: string; value: string; colors: ReturnType<typeof useColors>; last?: boolean }) { return <View style={[styles.infoRow, last && styles.infoRowLast, { borderBottomColor: colors.border }]}><Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text><Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text></View>; }
function Unavailable({ text, colors }: { text: string; colors: ReturnType<typeof useColors> }) { return <View style={[styles.unavailable, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.unavailableTitle, { color: colors.mutedForeground }]}>Dados indisponíveis</Text><Text style={[styles.unavailableText, { color: colors.mutedForeground }]}>{text}</Text></View>; }
function DetailSkeleton({ colors }: { colors: ReturnType<typeof useColors> }) {
  return <Pulse label="Carregando partida"><View style={[styles.skeleton, { backgroundColor: colors.card }]} /><View style={[styles.skeletonWide, { backgroundColor: colors.card }]} /><View style={[styles.skeleton, { backgroundColor: colors.card }]} /></Pulse>;
}

const styles = StyleSheet.create({
 reveal: { marginTop: 6, minHeight: 36, borderRadius: 18, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 6 }, revealText: { fontSize: 13, fontWeight: "700" },
 hero: { marginHorizontal: -8, paddingHorizontal: 20, paddingBottom: 22 }, heroActions: { flexDirection: "row", justifyContent: "flex-end", gap: 6 }, competitionRow: { borderRadius: 16, flexDirection: "row", alignItems: "center", gap: 12, padding: 16, marginTop: 10 }, competitionCopy: { flex: 1, fontSize: 13, lineHeight: 20 },
  screen: { flex: 1, paddingHorizontal: 8 }, nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }, 
  teams: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginTop: 10, gap: 8 }, teamColumn: { alignItems: "center", flex: 1, minWidth: 0, gap: 9 }, teamName: { fontSize: 14, fontWeight: "700", textAlign: "center" }, scoreBlock: { alignItems: "center", minWidth: 88, flexShrink: 0 }, scoreRow: { flexDirection: "row", alignItems: "center" }, status: { fontSize: 11, fontWeight: "800", letterSpacing: 1 }, score: { fontSize: 26, fontWeight: "700", fontVariant: ["tabular-nums"], marginTop: 4 }, format: { fontSize: 11, fontWeight: "700", marginTop: 4 }, updated: { fontSize: 11, textAlign: "center", marginTop: 14 }, tabs: { flexDirection: "row", marginTop: 0 }, tab: { paddingVertical: 12, paddingHorizontal: 18, borderBottomWidth: 2, borderBottomColor: "transparent" }, tabText: { fontSize: 14, fontWeight: "600" }, sectionTitle: { fontSize: 15, fontWeight: "600", marginTop: 24, marginBottom: 9 }, panel: { borderWidth: 0, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 6 }, infoRow: { minHeight: 44, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, infoRowLast: { borderBottomWidth: 0 }, infoLabel: { fontSize: 12 }, infoValue: { fontSize: 12, fontWeight: "700", maxWidth: "60%", textAlign: "right" }, unavailable: { borderWidth: 0, borderRadius: 22, padding: 15 }, unavailableTitle: { fontSize: 12, fontWeight: "800" }, unavailableText: { fontSize: 12, lineHeight: 18, marginTop: 5 }, message: { fontSize: 14, textAlign: "center", marginTop: 40 }, errorBox: { alignItems: "center" }, retry: { fontSize: 13, fontWeight: "600", marginTop: 10 }, skeleton: { height: 145, borderRadius: 22, marginTop: 12 }, skeletonWide: { height: 52, borderRadius: 18, marginTop: 12 }
});
