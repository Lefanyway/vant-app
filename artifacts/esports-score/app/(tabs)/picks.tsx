import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "@/components/Avatar";
import { ListSkeleton, MobileHeader, ScreenTabs } from "@/components/MobileChrome";
import { Appear, buzz, Confetti, Pop, Tap } from "@/components/Motion";
import { ResolvedLogo } from "@/components/ResolvedLogo";
import { font } from "@/constants/type";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import type { Match } from "@/lib/data";
import { listTeamLabel } from "@/lib/matches";
import { openMatch } from "@/lib/navigation";
import { currentStreak, EXACT_BONUS, fetchLeague, fetchMyPicks, fetchOpenMatches, fetchSplit, grade, type Graded, type PickMode, savePick, scoreOptions } from "@/lib/picks";

type Tab = "play" | "mine" | "league";
type Choice = { teamId: string; homeScore: number | null; awayScore: number | null };
const percent = (value: number) => `${Math.round(value * 100)}%`;
const dayLabel = (match: Match) => {
  const start = new Date(match.scheduledTime ?? match.startTime ?? "");
  const days = Math.round((new Date(start).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86_400_000);
  return days === 0 ? "Hoje" : days === 1 ? "Amanhã" : start.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short" }).replace(/^./, c => c.toUpperCase());
};

// Fan picks: tap who wins (or the exact score), see how the crowd split, collect points and a streak, climb the week's league.
export default function Picks() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const me = useAuth().session?.user.id;
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("play");
  const [mode, setMode] = useState<PickMode>("winner");
  const open = useQuery({ queryKey: ["picks-open"], queryFn: fetchOpenMatches, staleTime: 5 * 60_000 });
  const mine = useQuery({ queryKey: ["picks-mine", me], queryFn: fetchMyPicks, enabled: !!me });
  const league = useQuery({ queryKey: ["picks-league"], queryFn: fetchLeague, staleTime: 5 * 60_000 });
  const ids = (open.data ?? []).map(row => row.match.id);
  const split = useQuery({ queryKey: ["picks-split", ids], queryFn: () => fetchSplit(ids), enabled: ids.length > 0 });
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const graded = useMemo(() => (mine.data ?? []).map(grade), [mine.data]);
  const saved = useMemo(() => Object.fromEntries(graded.map(p => [p.matchId, { teamId: p.teamId, homeScore: p.homeScore, awayScore: p.awayScore }])), [graded]);
  const picked = { ...saved, ...choices };
  const points = graded.reduce((sum, p) => sum + p.points, 0);
  const streak = currentStreak(graded);
  const rank = (league.data ?? []).findIndex(row => row.userId === me);

  const save = useMutation({
    mutationFn: ({ matchId, choice }: { matchId: string; choice: Choice }) => savePick(matchId, choice.teamId, choice.homeScore, choice.awayScore),
    onSettled: () => { void queryClient.invalidateQueries({ queryKey: ["picks-mine"] }); void queryClient.invalidateQueries({ queryKey: ["picks-split"] }); },
  });
  const choose = (matchId: string, choice: Choice) => { buzz(); setChoices(current => ({ ...current, [matchId]: choice })); save.mutate({ matchId, choice }); };

  // Results that came in since the last visit get a celebration, once.
  const [party, setParty] = useState<Graded[] | null>(null);
  const seenKey = `vant:picks-seen:${me}`;
  useEffect(() => {
    if (!me || !mine.data) return;
    AsyncStorage.getItem(seenKey).then(raw => {
      const seen = new Set<string>(raw ? JSON.parse(raw) : []);
      const fresh = graded.filter(p => p.state !== "open" && !seen.has(p.matchId));
      const wins = fresh.filter(p => p.points > 0);
      if (wins.length) { setParty(wins); buzz(true); }
      else if (fresh.length) void AsyncStorage.setItem(seenKey, JSON.stringify([...seen, ...fresh.map(p => p.matchId)]));
    }).catch(() => undefined);
  }, [me, mine.data]);
  const closeParty = () => {
    setParty(null);
    void AsyncStorage.setItem(seenKey, JSON.stringify(graded.filter(p => p.state !== "open").map(p => p.matchId))).catch(() => undefined);
  };

  const groups = new Map<string, typeof open.data>();
  for (const row of open.data ?? []) groups.set(dayLabel(row.match), [...(groups.get(dayLabel(row.match)) ?? []), row]);

  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <MobileHeader><ScreenTabs items={[{ key: "play", label: "Palpitar" }, { key: "mine", label: "Meus" }, { key: "league", label: "Liga" }]} selected={tab} onChange={setTab} /></MobileHeader>
    <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 110 + insets.bottom }}>
      <View style={[styles.hero, { backgroundColor: colors.card }]}>
        <Stat icon="🔥" value={String(streak)} label="sequência" />
        <Stat icon="⭐" value={String(points)} label="pontos" />
        <Stat icon="🏆" value={rank >= 0 ? `${rank + 1}º` : "–"} label="na semana" />
      </View>

      {tab === "play" ? <>
        <View style={[styles.modes, { backgroundColor: colors.card }]}>
          {([["winner", "Quem vence", "+10"], ["exact", "Placar exato", `+${10 + EXACT_BONUS}`]] as const).map(([key, label, reward]) => {
            const on = mode === key;
            return <Tap key={key} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => { buzz(); setMode(key); }} style={[styles.mode, on && { backgroundColor: colors.primary }]}>
              <Text style={[styles.modeText, { color: on ? colors.primaryForeground : colors.foreground }]}>{label}</Text>
              <Text style={[styles.modeReward, { color: on ? colors.primaryForeground : colors.mutedForeground }]}>{reward}</Text>
            </Tap>;
          })}
        </View>
        {open.isLoading ? <ListSkeleton /> : !open.data?.length ? <Empty text="Nenhuma partida aberta agora. Volte mais tarde!" /> : [...groups.entries()].map(([day, rows]) => <View key={day}>
          <Text style={[styles.day, { color: colors.mutedForeground }]}>{day}</Text>
          {rows!.map((row, index) => <Appear key={row.match.id} index={index}><PickCard match={row.match} homeChance={row.homeChance} mode={mode} choice={picked[row.match.id]} split={split.data?.[row.match.id]} onChoose={choice => choose(row.match.id, choice)} /></Appear>)}
        </View>)}
      </> : null}

      {tab === "mine" ? (mine.isLoading ? <ListSkeleton /> : !graded.length ? <Empty text="Você ainda não palpitou. Toque em um time na aba Palpitar." /> : graded.map((pick, index) => <Appear key={pick.matchId} index={index}><MyPickRow pick={pick} /></Appear>)) : null}

      {tab === "league" ? <>
        <Text style={[styles.day, { color: colors.mutedForeground }]}>Liga da semana · zera toda segunda</Text>
        {league.isLoading ? <ListSkeleton /> : !league.data?.length ? <Empty text="A liga desta semana ainda está vazia. Seja o primeiro!" /> : <View style={[styles.card, { backgroundColor: colors.card }]}>
          {league.data.map((row, index) => <View key={row.userId} style={[styles.leagueRow, row.userId === me && { backgroundColor: colors.accent }]}>
            <Text style={[styles.place, { color: colors.mutedForeground }]}>{["🥇", "🥈", "🥉"][index] ?? `${index + 1}`}</Text>
            <Avatar id={row.avatar} name={row.name} size={34} />
            <Text numberOfLines={1} style={[styles.leagueName, { color: colors.foreground }]}>{row.userId === me ? "Você" : row.name}</Text>
            <Text style={[styles.leaguePoints, { color: colors.primary }]}>{row.points} pts</Text>
          </View>)}
        </View>}
      </> : null}
    </ScrollView>
    {party ? <Celebration wins={party} streak={streak} onClose={closeParty} /> : null}
  </View>;
}

