import { Feather } from "@expo/vector-icons";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { pressed } from "@/components/Motion";
import { font } from "@/constants/type";
import { useColors } from "@/hooks/useColors";
import { avatarGroups, findAvatar } from "@/lib/avatars";

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]!.toUpperCase()).join("") || "?";

// The fan's picture, a rounded square like a streaming profile: the avatar they chose, or their initials.
export function Avatar({ id, name, size = 84 }: { id?: string | null; name: string; size?: number }) {
  const colors = useColors();
  const avatar = findAvatar(id);
  const tile = { width: size, height: size, borderRadius: Math.round(size * 0.16), backgroundColor: avatar?.color ?? (avatar?.image ? colors.card : colors.accent) };
  if (avatar?.image) return <Image source={avatar.image} accessibilityLabel={avatar.label} resizeMode="cover" style={tile} />;
  return <View style={[styles.center, tile]}>
    {avatar?.icon ? <Feather name={avatar.icon} size={size * 0.45} color="#FFFFFF" /> : <Text style={{ fontSize: size / 3, fontFamily: font.bold, color: colors.primary }}>{initials(name)}</Text>}
  </View>;
}

// One row per theme, scrolled sideways, like a streaming service's icon picker: tap one, it gets a ring and a check.
export function AvatarPicker({ value, onChange, name }: { value?: string | null; onChange: (id: string) => void; name: string }) {
  const colors = useColors();
  return <View>
    {avatarGroups.map((group) => <View key={group.title}>
      <Text style={[styles.group, { color: colors.foreground }]}>{group.title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {group.items.map((item) => {
          const on = item.id === value;
          return <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={item.label} onPress={() => onChange(item.id)} style={pressed()}>
            <View style={[styles.ring, { borderColor: on ? colors.foreground : "transparent" }]}><Avatar id={item.id} name={name} size={76} /></View>
            {on ? <View style={[styles.check, { backgroundColor: colors.foreground, borderColor: colors.background }]}><Feather name="check" size={13} color={colors.background} /></View> : null}
          </Pressable>;
        })}
      </ScrollView>
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  group: { fontSize: 16, fontFamily: font.bold, marginTop: 18, marginBottom: 10 },
  row: { gap: 8, paddingRight: 20 },
  ring: { borderWidth: 3, borderRadius: 16, padding: 2 },
  check: { position: "absolute", top: -4, right: -4, width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: "center", justifyContent: "center" },
});
