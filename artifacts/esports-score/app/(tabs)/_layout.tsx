import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { onboardingKey } from "@/lib/onboarding";
import Feather from "@expo/vector-icons/Feather";
import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { font } from "@/constants/type";
import { useColors } from "@/hooks/useColors";

const labels: Record<string, string> = { index: "Partidas", following: "Favoritos", insights: "Previsões", picks: "Palpites", search: "Buscar" };
const icons = { index: "clock", following: "star", insights: "bar-chart-2", picks: "target", search: "search" } as const;
// New accounts with nothing followed see the onboarding once; people who already follow something skip it.
function useFirstRun() {
  const userId = useAuth().session?.user.id;
  const { favoriteTeams, favoriteCompetitions = [], favoritesReady = true } = useApp();
  useEffect(() => {
    if (!userId || !favoritesReady) return;
    const key = onboardingKey(userId);
    AsyncStorage.getItem(key).then((seen) => {
      if (seen) return;
      if (favoriteTeams.length || favoriteCompetitions.length) void AsyncStorage.setItem(key, "1");
      else router.replace("/onboarding");
    }).catch(() => undefined);
  }, [userId, favoritesReady]);
}

export default function TabLayout() {
  useFirstRun();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }} tabBar={({ state, emitter, navigateToTab }) => <View style={[styles.container, { bottom: Math.max(insets.bottom, 12) }]}>
    <View style={[styles.bar, { borderColor: colors.border, backgroundColor: colors.card }]}>
      {Platform.OS === "ios" ? <BlurView intensity={40} tint={colors.background === "#090B0D" ? "dark" : "light"} style={StyleSheet.absoluteFill} /> : null}
      {state.routes.filter(route => labels[route.name]).map(route => {
        const active = state.routes[state.index].key === route.key;
        return <Pressable key={route.key} accessibilityRole="tab" aria-selected={active} accessibilityLabel={labels[route.name]} onPress={() => { const event = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true }); if (!active && !event.defaultPrevented) navigateToTab(route.key); }} style={[styles.item, { backgroundColor: active ? colors.secondary : "transparent" }]}>
          <Feather name={icons[route.name as keyof typeof icons]} size={22} color={active ? colors.primary : colors.mutedForeground} />
          <Text style={[styles.label, { color: active ? colors.primary : colors.mutedForeground, fontFamily: font.semibold }]}>{labels[route.name]}</Text>
        </Pressable>;
      })}
    </View>
  </View>}>
    <Tabs.Screen name="index" options={{ title: "Partidas" }} />
    <Tabs.Screen name="insights" options={{ title: "Previsões" }} />
    <Tabs.Screen name="picks" options={{ title: "Palpites" }} />
    <Tabs.Screen name="following" options={{ title: "Favoritos" }} />
    <Tabs.Screen name="search" options={{ title: "Buscar" }} />
  </Tabs>;
}
const styles = StyleSheet.create({ container: { position: "absolute", left: 12, right: 12 }, bar: { flexDirection: "row", borderWidth: 1, borderRadius: 40, padding: 5, overflow: "hidden" }, item: { flex: 1, minWidth: 0, height: 58, borderRadius: 32, alignItems: "center", justifyContent: "center", gap: 2 }, label: { fontSize: 10 } });