function Stat({ icon, value, label }: { icon: string; value: string; label: string }) {
  const colors = useColors();
  return <View style={styles.stat}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
  </View>;
}

function Empty({ text }: { text: string }) {
  const colors = useColors();
  return <Text style={[styles.empty, { color: colors.mutedForeground }]}>{text}</Text>;
}

// One match: two big team buttons; after a tap the crowd split slides in, and in exact mode the possible scores appear.
function PickCard({ match, homeChance, mode, choice, split, onChoose }: { match: Match; homeChance: number | null; mode: PickMode; choice?: Choice; split?: Record<string, number>; onChoose: (choice: Choice) => void }) {
  const colors = useColors();
  const start = new Date(match.scheduledTime ?? match.startTime ?? "");
  const home = split?.[match.teamA.id] ?? 0;
  const away = split?.[match.teamB.id] ?? 0;
  const total = home + away;
  const crowdHome = total ? home / total : 0.5;
  const side = (team: Match["teamA"], isHome: boolean) => {
    const on = choice?.teamId === team.id;
    return <Tap accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`Palpite: ${team.name} vence`} onPress={() => onChoose({ teamId: team.id, homeScore: null, awayScore: null })} style={[styles.team, { backgroundColor: on ? colors.accent : colors.secondary, borderColor: on ? colors.primary : "transparent" }]}>
      <ResolvedLogo type="team" name={team.name} entityId={team.id} logoUrl={team.logoUrl} size={44} />
      <Text numberOfLines={1} style={[styles.teamName, { color: colors.foreground }]}>{listTeamLabel(team, 12)}</Text>
      {on ? <View style={[styles.check, { backgroundColor: colors.primary }]}><Pop active={on} color={colors.primary}><Feather name="check" size={12} color={colors.primaryForeground} /></Pop></View> : null}
      {homeChance !== null ? <Text style={[styles.chance, { color: colors.mutedForeground }]}>VANT {percent(isHome ? homeChance : 1 - homeChance)}</Text> : null}
    </Tap>;
  };
  return <View style={[styles.card, { backgroundColor: colors.card }]}>
    <Tap onPress={() => openMatch(match.id, match)} accessibilityRole="link" style={styles.cardTop}>
      <Text numberOfLines={1} style={[styles.competition, { color: colors.mutedForeground }]}>{match.competitionName ?? match.tournament}</Text>
      <Text style={[styles.time, { color: colors.foreground }]}>{Number.isFinite(start.getTime()) ? start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}{match.format ? ` · ${match.format}` : ""}</Text>
    </Tap>
    <View style={styles.teams}>{side(match.teamA, true)}<Text style={[styles.vs, { color: colors.mutedForeground }]}>vs</Text>{side(match.teamB, false)}</View>
    {choice && mode === "exact" ? <Animated.View entering={FadeIn.duration(220)} style={styles.scores}>
      {scoreOptions(match.format, choice.teamId === match.teamA.id).map(([a, b]) => {
        const on = choice.homeScore === a && choice.awayScore === b;
        return <Tap key={`${a}-${b}`} onPress={() => onChoose({ teamId: choice.teamId, homeScore: a, awayScore: b })} style={[styles.score, { backgroundColor: on ? colors.primary : colors.secondary }]}>
          <Text style={[styles.scoreText, { color: on ? colors.primaryForeground : colors.foreground }]}>{a} – {b}</Text>
        </Tap>;
      })}
    </Animated.View> : null}
    {choice ? <Animated.View entering={FadeIn.duration(260)}>
      <Bar value={crowdHome} />
      <Text style={[styles.crowd, { color: colors.mutedForeground }]}>{total ? `${percent(crowdHome >= 0.5 ? crowdHome : 1 - crowdHome)} da galera foi de ${crowdHome >= 0.5 ? listTeamLabel(match.teamA, 14) : listTeamLabel(match.teamB, 14)}` : "Você foi o primeiro a palpitar!"}</Text>
    </Animated.View> : null}
  </View>;
}

