import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "@/components/Avatar";
import { ListSkeleton, MobileHeader, ScreenTabs } from "@/components/MobileChrome";
import { Appear, buzz, Confetti, Pop, RollingNumber, Tap } from "@/components/Motion";
import { ResolvedLogo } from "@/components/ResolvedLogo";
import { font } from "@/constants/type";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import type { Match } from "@/lib/data";
import { listTeamLabel } from "@/lib/matches";
import { openMatch } from "@/lib/navigation";
import { currentStreak, EXACT_BONUS, fetchLeague, fetchMyPicks, fetchOpenMatches, fetchSplit, grade, HIT_POINTS, type Graded, type LeagueRow, isValidScore, savePick, winsNeeded } from "@/lib/picks";

type Tab = "play" | "league";
type Choice = { teamId: string; homeScore: number | null; awayScore: number | null };
type Rank = { id: string; name: string; avatar: string | null; points: number; me?: boolean };
const percent = (value: number) => `${Math.round(value * 100)}%`;
const dayLabel = (match: Match) => {
  const start = new Date(match.scheduledTime ?? match.startTime ?? "");
  const days = Math.round((new Date(start).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86_400_000);
  return days === 0 ? "Hoje" : days === 1 ? "Amanhã" : start.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short" }).replace(/^./, c => c.toUpperCase());
};

// Until the league has real players, an example shows how it will look: a friend ahead of you, and the top of Brazil.
const exampleFriends: Rank[] = [
  { id: "jett", name: "Jett", avatar: "agent-jett", points: 340 },
  { id: "me", name: "Você", avatar: null, points: 310, me: true },
  { id: "sage", name: "Sage", avatar: "agent-sage", points: 280 },
  { id: "phoenix", name: "Phoenix", avatar: "agent-phoenix", points: 210 },
  { id: "omen", name: "Omen", avatar: "agent-omen", points: 150 },
];
const exampleBrazil: Rank[] = [
  { id: "reyna", name: "Reyna", avatar: "agent-reyna", points: 520 },
  { id: "raze", name: "Raze", avatar: "agent-raze", points: 495 },
  { id: "killjoy", name: "Killjoy", avatar: "agent-killjoy", points: 470 },
  { id: "sova", name: "Sova", avatar: "agent-sova", points: 455 },
  { id: "viper", name: "Viper", avatar: "agent-viper", points: 430 },
];

// Fan picks, like a bolão: set the score of each match, see how the crowd split, collect points and a streak, climb the week's league.
export default function Picks() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { session, profile } = useAuth();
  const me = session?.user.id;
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("play");
  const [guide, setGuide] = useState(false);
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
  const choose = (matchId: string, choice: Choice) => { setChoices(current => ({ ...current, [matchId]: choice })); save.mutate({ matchId, choice }); };

  // The guide opens by itself the first time.
  useEffect(() => {
    AsyncStorage.getItem("vant:picks-guide").then(seen => { if (!seen) setGuide(true); }).catch(() => undefined);
  }, []);
  const closeGuide = () => { setGuide(false); void AsyncStorage.setItem("vant:picks-guide", "1").catch(() => undefined); };

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
  const myName = profile?.display_name || "Você";
  const real = (league.data ?? []).map((row: LeagueRow): Rank => ({ id: row.userId, name: row.userId === me ? "Você" : row.name, avatar: row.avatar, points: row.points, me: row.userId === me }));
  const example = real.length < 3;

  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <MobileHeader><ScreenTabs items={[{ key: "play", label: "Palpitar" }, { key: "league", label: "Liga" }]} selected={tab} onChange={setTab} /></MobileHeader>
    <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 110 + insets.bottom }}>
      <View style={[styles.hero, { backgroundColor: colors.card }]}>
        <Stat icon="🔥" value={String(streak)} label={"acertos\nseguidos"} />
        <Stat icon="⭐" value={String(points)} label={"pontos\nsomados"} />
        <Stat icon="🏆" value={rank >= 0 ? `${rank + 1}º` : "–"} label={"sua posição\nna liga"} />
      </View>
      <Tap accessibilityRole="button" onPress={() => { buzz(); setGuide(true); }} style={[styles.howButton, { backgroundColor: colors.card }]}>
        <Feather name="help-circle" size={20} color={colors.primary} />
        <Text style={[styles.howText, { color: colors.foreground }]}>Como funcionam os palpites?</Text>
        <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
      </Tap>

      {tab === "play" ? <>
        {open.isLoading ? <ListSkeleton /> : !open.data?.length ? <Empty text="Nenhuma partida aberta agora. Volte mais tarde!" /> : [...groups.entries()].map(([day, rows]) => <View key={day}>
          <Text style={[styles.day, { color: colors.foreground }]}>{day}</Text>
          {rows!.map((row, index) => <Appear key={row.match.id} index={index}><PickCard match={row.match} homeChance={row.homeChance} saved={picked[row.match.id]} split={split.data?.[row.match.id]} onConfirm={choice => choose(row.match.id, choice)} /></Appear>)}
        </View>)}
      </> : null}

      {tab === "league" ? <>
        {league.isLoading ? <ListSkeleton /> : example ? <>
          <Ranking title="Você e seus amigos" rows={exampleFriends.map(row => row.me ? { ...row, name: myName, avatar: profile?.avatar ?? null } : row)} />
          <Ranking title="Top Brasil" rows={exampleBrazil} />
        </> : <Ranking title="Liga da semana" rows={real} />}
        <Text style={[styles.reset, { color: colors.mutedForeground }]}>A liga recomeça toda segunda-feira.</Text>
      </> : null}
    </ScrollView>
    {guide ? <Guide onClose={closeGuide} /> : null}
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

