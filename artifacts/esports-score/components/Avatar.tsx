import { Feather } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { pressed } from "@/components/Motion";
import { font } from "@/constants/type";
import { useColors } from "@/hooks/useColors";
import { avatarGroups, findAvatar } from "@/lib/avatars";

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]!.toUpperCase()).join("") || "?";

// The fan's picture: the avatar they chose, or their initials until they choose one.
export function Avatar({ id, name, size = 84 }: { id?: string | null; name: string; size?: number }) {
  const colors = useColors();
  const avatar = findAvatar(id);
  const round = { width: size, height: size, borderRadius: size / 2 };
  if (avatar?.image) return <Image source={avatar.image} accessibilityLabel={avatar.label} style={[round, { backgroundColor: colors.card }]} />;
  return <View style={[styles.center, round, { backgroundColor: avatar?.color ?? colors.accent }]}>
    {avatar?.icon ? <Feather name={avatar.icon} size={size * 0.45} color="#FFFFFF" /> : <Text style={{ fontSize: size / 3, fontFamily: font.bold, color: colors.primary }}>{initials(name)}</Text>}
  </View>;
}

// A grid like a streaming service's profile picker: tap one, it gets a ring and a check.
export function AvatarPicker({ value, onChange, name }: { value?: string | null; onChange: (id: string) => void; name: string }) {
  const colors = useColors();
  return <View style={styles.picker}>
    {avatarGroups.map((group) => <View key={group.title}>
      <Text style={[styles.group, { color: colors.mutedForeground }]}>{group.title}</Text>
      <View style={styles.grid}>
        {group.items.map((item) => {
          const on = item.id === value;
          return <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={item.label} onPress={() => onChange(item.id)} style={pressed(styles.cell)}>
            <View style={[styles.ring, { borderColor: on ? colors.primary : "transparent" }]}><Avatar id={item.id} name={name} size={60} /></View>
            {on ? <View style={[styles.check, { backgroundColor: colors.primary, borderColor: colors.background }]}><Feather name="check" size={12} color={colors.primaryForeground} /></View> : null}
            <Text numberOfLines={1} style={[styles.label, { color: on ? colors.foreground : colors.mutedForeground }]}>{item.label}</Text>
          </Pressable>;
        })}
      </View>
    </View>)}
    <Text style={[styles.credit, { color: colors.mutedForeground }]}>Fotos de jogadores: Liquipedia (CC BY-SA)</Text>
  </View>;
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  picker: { gap: 6 },
  group: { fontSize: 13, fontFamily: font.semibold, marginTop: 10, marginBottom: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: 12 },
  cell: { width: "25%", alignItems: "center", gap: 6 },
  ring: { borderWidth: 2.5, borderRadius: 36, padding: 3 },
  check: { position: "absolute", top: 0, right: "18%", width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 12, fontFamily: font.medium, maxWidth: 76 },
  credit: { fontSize: 11, fontFamily: font.regular, marginTop: 12, textAlign: "center" },
});