// The crowd split, filling from the left when it appears.
function Bar({ value }: { value: number }) {
  const colors = useColors();
  const width = useSharedValue(0.5);
  useEffect(() => { width.value = withTiming(value, { duration: 600 }); }, [value, width]);
  const fill = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));
  return <View style={[styles.bar, { backgroundColor: colors.secondary }]}><Animated.View style={[styles.barFill, { backgroundColor: colors.primary }, fill]} /></View>;
}

function MyPickRow({ pick }: { pick: Graded }) {
  const colors = useColors();
  const { match } = pick;
  const team = pick.teamId === match.teamA.id ? match.teamA : match.teamB;
  const badge = pick.state === "exact" ? { text: `+${pick.points} 🎯`, color: colors.primary } : pick.state === "hit" ? { text: `+${pick.points} ✓`, color: colors.primary } : pick.state === "miss" ? { text: "✗", color: colors.mutedForeground } : { text: match.status === "Live" ? "Ao vivo" : "Aguardando", color: match.status === "Live" ? colors.live : colors.mutedForeground };
  return <Tap onPress={() => openMatch(match.id, match)} style={[styles.myRow, { backgroundColor: colors.card }]}>
    <ResolvedLogo type="team" name={team.name} entityId={team.id} logoUrl={team.logoUrl} size={32} />
    <View style={styles.myCopy}>
      <Text numberOfLines={1} style={[styles.myTitle, { color: colors.foreground }]}>{listTeamLabel(match.teamA, 12)} {match.scoreA ?? ""} – {match.scoreB ?? ""} {listTeamLabel(match.teamB, 12)}</Text>
      <Text numberOfLines={1} style={[styles.myMeta, { color: colors.mutedForeground }]}>Você: {listTeamLabel(team, 14)}{pick.homeScore !== null ? ` (${pick.homeScore}–${pick.awayScore})` : ""}</Text>
    </View>
    <Text style={[styles.badge, { color: badge.color }]}>{badge.text}</Text>
  </Tap>;
}