// A ranking card; under your row, how many points you need to pass the one ahead.
function Ranking({ title, rows }: { title: string; rows: Rank[] }) {
  const colors = useColors();
  return <View style={[styles.rankCard, { backgroundColor: colors.card }]}>
    <Text style={[styles.rankTitle, { color: colors.foreground }]}>{title}</Text>
    {rows.map((row, index) => {
      const ahead = rows[index - 1];
      return <Appear key={row.id} index={index}><View style={[styles.rankRow, row.me && { backgroundColor: colors.accent }]}>
        <Text style={[styles.place, { color: colors.mutedForeground }]}>{["🥇", "🥈", "🥉"][index] ?? `${index + 1}º`}</Text>
        <Avatar id={row.avatar} name={row.name} size={44} />
        <View style={styles.rankCopy}>
          <Text numberOfLines={1} style={[styles.rankName, { color: colors.foreground }]}>{row.me ? `${row.name} (você)` : row.name}</Text>
          {row.me && ahead ? <Text style={[styles.rankHint, { color: colors.primary }]}>Faltam {ahead.points - row.points + 1} pontos para passar {ahead.name}</Text> : null}
        </View>
        <Text style={[styles.rankPoints, { color: row.me ? colors.primary : colors.foreground }]}>{row.points}</Text>
      </View></Appear>;
    })}
  </View>;
}

