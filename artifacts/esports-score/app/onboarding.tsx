import { Feather, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ResolvedLogo } from "@/components/ResolvedLogo";
import { font } from "@/constants/type";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { ensurePermission } from "@/context/NotificationsContext";
import { useColors } from "@/hooks/useColors";
import { fetchCatalogPage, type ApiSearchResult } from "@/lib/api";
import { onboardingKey, popularCompetitions, popularTeams } from "@/lib/onboarding";

const mark = require("../assets/generated/games/valorant-mark.png");

const intro = [
  { icon: "play-circle" as const, title: "Partidas ao vivo e resultados", text: "Todos os jogos de Valorant do dia, de todas as ligas, em um só lugar." },
  { icon: "star" as const, title: "Siga seus times", text: "Escolha times e campeonatos e receba um aviso quando eles começam e terminam." },
  { icon: "bar-chart-2" as const, title: "Quem deve ganhar", text: "Antes de cada partida, a chance de vitória de cada time, com o porquê explicado." },
];

// First run: what VANT is, then the teams and competitions to follow, then alerts. Every step can be skipped.
export default function Onboarding() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const userId = useAuth().session?.user.id;
  const [step, setStep] = useState(0);
  // Both lists load while the welcome step is read, so the pick steps open already filled.
  const client = useQueryClient();
  useEffect(() => {
    void client.prefetchQuery({ queryKey: ["popular", "team"], queryFn: popularTeams, staleTime: 60 * 60_000 });
    void client.prefetchQuery({ queryKey: ["popular", "competition"], queryFn: popularCompetitions, staleTime: 60 * 60_000 });
  }, [client]);
  const finish = async () => {
    try { await AsyncStorage.setItem(onboardingKey(userId), "1"); } catch { /* shows again next time, harmless */ }
    router.replace("/");
  };
  const steps = [
    <Welcome key="welcome" />,
    <Pick key="teams" kind="team" title="Quais times você torce?" subtitle="Escolha quantos quiser. Você recebe aviso quando eles jogam." />,
    <Pick key="competitions" kind="competition" title="E quais campeonatos?" subtitle="Os jogos deles aparecem nos seus Favoritos." />,
    <Alerts key="alerts" />,
  ];
  const last = step === steps.length - 1;
  return <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
    <View style={styles.top}>
      <View style={styles.dots}>{steps.map((_, index) => <View key={index} style={[styles.dot, { width: index === step ? 22 : 8, backgroundColor: index <= step ? colors.primary : colors.secondary }]} />)}</View>
      {!last ? <Pressable accessibilityRole="button" onPress={() => void finish()} hitSlop={8}><Text style={[styles.skip, { color: colors.mutedForeground }]}>Pular</Text></Pressable> : null}
    </View>
    <View style={styles.body}>{steps[step]}</View>
    <View style={styles.footer}>
      {step > 0 ? <Pressable accessibilityRole="button" onPress={() => setStep(step - 1)} style={[styles.secondary, { backgroundColor: colors.card }]}><Feather name="arrow-left" size={20} color={colors.foreground} /></Pressable> : null}
      <Pressable accessibilityRole="button" onPress={() => last ? void finish() : setStep(step + 1)} style={[styles.primary, { backgroundColor: colors.primary }]}>
        <Text style={[styles.primaryText, { color: colors.primaryForeground }]}>{step === 0 ? "Começar" : last ? "Ir para o app" : "Continuar"}</Text>
      </Pressable>
    </View>
  </View>;
}

function Welcome() {
  const colors = useColors();
  return <View style={styles.welcome}>
    <Image source={mark} resizeMode="contain" accessibilityLabel="VANT" style={styles.mark} />
    <Text style={[styles.title, { color: colors.foreground }]}>Bem-vindo ao VANT</Text>
    <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>O cenário competitivo de Valorant na palma da mão, mesmo para quem está começando a acompanhar.</Text>
    <View style={styles.features}>
      {intro.map((item) => <View key={item.title} style={[styles.feature, { backgroundColor: colors.card }]}>
        <View style={[styles.featureIcon, { backgroundColor: colors.accent }]}><Feather name={item.icon} size={20} color={colors.primary} /></View>
        <View style={styles.featureCopy}><Text style={[styles.featureTitle, { color: colors.foreground }]}>{item.title}</Text><Text style={[styles.featureText, { color: colors.mutedForeground }]}>{item.text}</Text></View>
      </View>)}
    </View>
  </View>;
}

