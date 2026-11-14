import { StyleSheet, Text, View } from "react-native";
import { ResolvedLogo } from "@/components/ResolvedLogo";
import { font } from "@/constants/type";
import { useColors } from "@/hooks/useColors";
import type { Match } from "@/lib/data";
import { listTeamLabel } from "@/lib/matches";

// The series map by map: who took each map, when it started and how long it lasted, the one in play marked live.
// Map names and round scores come from VLR.gg when the match is found there; otherwise the line says what is known.
export function MatchTimeline({ match }: { match: Match }) {
  const colors = useColors();
  const games = match.games ?? [];
  if (!games.length) return null;
  const total = match.format ? Number(match.format.slice(2)) : games.length;
  const slots = Array.from({ length: Math.max(total, games.length) }, (_, index) => games.find((game) => game.number === index + 1) ?? { number: index + 1, status: "scheduled" as const });
  const running = { [match.teamA.id]: 0, [match.teamB.id]: 0 };
  return <View>
    <Text style={[styles.title, { color: colors.mutedForeground }]}>Linha do tempo</Text>
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      {slots.map((game, index) => {
        const winner = "winnerId" in game && game.winnerId ? (game.winnerId === match.teamA.id ? match.teamA : game.winnerId === match.teamB.id ? match.teamB : null) : null;
        if (winner) running[winner.id] += 1;
        const live = game.status === "live";
        const done = game.status === "finished";
        const last = index === slots.length - 1;
        // A map that was never needed (2-0 in a BO3) is shown as not played.
        const skipped = !done && !live && match.status === "Finished";
        return <View key={game.number} style={styles.row}>
          <View style={styles.rail}>
            <View style={[styles.dot, { backgroundColor: live ? colors.live : done ? colors.primary : colors.secondary, borderColor: live ? `${colors.live}55` : "transparent" }]} />
            {!last ? <View style={[styles.line, { backgroundColor: done ? colors.primary : colors.secondary }]} /> : null}
          </View>
          <View style={styles.body}>
            <View style={styles.mapLine}>
              <Text style={[styles.mapName, { color: skipped ? colors.mutedForeground : colors.foreground }]}>Mapa {game.number}{"mapName" in game && game.mapName ? ` · ${game.mapName}` : ""}</Text>
              {"homeRounds" in game && typeof game.homeRounds === "number" && typeof game.awayRounds === "number" ? <Text style={[styles.rounds, { color: colors.foreground }]}>{game.homeRounds}–{game.awayRounds}</Text> : null}
            </View>
            {winner ? <View style={styles.winner}>
              <ResolvedLogo type="team" name={winner.name} entityId={winner.id} logoUrl={winner.logoUrl} size={20} />
              <Text style={[styles.detail, { color: colors.foreground }]}>{listTeamLabel(winner, 16)} venceu</Text>
              <Text style={[styles.series, { color: colors.mutedForeground }]}>· série {running[match.teamA.id]}–{running[match.teamB.id]}</Text>
            </View> : <Text style={[styles.detail, { color: live ? colors.live : colors.mutedForeground }]}>{live ? "Em andamento" : skipped ? "Não foi necessário" : "A jogar"}</Text>}
            {"startTime" in game && game.startTime ? <Text style={[styles.meta, { color: colors.mutedForeground }]}>{new Date(game.startTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}{"minutes" in game && game.minutes && done ? ` · ${game.minutes} min` : ""}</Text> : null}
          </View>
        </View>;
      })}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  title: { fontSize: 15, fontFamily: font.semibold, marginTop: 24, marginBottom: 9 },
  card: { borderRadius: 22, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  row: { flexDirection: "row", gap: 12 },
  rail: { width: 14, alignItems: "center" },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 3 },
  line: { width: 2, flex: 1, marginVertical: 2 },
  body: { flex: 1, minWidth: 0, paddingBottom: 18, gap: 4 },
  mapLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  mapName: { flexShrink: 1, fontSize: 14, fontFamily: font.semibold },
  rounds: { fontSize: 15, fontFamily: font.bold, fontVariant: ["tabular-nums"] },
  winner: { flexDirection: "row", alignItems: "center", gap: 6 },
  detail: { fontSize: 13, fontFamily: font.medium },
  series: { fontSize: 12, fontFamily: font.medium },
  meta: { fontSize: 12, fontFamily: font.regular },
});