// Shown when new results came in: confetti, the points counting up and the streak.
function Celebration({ wins, streak, onClose }: { wins: Graded[]; streak: number; onClose: () => void }) {
  const colors = useColors();
  const total = wins.reduce((sum, p) => sum + p.points, 0);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const step = Math.max(1, Math.ceil(total / 20));
    const timer = setInterval(() => setShown(value => { const next = Math.min(total, value + step); if (next === total) clearInterval(timer); return next; }), 35);
    return () => clearInterval(timer);
  }, [total]);
  const exact = wins.some(p => p.state === "exact");
  return <Animated.View entering={FadeIn.duration(200)} style={[StyleSheet.absoluteFill, styles.overlay]}>
    <Confetti />
    <Appear style={[styles.sheet, { backgroundColor: colors.card }]}>
      <Text style={styles.bigEmoji}>{exact ? "🎯" : "🔥"}</Text>
      <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{wins.length > 1 ? `Você acertou ${wins.length}!` : "Você acertou!"}</Text>
      <Text style={[styles.sheetPoints, { color: colors.primary }]}>+{shown} pontos</Text>
      {streak >= 2 ? <Text style={[styles.sheetStreak, { color: colors.mutedForeground }]}>🔥 Sequência de {streak}</Text> : null}
      <Tap accessibilityRole="button" onPress={onClose} style={[styles.sheetButton, { backgroundColor: colors.primary }]}>
        <Text style={[styles.sheetButtonText, { color: colors.primaryForeground }]}>Continuar</Text>
      </Tap>
    </Appear>
  </Animated.View>;
}

const styles = StyleSheet.create({
  hero: { flexDirection: "row", borderRadius: 22, paddingVertical: 14, marginBottom: 12 },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statIcon: { fontSize: 20 },
  statValue: { fontSize: 20, fontFamily: font.bold },
  statLabel: { fontSize: 11 },
  modes: { flexDirection: "row", borderRadius: 18, padding: 4, gap: 4, marginBottom: 6 },
  mode: { flex: 1, minHeight: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  modeText: { fontSize: 14, fontFamily: font.semibold },
  modeReward: { fontSize: 11, marginTop: 1 },
  day: { fontSize: 14, fontFamily: font.semibold, marginTop: 16, marginBottom: 8 },
  card: { borderRadius: 22, padding: 14, marginBottom: 10, gap: 12 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  competition: { flex: 1, fontSize: 12, fontFamily: font.semibold },
  time: { fontSize: 13, fontFamily: font.semibold, fontVariant: ["tabular-nums"] },
  teams: { flexDirection: "row", alignItems: "center", gap: 8 },
  team: { flex: 1, minWidth: 0, alignItems: "center", gap: 6, paddingVertical: 14, borderRadius: 18, borderWidth: 2 },
  teamName: { fontSize: 14, fontFamily: font.bold },
  chance: { fontSize: 11 },
  check: { position: "absolute", top: 8, right: 8, width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  vs: { fontSize: 12, fontFamily: font.bold },
  scores: { flexDirection: "row", gap: 8, justifyContent: "center" },
  score: { minWidth: 64, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  scoreText: { fontSize: 14, fontFamily: font.bold, fontVariant: ["tabular-nums"] },
  bar: { height: 8, borderRadius: 4, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 4 },
  crowd: { fontSize: 12, marginTop: 6, textAlign: "center" },
  empty: { fontSize: 14, textAlign: "center", paddingVertical: 32, paddingHorizontal: 24 },
  leagueRow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 50, borderRadius: 14, paddingHorizontal: 8 },
  place: { width: 26, fontSize: 15, fontFamily: font.bold, textAlign: "center" },
  leagueName: { flex: 1, fontSize: 14, fontFamily: font.semibold },
  leaguePoints: { fontSize: 14, fontFamily: font.bold },
  myRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, padding: 12, marginBottom: 8 },
  myCopy: { flex: 1, minWidth: 0 },
  myTitle: { fontSize: 14, fontFamily: font.semibold },
  myMeta: { fontSize: 12, marginTop: 3 },
  badge: { fontSize: 14, fontFamily: font.bold },
  overlay: { backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: 24 },
  sheet: { width: "100%", maxWidth: 360, borderRadius: 28, padding: 24, alignItems: "center", gap: 6 },
  bigEmoji: { fontSize: 64 },
  sheetTitle: { fontSize: 24, fontFamily: font.bold },
  sheetPoints: { fontSize: 20, fontFamily: font.bold, fontVariant: ["tabular-nums"] },
  sheetStreak: { fontSize: 14 },
  sheetButton: { alignSelf: "stretch", height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", marginTop: 14 },
  sheetButtonText: { fontSize: 16, fontFamily: font.bold },
});
