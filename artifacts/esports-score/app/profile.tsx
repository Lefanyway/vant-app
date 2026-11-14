import { useSpoilers } from "@/context/SpoilerContext";
import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthField, FormMessage, PrimaryButton } from "@/components/AuthScreen";
import { Avatar, AvatarPicker } from "@/components/Avatar";
import { BackButton } from "@/components/BackButton";
import { FollowingSettings } from "@/components/FollowingSettings";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { font } from "@/constants/type";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationsContext";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { authErrorMessage } from "@/lib/supabase";

export default function Profile() {
  const spoilers = useSpoilers();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { session, profile, updateProfile, updatePassword, signOut } = useAuth();
  const email = session?.user.email ?? "";
  const name = profile?.display_name?.trim() || email.split("@")[0] || "Seu perfil";
  const [editing, setEditing] = useState<"name" | "password" | null>(null);
  const [draft, setDraft] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "error" | "info" } | null>(null);

  const { unread, simulate } = useNotifications();
  const [simulating, setSimulating] = useState(false);
  const runSimulation = async () => {
    setSimulating(true);
    try { await simulate(); setMessage({ text: "Notificação de teste enviada.", tone: "info" }); }
    catch { setMessage({ text: "Não foi possível enviar a notificação de teste.", tone: "error" }); }
    finally { setSimulating(false); }
  };

  const open = (mode: "name" | "password") => { setEditing(mode); setDraft(mode === "name" ? name : ""); setAvatar(profile?.avatar ?? null); setMessage(null); };
  const save = async () => {
    if (busy) return;
    if (editing === "password" && draft.length < 6) return setMessage({ text: "Use uma senha com pelo menos 6 caracteres.", tone: "error" });
    if (editing === "name" && !draft.trim()) return setMessage({ text: "Digite seu nome.", tone: "error" });
    setBusy(true);
    try {
      if (editing === "name") await updateProfile({ display_name: draft.trim().slice(0, 60), avatar });
      else await updatePassword(draft);
      setMessage({ text: editing === "name" ? "Perfil atualizado." : "Senha alterada.", tone: "info" });
      setEditing(null);
    } catch (failure) { setMessage({ text: authErrorMessage(failure), tone: "error" }); }
    finally { setBusy(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
    <View style={[styles.nav, { paddingTop: Math.max(insets.top, 8), paddingHorizontal: 8 }]}><BackButton /></View>
    {/* The name and password fields scroll above the keyboard instead of hiding behind it. */}
    <KeyboardAwareScrollViewCompat style={{ flex: 1 }} bottomOffset={24} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>

      <View style={styles.identity}>
        <Pressable accessibilityRole="button" accessibilityLabel="Trocar avatar" onPress={() => open("name")}><Avatar id={editing === "name" ? avatar : profile?.avatar} name={name} /></Pressable>
        <Text style={[styles.name, { color: colors.foreground }]}>{name}</Text>
        <Text style={[styles.email, { color: colors.mutedForeground }]}>{email}</Text>
        {editing !== "name" ? <Pressable accessibilityRole="button" onPress={() => open("name")} style={[styles.chip, { backgroundColor: colors.secondary }]}><Text style={[styles.chipText, { color: colors.foreground }]}>Editar perfil</Text></Pressable> : null}
      </View>

      {editing === "name" ? <View style={styles.form}>
        <AuthField accessibilityLabel="Nome" placeholder="Nome" value={draft} onChangeText={setDraft} autoCapitalize="words" maxLength={60} autoFocus onSubmitEditing={() => void save()} />
        <AvatarPicker value={avatar} onChange={setAvatar} name={draft || name} />
        <PrimaryButton label="Salvar perfil" onPress={() => void save()} busy={busy} />
        <Pressable accessibilityRole="button" onPress={() => setEditing(null)} style={styles.cancel}><Text style={[styles.chipText, { color: colors.mutedForeground }]}>Cancelar</Text></Pressable>
      </View> : null}

      {message ? <View style={styles.message}><FormMessage text={message.text} tone={message.tone} /></View> : null}

      <Text style={[styles.section, { color: colors.mutedForeground }]}>Seguindo</Text>
      <FollowingSettings />

      <Text style={[styles.section, { color: colors.mutedForeground }]}>Preferências</Text>
      <View style={[styles.panel, { backgroundColor: colors.card }]}>
        <Pressable accessibilityRole="button" onPress={() => router.push("/notifications")} style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.foreground }]}>Notificações</Text>
          {unread ? <Text style={[styles.count, { color: colors.primary }]}>{unread} novas</Text> : null}
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </Pressable>
        {/* For presentations with no match on: the database sends a real notification built from a recent result. */}
        <Pressable accessibilityRole="button" disabled={simulating} onPress={() => void runSimulation()} style={[styles.row, styles.divider, { borderTopColor: colors.border }]}>
          <Text style={[styles.rowLabel, { color: colors.primary }]}>{simulating ? "Enviando…" : "Simular notificação"}</Text>
          <Feather name="bell" size={18} color={colors.primary} />
        </Pressable>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: spoilers.hideScores }} onPress={() => spoilers.setHideScores(!spoilers.hideScores)} style={[styles.row, styles.divider, { borderTopColor: colors.border }]}>
          <View style={{ flex: 1 }}><Text style={[styles.rowLabel, { color: colors.foreground }]}>Sem spoiler</Text><Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>Esconde os placares até você tocar em "Ver placar"</Text></View>
          <Switch value={spoilers.hideScores} onValueChange={spoilers.setHideScores} trackColor={{ true: colors.primary, false: colors.secondary }} thumbColor="#FFFFFF" {...({ activeThumbColor: "#FFFFFF" } as object)} ios_backgroundColor={colors.secondary} />
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push("/onboarding")} style={[styles.row, styles.divider, { borderTopColor: colors.border }]}>
          <Text style={[styles.rowLabel, { color: colors.foreground }]}>Ver introdução</Text>
          <Feather name="play-circle" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <Text style={[styles.section, { color: colors.mutedForeground }]}>Conta</Text>
      <View style={[styles.panel, { backgroundColor: colors.card }]}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: editing === "password" }} onPress={() => editing === "password" ? setEditing(null) : open("password")} style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.foreground }]}>Alterar senha</Text>
          <Feather name={editing === "password" ? "chevron-down" : "chevron-right"} size={18} color={colors.mutedForeground} />
        </Pressable>
        {editing === "password" ? <View style={styles.inlineForm}>
          <AuthField accessibilityLabel="Nova senha" placeholder="Nova senha" value={draft} onChangeText={setDraft} secret textContentType="newPassword" autoComplete="new-password" autoFocus onSubmitEditing={() => void save()} />
          <PrimaryButton label="Salvar senha" onPress={() => void save()} busy={busy} disabled={!draft} />
        </View> : null}
      </View>

      <Pressable accessibilityRole="button" onPress={() => void signOut()} style={styles.signOut}>
        <Text style={[styles.signOutText, { color: colors.destructive }]}>Sair da conta</Text>
      </Pressable>
    </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  nav: { flexDirection: "row", alignItems: "center" },
  identity: { alignItems: "center", marginTop: 16 },
  name: { fontSize: 22, fontFamily: font.bold, letterSpacing: -0.4, marginTop: 16, textAlign: "center" },
  email: { fontSize: 14, fontFamily: font.regular, marginTop: 4 },
  chip: { minHeight: 40, borderRadius: 20, paddingHorizontal: 18, justifyContent: "center", marginTop: 16 },
  chipText: { fontSize: 14, fontFamily: font.semibold },
  form: { marginTop: 20, gap: 10 },
  cancel: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  message: { marginTop: 14, alignItems: "center" },
  section: { fontSize: 13, fontFamily: font.semibold, marginTop: 32, marginBottom: 10, marginHorizontal: 4 },
  panel: { borderRadius: 20, paddingHorizontal: 18 },
  row: { minHeight: 60, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  // No extra Android font padding, so the label lines up with the switch beside it.
  rowLabel: { flex: 1, fontSize: 15, lineHeight: 20, fontFamily: font.medium, includeFontPadding: false, textAlignVertical: "center" },
  divider: { borderTopWidth: 1 },
  count: { fontSize: 13, fontFamily: font.semibold },
  inlineForm: { gap: 10, paddingBottom: 16 },
  signOut: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 28 },
  signOutText: { fontSize: 15, fontFamily: font.semibold },
});