function Pick({ kind, title, subtitle }: { kind: "team" | "competition"; title: string; subtitle: string }) {
  const colors = useColors();
  const { favoriteTeams, favoriteCompetitions = [], toggleFavorite, toggleCompetition } = useApp();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => { const timer = setTimeout(() => setDebounced(query.trim()), 300); return () => clearTimeout(timer); }, [query]);
  // Nothing typed: the best-known first (Elo for teams, the big events for competitions).
  // Typed: the search forgives typos ("laud" finds LOUD) and ranks the closest, then the strongest.
  const popular = useQuery({ queryKey: ["popular", kind], queryFn: kind === "team" ? popularTeams : popularCompetitions, staleTime: 60 * 60_000 });
  const search = useQuery({ queryKey: ["catalog", kind, debounced, 1], queryFn: () => fetchCatalogPage(kind, 1, debounced), enabled: debounced.length >= 2, staleTime: 10 * 60_000, placeholderData: keepPreviousData });
  const rows = debounced.length >= 2 ? search.data?.items ?? [] : popular.data ?? [];
  const saved = kind === "team" ? favoriteTeams : favoriteCompetitions;
  const toggle = kind === "team" ? toggleFavorite : toggleCompetition;
  return <View style={styles.pick}>
    <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
    <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
    <View style={[styles.search, { backgroundColor: colors.card }]}>
      <Feather name="search" size={17} color={colors.mutedForeground} />
      <TextInput value={query} onChangeText={setQuery} placeholder={kind === "team" ? "Procurar um time" : "Procurar um campeonato"} placeholderTextColor={colors.mutedForeground} autoCorrect={false} style={[styles.input, { color: colors.foreground }, Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null]} />
    </View>
    {saved.length ? <Text style={[styles.count, { color: colors.primary }]}>{saved.length} {kind === "team" ? (saved.length > 1 ? "times escolhidos" : "time escolhido") : (saved.length > 1 ? "campeonatos escolhidos" : "campeonato escolhido")}</Text> : null}
    <FlatList data={rows} keyExtractor={(row) => row.id} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={styles.list} contentContainerStyle={{ paddingBottom: 20 }} renderItem={({ item }) => <Choice item={item} kind={kind} on={saved.includes(item.id)} onPress={() => toggle(item.id)} />} />
  </View>;
}

function Choice({ item, kind, on, onPress }: { item: ApiSearchResult; kind: "team" | "competition"; on: boolean; onPress: () => void }) {
  const colors = useColors();
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={item.name} onPress={onPress} style={[styles.choice, { backgroundColor: on ? colors.accent : colors.card, borderColor: on ? colors.primary : "transparent" }]}>
    <ResolvedLogo type={kind} entityId={item.id} name={item.name} logoUrl={item.logoUrl} size={34} />
    <View style={styles.featureCopy}><Text numberOfLines={1} style={[styles.choiceName, { color: colors.foreground }]}>{item.name}</Text><Text numberOfLines={1} style={[styles.featureText, { color: colors.mutedForeground }]}>{item.countryName || item.season || "Valorant"}</Text></View>
    <Ionicons name={on ? "checkmark-circle" : "add-circle-outline"} size={24} color={on ? colors.primary : colors.mutedForeground} />
  </Pressable>;
}

// What an alert looks like, with two Brazilian favourites, so the step shows instead of only telling.
function ExampleNotification() {
  const colors = useColors();
  const side = (name: string, score: number, lost: boolean) => <View style={styles.exTeam}>
    <ResolvedLogo type="team" name={name} size={26} />
    <Text style={[styles.exName, { color: lost ? colors.mutedForeground : colors.foreground, fontFamily: lost ? font.medium : font.semibold }]}>{name}</Text>
    <Text style={[styles.exScore, { color: lost ? colors.mutedForeground : colors.foreground }]}>{score}</Text>
  </View>;
  return <View accessibilityLabel="Exemplo de aviso: fim de jogo, LOUD 2 a 1 FURIA" style={[styles.example, { backgroundColor: colors.card, borderColor: colors.border }]}>
    <View style={styles.exHead}>
      <View style={[styles.exIcon, { backgroundColor: colors.primary }]}><Feather name="bell" size={11} color={colors.primaryForeground} /></View>
      <Text style={[styles.exApp, { color: colors.mutedForeground }]}>VANT · agora</Text>
    </View>
    <Text style={[styles.exEvent, { color: colors.foreground }]}>Fim de jogo · VCT Americas</Text>
    {side("LOUD", 2, false)}
    {side("FURIA", 1, true)}
  </View>;
}

