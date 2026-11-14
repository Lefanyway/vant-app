import type { Feather } from "@expo/vector-icons";
import type { ImageSourcePropType } from "react-native";

// Every avatar a fan can pick, saved in profiles.avatar by its id, in rows like a streaming service's icon picker.
// Agents, buddies and sprays: valorant-api.com, under Riot's fan content terms.
export type AvatarOption = { id: string; label: string; image?: ImageSourcePropType; icon?: keyof typeof Feather.glyphMap; color?: string };

export const avatarGroups: { title: string; items: AvatarOption[] }[] = [
  { title: "Agentes", items: [
    { id: "agent-astra", label: "Astra", image: require("../assets/avatars/agent-astra.png"), color: "#F5B700" },
    { id: "agent-breach", label: "Breach", image: require("../assets/avatars/agent-breach.png"), color: "#18B39B" },
    { id: "agent-brimstone", label: "Brimstone", image: require("../assets/avatars/agent-brimstone.png"), color: "#7C5CFF" },
    { id: "agent-chamber", label: "Chamber", image: require("../assets/avatars/agent-chamber.png"), color: "#E0447C" },
    { id: "agent-clove", label: "Clove", image: require("../assets/avatars/agent-clove.png"), color: "#FF8A1F" },
    { id: "agent-cypher", label: "Cypher", image: require("../assets/avatars/agent-cypher.png"), color: "#2C64A0" },
    { id: "agent-deadlock", label: "Deadlock", image: require("../assets/avatars/agent-deadlock.png"), color: "#F5B700" },
    { id: "agent-fade", label: "Fade", image: require("../assets/avatars/agent-fade.png"), color: "#18B39B" },
    { id: "agent-gekko", label: "Gekko", image: require("../assets/avatars/agent-gekko.png"), color: "#7C5CFF" },
    { id: "agent-harbor", label: "Harbor", image: require("../assets/avatars/agent-harbor.png"), color: "#E0447C" },
    { id: "agent-hush", label: "Hush", image: require("../assets/avatars/agent-hush.png"), color: "#FF8A1F" },
    { id: "agent-iso", label: "Iso", image: require("../assets/avatars/agent-iso.png"), color: "#2C64A0" },
    { id: "agent-jett", label: "Jett", image: require("../assets/avatars/agent-jett.png"), color: "#F5B700" },
    { id: "agent-kayo", label: "KAY/O", image: require("../assets/avatars/agent-kayo.png"), color: "#18B39B" },
    { id: "agent-killjoy", label: "Killjoy", image: require("../assets/avatars/agent-killjoy.png"), color: "#7C5CFF" },
    { id: "agent-miks", label: "Miks", image: require("../assets/avatars/agent-miks.png"), color: "#E0447C" },
    { id: "agent-neon", label: "Neon", image: require("../assets/avatars/agent-neon.png"), color: "#FF8A1F" },
    { id: "agent-omen", label: "Omen", image: require("../assets/avatars/agent-omen.png"), color: "#2C64A0" },
    { id: "agent-phoenix", label: "Phoenix", image: require("../assets/avatars/agent-phoenix.png"), color: "#F5B700" },
    { id: "agent-raze", label: "Raze", image: require("../assets/avatars/agent-raze.png"), color: "#18B39B" },
    { id: "agent-reyna", label: "Reyna", image: require("../assets/avatars/agent-reyna.png"), color: "#7C5CFF" },
    { id: "agent-sage", label: "Sage", image: require("../assets/avatars/agent-sage.png"), color: "#E0447C" },
    { id: "agent-skye", label: "Skye", image: require("../assets/avatars/agent-skye.png"), color: "#FF8A1F" },
    { id: "agent-sova", label: "Sova", image: require("../assets/avatars/agent-sova.png"), color: "#2C64A0" },
    { id: "agent-tejo", label: "Tejo", image: require("../assets/avatars/agent-tejo.png"), color: "#F5B700" },
    { id: "agent-veto", label: "Veto", image: require("../assets/avatars/agent-veto.png"), color: "#18B39B" },
    { id: "agent-viper", label: "Viper", image: require("../assets/avatars/agent-viper.png"), color: "#7C5CFF" },
    { id: "agent-vyse", label: "Vyse", image: require("../assets/avatars/agent-vyse.png"), color: "#E0447C" },
    { id: "agent-waylay", label: "Waylay", image: require("../assets/avatars/agent-waylay.png"), color: "#FF8A1F" },
    { id: "agent-yoru", label: "Yoru", image: require("../assets/avatars/agent-yoru.png"), color: "#2C64A0" },
  ] },
  { title: "Mascotes", items: [
    { id: "mascot-wingmanwiggle", label: "Wingman", image: require("../assets/avatars/pet-wingmanwiggle.png"), color: "#F5B700" },
    { id: "mascot-restingwingman", label: "Wingman dormindo", image: require("../assets/avatars/pet-restingwingman.png"), color: "#18B39B" },
    { id: "mascot-mosholantern", label: "Mosh abóbora", image: require("../assets/avatars/pet-mosholantern.png"), color: "#7C5CFF" },
    { id: "mascot-moshsplat", label: "Mosh", image: require("../assets/avatars/pet-moshsplat.png"), color: "#E0447C" },
    { id: "mascot-wingmansolo", label: "Wingman solo", image: require("../assets/avatars/pet-wingmansolo.png"), color: "#FF8A1F" },
    { id: "mini-chamber", label: "Mini Chamber", image: require("../assets/avatars/go-chamber.png"), color: "#2C64A0" },
    { id: "mini-cypher", label: "Mini Cypher", image: require("../assets/avatars/go-cypher.png"), color: "#F5B700" },
    { id: "mini-gekko", label: "Mini Gekko", image: require("../assets/avatars/go-gekko.png"), color: "#18B39B" },
    { id: "mini-iso", label: "Mini Iso", image: require("../assets/avatars/go-iso.png"), color: "#7C5CFF" },
    { id: "mini-jett", label: "Mini Jett", image: require("../assets/avatars/go-jett.png"), color: "#E0447C" },
    { id: "mini-killjoy", label: "Mini Killjoy", image: require("../assets/avatars/go-killjoy.png"), color: "#FF8A1F" },
    { id: "mini-omen", label: "Mini Omen", image: require("../assets/avatars/go-omen.png"), color: "#2C64A0" },
    { id: "mini-phoenix", label: "Mini Phoenix", image: require("../assets/avatars/go-phoenix.png"), color: "#F5B700" },
    { id: "mini-raze", label: "Mini Raze", image: require("../assets/avatars/go-raze.png"), color: "#18B39B" },
    { id: "mini-reyna", label: "Mini Reyna", image: require("../assets/avatars/go-reyna.png"), color: "#7C5CFF" },
    { id: "mini-sage", label: "Mini Sage", image: require("../assets/avatars/go-sage.png"), color: "#E0447C" },
    { id: "mini-sova", label: "Mini Sova", image: require("../assets/avatars/go-sova.png"), color: "#FF8A1F" },
    { id: "mini-tejo", label: "Mini Tejo", image: require("../assets/avatars/go-tejo.png"), color: "#2C64A0" },
    { id: "mini-viper", label: "Mini Viper", image: require("../assets/avatars/go-viper.png"), color: "#F5B700" },
    { id: "mini-yoru", label: "Mini Yoru", image: require("../assets/avatars/go-yoru.png"), color: "#18B39B" },
  ] },
  { title: "Torcida", items: [
    { id: "fan-zap", label: "Raio", icon: "zap", color: "#FF4655" },
    { id: "fan-star", label: "Estrela", icon: "star", color: "#F5B700" },
    { id: "fan-heart", label: "Coração", icon: "heart", color: "#E0447C" },
    { id: "fan-target", label: "Mira", icon: "crosshair", color: "#18B39B" },
    { id: "fan-award", label: "Troféu", icon: "award", color: "#7C5CFF" },
    { id: "fan-sun", label: "Sol", icon: "sun", color: "#FF8A1F" },
  ] },
];

const all = avatarGroups.flatMap((group) => group.items);
const byId = new Map(all.map((item) => [item.id, item]));
export const findAvatar = (id?: string | null) => (id ? byId.get(id) : undefined);
// New fans start with a random picture, like a new streaming profile, and can change it on the next step.
export const randomAvatar = () => all[Math.floor(Math.random() * all.length)]!.id;
