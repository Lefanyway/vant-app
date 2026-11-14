import { Appear, pressed } from "@/components/Motion";
import { Avatar, AvatarPicker } from "@/components/Avatar";
import { Feather, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import Animated, { Easing, FadeInDown, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { ActivityIndicator, FlatList, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ResolvedLogo } from "@/components/ResolvedLogo";
import { font } from "@/constants/type";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { ensurePermission } from "@/context/NotificationsContext";
import { useColors } from "@/hooks/useColors";
import { fetchCatalogPage, type ApiSearchResult } from "@/lib/api";
import { randomAvatar } from "@/lib/avatars";
import { onboardingKey, popularCompetitions, popularTeams } from "@/lib/onboarding";

const mark = require("../assets/generated/games/valorant-mark.png");

const intro = [
  { icon: "play-circle" as const, title: "Jogos ao vivo", text: "Todos os jogos do dia num só lugar." },
  { icon: "star" as const, title: "Siga seus times", text: "Avisamos quando eles jogam." },
  { icon: "bar-chart-2" as const, title: "Quem deve ganhar", text: "A chance de cada time, explicada." },
];

// First run: what VANT is, then the teams and competitions to follow, then alerts. Every step can be skipped.
export default function Onboarding() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { session, profile, updateProfile } = useAuth();
  const userId = session?.user.id;
  const [step, setStep] = useState(0);
  const [nick, setNick] = useState(profile?.display_name ?? "");
  const [avatar, setAvatar] = useState<string | null>(() => profile?.avatar ?? randomAvatar());
  const [building, setBuilding] = useState(false);
  // The profile can arrive after the screen opens: fill in what the fan already has.
  useEffect(() => { if (profile) { setNick((current) => current || profile.display_name || ""); setAvatar((current) => profile.avatar ?? current); } }, [profile]);
  // Both lists load while the welcome step is read, so the pick steps open already filled.
  const client = useQueryClient();
  useEffect(() => {
    void client.prefetchQuery({ queryKey: ["popular", "team"], queryFn: popularTeams, staleTime: 60 * 60_000 });
    void client.prefetchQuery({ queryKey: ["popular", "competition"], queryFn: popularCompetitions, staleTime: 60 * 60_000 });
  }, [client]);
  // Saves the nickname and avatar, then a short "building" screen before the home.
  const finish = async () => {
    setBuilding(true);
    const name = nick.split("#")[0]!.trim().slice(0, 60);
    const changes = { ...(name && name !== profile?.display_name ? { display_name: name } : {}), ...(avatar !== (profile?.avatar ?? null) ? { avatar } : {}) };
    await Promise.all([
      AsyncStorage.setItem(onboardingKey(userId), "1").catch(() => undefined), // shows again next time, harmless
      Object.keys(changes).length ? updateProfile(changes).catch(() => undefined) : null, // can be changed later in the profile
      new Promise((done) => setTimeout(done, 2400)),
    ]);
    router.replace("/");
  };
  const steps = [
    <Welcome key="welcome" />,
    <Name key="name" nick={nick} onNick={setNick} avatar={avatar} onDone={() => setStep(2)} />,
    <AvatarStep key="avatar" nick={nick} avatar={avatar} onAvatar={setAvatar} />,
    <Glossary key="glossary" />,
    <Pick key="teams" kind="team" title="Quais times você torce?" subtitle="Escolha quantos quiser." />,
    <Pick key="competitions" kind="competition" title="E quais campeonatos?" subtitle="Eles aparecem nos seus Favoritos." />,
    <Alerts key="alerts" />,
  ];
  const last = step === steps.length - 1;
  if (building) return <Building />;
  return <KeyboardAvoidingView behavior="padding" style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
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
  </KeyboardAvoidingView>;
}

function Welcome() {
  const colors = useColors();
  return <View style={styles.welcome}>
    <Image source={mark} resizeMode="contain" accessibilityLabel="VANT" style={styles.mark} />
    <Text style={[styles.title, { color: colors.foreground }]}>Bem-vindo ao VANT</Text>
    <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Valorant competitivo, fácil de acompanhar.</Text>
    <View style={styles.features}>
      {intro.map((item) => <View key={item.title} style={[styles.feature, { backgroundColor: colors.card }]}>
        <View style={[styles.featureIcon, { backgroundColor: colors.accent }]}><Feather name={item.icon} size={20} color={colors.primary} /></View>
        <View style={styles.featureCopy}><Text style={[styles.featureTitle, { color: colors.foreground }]}>{item.title}</Text><Text style={[styles.featureText, { color: colors.mutedForeground }]}>{item.text}</Text></View>
      </View>)}
    </View>
  </View>;
}

// Three ideas are enough to follow any match: a picture and one line each.
function Glossary() {
  const colors = useColors();
  const series = <View style={styles.series}>{[true, true, false].map((won, index) => <View key={index} style={[styles.seriesMap, { backgroundColor: won ? colors.primary : colors.secondary }]} />)}</View>;
  const terms = [
    { icon: "map" as const, title: "Mapa", text: "Cada jogo é em um mapa. Ganha quem fizer 13 rounds." },
    { icon: "layers" as const, title: "BO3", text: "Melhor de 3 mapas: quem vencer 2 leva.", extra: series },
    { icon: "award" as const, title: "VCT", text: "O campeonato oficial da Riot, o mais importante do ano." },
  ];
  return <View style={styles.welcome}>
    <Text style={[styles.title, { color: colors.foreground }]}>Valorant em 3 palavras</Text>
    <View style={styles.features}>
      {terms.map((item, index) => <Appear key={item.title} index={index}><View style={[styles.term, { backgroundColor: colors.card }]}>
        <View style={[styles.termIcon, { backgroundColor: colors.accent }]}><Feather name={item.icon} size={24} color={colors.primary} /></View>
        <View style={styles.featureCopy}>
          <Text style={[styles.termTitle, { color: colors.foreground }]}>{item.title}</Text>
          <Text style={[styles.featureText, { color: colors.mutedForeground }]}>{item.text}</Text>
          {item.extra}
        </View>
      </View></Appear>)}
    </View>
  </View>;
}

// One thing at a time: first only the nickname,
function Name({ nick, onNick, avatar, onDone }: { nick: string; onNick: (value: string) => void; avatar: string | null; onDone: () => void }) {
  const colors = useColors();
  return <View style={styles.welcome}>
    <Pressable accessibilityRole="button" accessibilityLabel="Trocar avatar" onPress={onDone} style={pressed()}>
      <Avatar id={avatar} name={nick || "?"} size={104} />
      <View style={[styles.pencil, { backgroundColor: colors.foreground, borderColor: colors.background }]}><Feather name="edit-2" size={14} color={colors.background} /></View>
    </Pressable>
    <Text style={[styles.title, { color: colors.foreground, marginTop: 8 }]}>Qual é o seu nick no Valorant?</Text>
    <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Use o mesmo do jogo, assim a galera te reconhece.</Text>
    <TextInput value={nick} onChangeText={onNick} placeholder="Ex.: aspas" placeholderTextColor={colors.mutedForeground} maxLength={30} autoCapitalize="none" autoCorrect={false} autoFocus returnKeyType="next" onSubmitEditing={onDone} accessibilityLabel="Nick no Valorant" style={[styles.nick, { backgroundColor: colors.card, color: colors.foreground }, Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null]} />
  </View>;
}

// then the picture: the chosen one big on top, the options below in rows by theme.
function AvatarStep({ nick, avatar, onAvatar }: { nick: string; avatar: string | null; onAvatar: (id: string) => void }) {
  const colors = useColors();
  return <View style={styles.pick}>
    <View style={styles.preview}>
      <Avatar id={avatar} name={nick || "?"} size={88} />
      <Text numberOfLines={1} style={[styles.choiceName, { color: colors.foreground }]}>{nick.split("#")[0]!.trim() || "Você"}</Text>
    </View>
    <Text style={[styles.title, { color: colors.foreground }]}>Escolha seu avatar</Text>
    <ScrollView showsVerticalScrollIndicator={false} style={styles.list} contentContainerStyle={{ paddingBottom: 20 }}>
      <AvatarPicker value={avatar} onChange={onAvatar} name={nick} />
    </ScrollView>
  </View>;
}

// After the last step: the logo breathes for a moment while the home is put together.
const buildingLines = ["Separando os jogos dos seus times", "Montando sua agenda", "Preparando seus palpites", "Tudo pronto!"];
function Building() {
  const colors = useColors();
  const scale = useSharedValue(1);
  useEffect(() => { scale.value = withRepeat(withTiming(1.12, { duration: 700, easing: Easing.inOut(Easing.quad) }), -1, true); }, [scale]);
  const breathe = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const [line, setLine] = useState(0);
  useEffect(() => { const timer = setInterval(() => setLine((value) => Math.min(value + 1, buildingLines.length - 1)), 750); return () => clearInterval(timer); }, []);
  return <View accessibilityLabel="Criando sua experiência" style={[styles.building, { backgroundColor: colors.background }]}>
    <Animated.View entering={FadeInDown.duration(500)}><Animated.View style={breathe}><Image source={mark} resizeMode="contain" style={styles.buildingMark} /></Animated.View></Animated.View>
    <Animated.Text entering={FadeInDown.duration(500).delay(150)} style={[styles.title, { color: colors.foreground }]}>Criando sua experiência</Animated.Text>
    <View style={styles.buildingLine}><Animated.Text key={line} entering={FadeInDown.duration(350)} exiting={FadeOut.duration(150)} style={[styles.subtitle, { color: colors.mutedForeground }]}>{buildingLines[line]}</Animated.Text></View>
    <Animated.View entering={FadeInDown.duration(500).delay(300)}><ActivityIndicator color={colors.primary} /></Animated.View>
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
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={item.name} onPress={onPress} style={pressed([styles.choice, { backgroundColor: on ? colors.accent : colors.card, borderColor: on ? colors.primary : "transparent" }])}>
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
      <View style={styles.exIcon}><Image source={mark} resizeMode="contain" style={styles.exMark} /></View>
      <Text style={[styles.exApp, { color: colors.foreground }]}>VANT</Text>
      <Text style={[styles.exTime, { color: colors.mutedForeground }]}>agora</Text>
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
    <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Avisamos quando seus times começam e terminam de jogar.</Text>
    <ExampleNotification />
    {Platform.OS === "web" ? null : <Pressable accessibilityRole="button" onPress={async () => setState(await ensurePermission() ? "on" : "off")} style={[styles.secondaryWide, { backgroundColor: colors.card }]}>
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
  welcome: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingBottom: 24 },
  mark: { width: 72, height: 72 },
  title: { fontSize: 26, lineHeight: 32, fontFamily: font.bold, textAlign: "center" },
  subtitle: { fontSize: 15, lineHeight: 22, fontFamily: font.regular, textAlign: "center", marginBottom: 8 },
  features: { alignSelf: "stretch", gap: 12, marginTop: 20 },
  feature: { borderRadius: 20, padding: 18, flexDirection: "row", gap: 14, alignItems: "center" },
  featureIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  featureCopy: { flex: 1, minWidth: 0, gap: 2 },
  featureTitle: { fontSize: 17, fontFamily: font.semibold },
  featureText: { fontSize: 15, lineHeight: 21, fontFamily: font.regular },
  pick: { flex: 1, gap: 8 },
  nick: { alignSelf: "stretch", height: 60, borderRadius: 20, paddingHorizontal: 18, fontSize: 20, fontFamily: font.semibold, textAlign: "center", marginTop: 16 },
  preview: { alignItems: "center", gap: 8, marginBottom: 4 },
  pencil: { position: "absolute", right: -6, bottom: -6, width: 30, height: 30, borderRadius: 15, borderWidth: 3, alignItems: "center", justifyContent: "center" },
  term: { borderRadius: 22, padding: 20, flexDirection: "row", gap: 16, alignItems: "center" },
  termIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  termTitle: { fontSize: 20, fontFamily: font.bold },
  series: { flexDirection: "row", gap: 6, marginTop: 8 },
  seriesMap: { width: 28, height: 8, borderRadius: 4 },
  building: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  buildingMark: { width: 88, height: 88, marginBottom: 12 },
  buildingLine: { height: 28, justifyContent: "center" },
  search: { height: 44, borderRadius: 22, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  input: { flex: 1, minWidth: 0, fontSize: 15, paddingVertical: 0 },
  count: { fontSize: 13, fontFamily: font.semibold, marginTop: 4 },
  choice: { minHeight: 60, borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 12, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 12 },
  choiceName: { fontSize: 15, fontFamily: font.semibold },
  example: { alignSelf: "stretch", borderRadius: 20, borderWidth: 1, padding: 14, gap: 8, marginTop: 8 },
  exHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  exIcon: { width: 22, height: 22, borderRadius: 6, backgroundColor: "#050707", alignItems: "center", justifyContent: "center" },
  exMark: { width: 14, height: 14 },
  exApp: { flex: 1, fontSize: 13, fontFamily: font.semibold },
  exTime: { fontSize: 12, fontFamily: font.regular },
  exEvent: { fontSize: 14, fontFamily: font.bold, marginBottom: 2 },
  exTeam: { flexDirection: "row", alignItems: "center", gap: 10 },
  exName: { flex: 1, fontSize: 15 },
  exScore: { fontSize: 17, fontFamily: font.bold },
  bell: { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center", marginTop: 12, marginBottom: 4 },
});