// One match as a bolão card: set each team's maps with − and +, confirm, then see how the crowd split.
function PickCard({ match, homeChance, saved, split, onConfirm }: { match: Match; homeChance: number | null; saved?: Choice; split?: Record<string, number>; onConfirm: (choice: Choice) => void }) {
  const colors = useColors();
  const start = new Date(match.scheduledTime ?? match.startTime ?? "");
  const need = winsNeeded(match.format);
  const hasSaved = saved?.homeScore != null && saved.awayScore != null;
  const [draft, setDraft] = useState<[number, number]>(hasSaved ? [saved!.homeScore!, saved!.awayScore!] : saved ? (saved.teamId === match.teamA.id ? [need, 0] : [0, need]) : [0, 0]);
  const [editing, setEditing] = useState(!hasSaved);
  useEffect(() => { if (hasSaved) { setDraft([saved!.homeScore!, saved!.awayScore!]); setEditing(false); } }, [hasSaved, saved?.homeScore, saved?.awayScore]);
  const valid = isValidScore(match.format, draft[0], draft[1]);
  const set = (side: 0 | 1, value: number) => setDraft(current => {
    const next: [number, number] = [...current];
    next[side] = Math.max(0, Math.min(need, value));
    if (next[side] === need) next[side === 0 ? 1 : 0] = Math.min(next[side === 0 ? 1 : 0], need - 1);
    if (next[0] !== current[0] || next[1] !== current[1]) buzz();
    return next;
  });
  const winner = draft[0] > draft[1] ? match.teamA : match.teamB;
  const confirm = () => { buzz(true); onConfirm({ teamId: winner.id, homeScore: draft[0], awayScore: draft[1] }); setEditing(false); };
  const home = split?.[match.teamA.id] ?? 0;
  const away = split?.[match.teamB.id] ?? 0;
  const total = home + away;
  const crowdHome = total ? home / total : 0.5;
  const team = (side: 0 | 1) => {
    const info = side === 0 ? match.teamA : match.teamB;
    const chance = homeChance === null ? null : side === 0 ? homeChance : 1 - homeChance;
    return <View style={styles.side}>
      <Tap accessibilityRole="button" accessibilityLabel={`${info.name} vence`} disabled={!editing} onPress={() => set(side, need)} style={styles.sideTeam}>
        <ResolvedLogo type="team" name={info.name} entityId={info.id} logoUrl={info.logoUrl} size={52} />
        <Text numberOfLines={1} style={[styles.teamName, { color: colors.foreground }]}>{listTeamLabel(info, 12)}</Text>
        {chance !== null ? <Text style={[styles.chance, { color: colors.mutedForeground }]}>Chance {percent(chance)}</Text> : null}
      </Tap>
      {editing ? <View style={[styles.stepper, { backgroundColor: colors.secondary }]}>
        <Tap accessibilityRole="button" accessibilityLabel={`Menos um mapa para ${info.name}`} disabled={draft[side] === 0} onPress={() => set(side, draft[side] - 1)} style={styles.stepButton}><Feather name="minus" size={22} color={draft[side] === 0 ? colors.border : colors.foreground} /></Tap>
        <RollingNumber value={draft[side]} style={[styles.stepValue, { color: colors.foreground }]} />
        <Tap accessibilityRole="button" accessibilityLabel={`Mais um mapa para ${info.name}`} disabled={draft[side] === need} onPress={() => set(side, draft[side] + 1)} style={styles.stepButton}><Feather name="plus" size={22} color={draft[side] === need ? colors.border : colors.foreground} /></Tap>
      </View> : <Text style={[styles.finalScore, { color: draft[side] === need ? colors.primary : colors.mutedForeground }]}>{draft[side]}</Text>}
    </View>;
  };
  return <View style={[styles.card, { backgroundColor: colors.card, borderColor: editing ? "transparent" : colors.primary }]}>
    <Tap onPress={() => openMatch(match.id, match)} accessibilityRole="link" style={styles.cardTop}>
      <Text numberOfLines={1} style={[styles.competition, { color: colors.mutedForeground }]}>{match.competitionName ?? match.tournament}</Text>
      <Text style={[styles.time, { color: colors.foreground }]}>{Number.isFinite(start.getTime()) ? start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}{match.format ? ` · ${match.format}` : ""}</Text>
    </Tap>
    <View style={styles.teams}>{team(0)}<Text style={[styles.vs, { color: colors.mutedForeground }]}>x</Text>{team(1)}</View>
    {editing ? <Tap accessibilityRole="button" disabled={!valid} onPress={confirm} style={[styles.confirm, { backgroundColor: valid ? colors.primary : colors.secondary }]}>
      <Text style={[styles.confirmText, { color: valid ? colors.primaryForeground : colors.mutedForeground }]}>{valid ? `Confirmar ${listTeamLabel(winner, 12)} ${draft[0]} x ${draft[1]}` : `Quem vence faz ${need} ${need === 1 ? "mapa" : "mapas"}`}</Text>
    </Tap> : <Animated.View entering={FadeIn.duration(260)} style={styles.done}>
      <View style={styles.doneRow}>
        <Pop active={!editing} color={colors.primary}><Feather name="check-circle" size={20} color={colors.primary} /></Pop>
        <Text style={[styles.doneText, { color: colors.foreground }]}>Palpite feito</Text>
        <Tap accessibilityRole="button" onPress={() => { buzz(); setEditing(true); }} style={[styles.change, { backgroundColor: colors.secondary }]}><Text style={[styles.changeText, { color: colors.foreground }]}>Mudar</Text></Tap>
      </View>
      <Bar value={crowdHome} />
      <Text style={[styles.crowd, { color: colors.mutedForeground }]}>{total ? `${percent(crowdHome >= 0.5 ? crowdHome : 1 - crowdHome)} da galera acha que ${crowdHome >= 0.5 ? listTeamLabel(match.teamA, 14) : listTeamLabel(match.teamB, 14)} vence` : "Você foi o primeiro a palpitar!"}</Text>
    </Animated.View>}
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

// How it works: one idea per page, a big picture and one line, like a quick tutorial.
const steps = [
  { icon: "✍️", title: "Monte o placar de cada jogo", points: "Use o – e o +" },
  { icon: "✅", title: "Acertou quem vence", points: `+${HIT_POINTS} pontos` },
  { icon: "🎯", title: "Cravou o placar", points: `+${HIT_POINTS + EXACT_BONUS} pontos` },
  { icon: "🏆", title: "Passe seus amigos na liga", points: "Toda semana" },
];
function Guide({ onClose }: { onClose: () => void }) {
  const colors = useColors();
  const [page, setPage] = useState(0);
  const step = steps[page];
  const last = page === steps.length - 1;
  return <Animated.View entering={FadeIn.duration(200)} style={[StyleSheet.absoluteFill, styles.overlay]}>
    <Appear style={[styles.sheet, styles.center, { backgroundColor: colors.card }]}>
      <Animated.View key={page} entering={FadeIn.duration(250)} style={styles.center}>
        <Text style={styles.bigEmoji}>{step.icon}</Text>
        <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{step.title}</Text>
        <Text style={[styles.sheetPoints, { color: colors.primary }]}>{step.points}</Text>
      </Animated.View>
      <View style={styles.dots}>{steps.map((_, index) => <View key={index} style={[styles.dot, { width: index === page ? 22 : 8, backgroundColor: index === page ? colors.primary : colors.secondary }]} />)}</View>
      <Tap accessibilityRole="button" onPress={() => { buzz(); if (last) onClose(); else setPage(page + 1); }} style={[styles.sheetButton, { backgroundColor: colors.primary }]}>
        <Text style={[styles.sheetButtonText, { color: colors.primaryForeground }]}>{last ? "Bora palpitar!" : "Próximo"}</Text>
      </Tap>
    </Appear>
  </Animated.View>;
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
    <Appear style={[styles.sheet, styles.center, { backgroundColor: colors.card }]}>
      <Text style={styles.bigEmoji}>{exact ? "🎯" : "🔥"}</Text>
      <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{wins.length > 1 ? `Você acertou ${wins.length}!` : "Você acertou!"}</Text>
      <Text style={[styles.sheetPoints, { color: colors.primary }]}>+{shown} pontos</Text>
      {streak >= 2 ? <Text style={[styles.sheetStreak, { color: colors.mutedForeground }]}>🔥 {streak} acertos seguidos</Text> : null}
      <Tap accessibilityRole="button" onPress={onClose} style={[styles.sheetButton, { backgroundColor: colors.primary }]}>
        <Text style={[styles.sheetButtonText, { color: colors.primaryForeground }]}>Continuar</Text>
      </Tap>
    </Appear>
  </Animated.View>;
}

const styles = StyleSheet.create({
  hero: { flexDirection: "row", borderRadius: 24, paddingVertical: 18, marginBottom: 10 },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statIcon: { fontSize: 26 },
  statValue: { fontSize: 30, fontFamily: font.bold, fontVariant: ["tabular-nums"] },
  statLabel: { fontSize: 13, lineHeight: 17, textAlign: "center" },
  howButton: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 54, borderRadius: 18, paddingHorizontal: 16, marginBottom: 12 },
  howText: { flex: 1, fontSize: 16, fontFamily: font.semibold },
  day: { fontSize: 18, fontFamily: font.bold, marginTop: 18, marginBottom: 10 },
  card: { borderRadius: 24, borderWidth: 1.5, padding: 16, marginBottom: 12, gap: 14 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  competition: { flex: 1, fontSize: 14, fontFamily: font.semibold },
  time: { fontSize: 15, fontFamily: font.bold, fontVariant: ["tabular-nums"] },
  teams: { flexDirection: "row", alignItems: "center", gap: 6 },
  side: { flex: 1, minWidth: 0, alignItems: "center", gap: 10 },
  sideTeam: { alignSelf: "stretch", alignItems: "center", gap: 6 },
  stepper: { flexDirection: "row", alignItems: "center", borderRadius: 26, padding: 4 },
  stepButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  stepValue: { width: 40, fontSize: 28, fontFamily: font.bold, textAlign: "center", fontVariant: ["tabular-nums"] },
  finalScore: { fontSize: 40, fontFamily: font.bold, fontVariant: ["tabular-nums"] },
  confirm: { height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  confirmText: { fontSize: 16, fontFamily: font.bold },
  done: { gap: 10 },
  doneRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  doneText: { flex: 1, fontSize: 16, fontFamily: font.bold },
  change: { paddingHorizontal: 16, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  changeText: { fontSize: 14, fontFamily: font.semibold },
  teamName: { fontSize: 17, fontFamily: font.bold },
  chance: { fontSize: 13, fontFamily: font.medium },
  vs: { fontSize: 18, fontFamily: font.bold, marginTop: 70 },
  bar: { height: 10, borderRadius: 5, overflow: "hidden" },
  barFill: { height: 10, borderRadius: 5 },
  crowd: { fontSize: 14, fontFamily: font.medium, textAlign: "center" },
  empty: { fontSize: 16, textAlign: "center", paddingVertical: 32, paddingHorizontal: 24 },
  rankCard: { borderRadius: 24, padding: 12, marginBottom: 12 },
  rankTitle: { fontSize: 18, fontFamily: font.bold, paddingHorizontal: 6, paddingTop: 4, paddingBottom: 8 },
  rankRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64, borderRadius: 18, paddingHorizontal: 8 },
  place: { width: 34, fontSize: 20, fontFamily: font.bold, textAlign: "center" },
  rankCopy: { flex: 1, minWidth: 0 },
  rankName: { fontSize: 16, fontFamily: font.semibold },
  rankHint: { fontSize: 13, fontFamily: font.medium, marginTop: 2 },
  rankPoints: { fontSize: 18, fontFamily: font.bold, fontVariant: ["tabular-nums"] },
  reset: { fontSize: 14, textAlign: "center", marginTop: 4 },
  overlay: { backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 20 },
  sheet: { width: "100%", maxWidth: 380, borderRadius: 28, padding: 24, gap: 14 },
  center: { alignItems: "center", gap: 6 },
  bigEmoji: { fontSize: 72 },
  dots: { flexDirection: "row", gap: 6, marginTop: 10 },
  dot: { height: 8, borderRadius: 4 },
  sheetTitle: { fontSize: 24, fontFamily: font.bold, textAlign: "center" },
  sheetPoints: { fontSize: 22, fontFamily: font.bold, fontVariant: ["tabular-nums"] },
  sheetStreak: { fontSize: 16 },
  sheetButton: { alignSelf: "stretch", height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", marginTop: 8 },
  sheetButtonText: { fontSize: 17, fontFamily: font.bold },
});