function Alerts() {
  const colors = useColors();
  const [state, setState] = useState<"idle" | "on" | "off">("idle");
  return <View style={styles.welcome}>
    <View style={[styles.bell, { backgroundColor: colors.accent }]}><Feather name="bell" size={34} color={colors.primary} /></View>
    <Text style={[styles.title, { color: colors.foreground }]}>Não perca nenhum jogo</Text>
    <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Avisamos quando uma partida dos seus times começa e quando termina, com o placar. Você escolhe quais times avisam no seu perfil.</Text>
    <ExampleNotification />
    {Platform.OS === "web" ? <Text style={[styles.featureText, { color: colors.mutedForeground, textAlign: "center" }]}>No navegador, os avisos aparecem dentro do app, no sininho.</Text>
      : <Pressable accessibilityRole="button" onPress={async () => setState(await ensurePermission() ? "on" : "off")} style={[styles.secondaryWide, { backgroundColor: colors.card }]}>
        <Feather name={state === "on" ? "check" : "bell"} size={18} color={state === "on" ? colors.positive : colors.foreground} />
        <Text style={[styles.choiceName, { color: colors.foreground }]}>{state === "on" ? "Avisos ativados" : state === "off" ? "Ative nas configurações do celular" : "Ativar avisos"}</Text>
      </Pressable>}
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  top: { minHeight: 32, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dots: { flexDirection: "row", gap: 6 },
  dot: { height: 8, borderRadius: 4 },
  skip: { fontSize: 15, fontFamily: font.semibold },
  body: { flex: 1, paddingTop: 20 },
  footer: { flexDirection: "row", gap: 10, paddingTop: 14 },
  list: { flex: 1 },
  primary: { flex: 1, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center" },
  primaryText: { fontSize: 16, fontFamily: font.bold },
  secondary: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center" },
  secondaryWide: { marginTop: 20, minHeight: 50, borderRadius: 25, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", gap: 10 },
  welcome: { flex: 1, alignItems: "center", gap: 10 },
  mark: { width: 56, height: 56, marginTop: 16 },
  title: { fontSize: 26, lineHeight: 32, fontFamily: font.bold, textAlign: "center" },
  subtitle: { fontSize: 15, lineHeight: 22, fontFamily: font.regular, textAlign: "center", marginBottom: 8 },
  features: { alignSelf: "stretch", gap: 10, marginTop: 16 },
  feature: { borderRadius: 18, padding: 14, flexDirection: "row", gap: 14, alignItems: "center" },
  featureIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  featureCopy: { flex: 1, minWidth: 0, gap: 2 },
  featureTitle: { fontSize: 15, fontFamily: font.semibold },
  featureText: { fontSize: 13, lineHeight: 18, fontFamily: font.regular },
  pick: { flex: 1, gap: 8 },
  search: { height: 44, borderRadius: 22, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  input: { flex: 1, minWidth: 0, fontSize: 15, paddingVertical: 0 },
  count: { fontSize: 13, fontFamily: font.semibold, marginTop: 4 },
  choice: { minHeight: 60, borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 12, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 12 },
  choiceName: { fontSize: 15, fontFamily: font.semibold },
  example: { alignSelf: "stretch", borderRadius: 20, borderWidth: 1, padding: 14, gap: 8, marginTop: 8 },
  exHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  exIcon: { width: 18, height: 18, borderRadius: 5, alignItems: "center", justifyContent: "center" },
  exApp: { fontSize: 12, fontFamily: font.medium },
  exEvent: { fontSize: 14, fontFamily: font.bold, marginBottom: 2 },
  exTeam: { flexDirection: "row", alignItems: "center", gap: 10 },
  exName: { flex: 1, fontSize: 15 },
  exScore: { fontSize: 17, fontFamily: font.bold },
  bell: { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center", marginTop: 12, marginBottom: 4 },
});
