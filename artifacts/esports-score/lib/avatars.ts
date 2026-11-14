import type { Feather } from "@expo/vector-icons";
import type { ImageSourcePropType } from "react-native";

// Every avatar a fan can pick, saved in profiles.avatar by its id.
export type AvatarOption = { id: string; label: string; image?: ImageSourcePropType; icon?: keyof typeof Feather.glyphMap; color?: string };

const agent = (id: string, label: string, image: ImageSourcePropType): AvatarOption => ({ id: `agent-${id}`, label, image });
const player = (id: string, label: string, image: ImageSourcePropType): AvatarOption => ({ id: `player-${id}`, label, image });

export const avatarGroups: { title: string; items: AvatarOption[] }[] = [
  { title: "Jogadores", items: [
    player("aspas", "aspas", require("../assets/avatars/player-aspas.jpg")),
    player("tenz", "TenZ", require("../assets/avatars/player-tenz.jpg")),
    player("less", "Less", require("../assets/avatars/player-less.jpg")),
    player("saadhak", "Saadhak", require("../assets/avatars/player-saadhak.jpg")),
    player("cauanzin", "cauanzin", require("../assets/avatars/player-cauanzin.jpg")),
    player("tuyz", "tuyz", require("../assets/avatars/player-tuyz.jpg")),
    player("sacy", "Sacy", require("../assets/avatars/player-sacy.jpg")),
    player("demon1", "Demon1", require("../assets/avatars/player-demon1.jpg")),
    player("derke", "Derke", require("../assets/avatars/player-derke.jpg")),
    player("chronicle", "Chronicle", require("../assets/avatars/player-chronicle.jpg")),
    player("boaster", "Boaster", require("../assets/avatars/player-boaster.jpg")),
    player("something", "something", require("../assets/avatars/player-something.jpg")),
  ] },
  { title: "Agentes", items: [
    agent("jett", "Jett", require("../assets/avatars/agent-jett.png")),
    agent("reyna", "Reyna", require("../assets/avatars/agent-reyna.png")),
    agent("phoenix", "Phoenix", require("../assets/avatars/agent-phoenix.png")),
    agent("sage", "Sage", require("../assets/avatars/agent-sage.png")),
    agent("omen", "Omen", require("../assets/avatars/agent-omen.png")),
    agent("raze", "Raze", require("../assets/avatars/agent-raze.png")),
    agent("killjoy", "Killjoy", require("../assets/avatars/agent-killjoy.png")),
    agent("sova", "Sova", require("../assets/avatars/agent-sova.png")),
    agent("clove", "Clove", require("../assets/avatars/agent-clove.png")),
    agent("neon", "Neon", require("../assets/avatars/agent-neon.png")),
    agent("viper", "Viper", require("../assets/avatars/agent-viper.png")),
    agent("yoru", "Yoru", require("../assets/avatars/agent-yoru.png")),
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

const byId = new Map(avatarGroups.flatMap((group) => group.items).map((item) => [item.id, item]));
export const findAvatar = (id?: string | null) => (id ? byId.get(id) : undefined);
