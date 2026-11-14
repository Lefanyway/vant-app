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
import { Explainer } from "@/components/ModelExplainer";
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
        <Stat icon="🔥" value={String(streak)} label="sequência" />
        <Stat icon="⭐" value={String(points)} label="pontos" />
        <Stat icon="🏆" value={rank >= 0 ? `${rank + 1}º` : "–"} label="na liga" />
      </View>
      <Explainer title="Como funcionam os palpites" steps={howItWorks} />

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
        <Avatar id={row.avatar} name={row.name} size={32} />
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
        <ResolvedLogo type="team" name={info.name} entityId={info.id} logoUrl={info.logoUrl} size={40} />
        <Text numberOfLines={1} style={[styles.teamName, { color: colors.foreground }]}>{listTeamLabel(info, 12)}</Text>
        {chance !== null ? <Text style={[styles.chance, { color: colors.mutedForeground }]}>Chance {percent(chance)}</Text> : null}
      </Tap>
      {editing ? <View style={[styles.stepper, { backgroundColor: colors.secondary }]}>
        <Tap accessibilityRole="button" accessibilityLabel={`Menos um mapa para ${info.name}`} disabled={draft[side] === 0} onPress={() => set(side, draft[side] - 1)} style={styles.stepButton}><Feather name="minus" size={16} color={draft[side] === 0 ? colors.border : colors.foreground} /></Tap>
        <Text style={[styles.stepValue, { color: colors.foreground }]}>{draft[side]}</Text>
        <Tap accessibilityRole="button" accessibilityLabel={`Mais um mapa para ${info.name}`} disabled={draft[side] === need} onPress={() => set(side, draft[side] + 1)} style={styles.stepButton}><Feather name="plus" size={16} color={draft[side] === need ? colors.border : colors.foreground} /></Tap>
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
        <Pop active={!editing} color={colors.primary}><Feather name="check-circle" size={16} color={colors.primary} /></Pop>
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

// How it works, in the same collapsible card as Previsões.
const howItWorks = [
  { title: "1. Monte o placar", text: "Em cada jogo, use o – e o + para dizer quantos mapas cada time vence. Dá para mudar até o jogo começar." },
  { title: `2. Acertou quem vence: +${HIT_POINTS} pontos`, text: "Vale para o time que você colocou como vencedor." },
  { title: `3. Cravou o placar: +${HIT_POINTS + EXACT_BONUS} pontos`, text: "Placar exato da série, como 2 x 1." },
  { title: "4. Sequência e liga", text: "Acertos seguidos aumentam sua sequência. Some pontos e passe seus amigos na liga, que recomeça toda segunda." },
];

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

// Same measures as the rest of the app (cards like UpcomingCard, Sofascore-style): compact, quiet, minimal.
const styles = StyleSheet.create({
  hero: { flexDirection: "row", borderRadius: 18, paddingVertical: 12, marginBottom: 8 },
  stat: { flex: 1, alignItems: "center", gap: 1 },
  statIcon: { fontSize: 16 },
  statValue: { fontSize: 18, fontFamily: font.bold, fontVariant: ["tabular-nums"] },
  statLabel: { fontSize: 11, textAlign: "center" },
  day: { fontSize: 15, fontFamily: font.semibold, marginTop: 16, marginBottom: 9 },
  card: { borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 10, gap: 12 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  competition: { flex: 1, fontSize: 12, fontFamily: font.semibold },
  time: { fontSize: 13, fontFamily: font.semibold, fontVariant: ["tabular-nums"] },
  teams: { flexDirection: "row", alignItems: "center", gap: 6 },
  side: { flex: 1, minWidth: 0, alignItems: "center", gap: 8 },
  sideTeam: { alignSelf: "stretch", alignItems: "center", gap: 5 },
  stepper: { flexDirection: "row", alignItems: "center", borderRadius: 18, padding: 2 },
  stepButton: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  stepValue: { width: 28, fontSize: 17, fontFamily: font.bold, textAlign: "center", fontVariant: ["tabular-nums"] },
  finalScore: { fontSize: 22, fontFamily: font.bold, fontVariant: ["tabular-nums"] },
  confirm: { height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  confirmText: { fontSize: 13, fontFamily: font.semibold },
  done: { gap: 8 },
  doneRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  doneText: { flex: 1, fontSize: 13, fontFamily: font.semibold },
  change: { paddingHorizontal: 12, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  changeText: { fontSize: 12, fontFamily: font.semibold },
  teamName: { fontSize: 13, fontFamily: font.bold },
  chance: { fontSize: 11 },
  vs: { fontSize: 12, fontFamily: font.bold, marginTop: 52 },
  bar: { height: 6, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3 },
  crowd: { fontSize: 12, textAlign: "center" },
  empty: { fontSize: 14, textAlign: "center", paddingVertical: 32, paddingHorizontal: 24 },
  rankCard: { borderRadius: 18, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10 },
  rankTitle: { fontSize: 15, fontFamily: font.semibold, paddingHorizontal: 6, paddingTop: 4, paddingBottom: 4 },
  rankRow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 50, borderRadius: 12, paddingHorizontal: 6 },
  place: { width: 26, fontSize: 14, fontFamily: font.semibold, textAlign: "center" },
  rankCopy: { flex: 1, minWidth: 0 },
  rankName: { fontSize: 14, fontFamily: font.semibold },
  rankHint: { fontSize: 11, marginTop: 1 },
  rankPoints: { fontSize: 14, fontFamily: font.bold, fontVariant: ["tabular-nums"] },
  reset: { fontSize: 12, textAlign: "center", marginTop: 2 },
  overlay: { backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 24 },
  sheet: { width: "100%", maxWidth: 340, borderRadius: 22, padding: 20, gap: 12 },
  center: { alignItems: "center", gap: 4 },
  bigEmoji: { fontSize: 40, marginBottom: 4 },
  sheetTitle: { fontSize: 18, fontFamily: font.bold, textAlign: "center" },
  sheetPoints: { fontSize: 14, fontFamily: font.semibold, fontVariant: ["tabular-nums"] },
  sheetStreak: { fontSize: 13 },
  sheetButton: { alignSelf: "stretch", height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginTop: 6 },
  sheetButtonText: { fontSize: 14, fontFamily: font.semibold },
});
