import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const KEY = "vant:hide-scores";
type Spoilers = { hideScores: boolean; setHideScores: (value: boolean) => void; isHidden: (matchId: string) => boolean; reveal: (matchId: string) => void };
const SpoilerContext = createContext<Spoilers | null>(null);

// "Sem spoiler": results stay hidden until the person asks to see a match's score.
// The choice is kept on the phone; what was revealed lasts until the app closes.
export function SpoilerProvider({ children }: { children: ReactNode }) {
  const [hideScores, setHide] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());
  useEffect(() => { AsyncStorage.getItem(KEY).then((value) => setHide(value === "1")).catch(() => undefined); }, []);
  const setHideScores = (value: boolean) => {
    setHide(value);
    setRevealed(new Set());
    AsyncStorage.setItem(KEY, value ? "1" : "0").catch(() => undefined);
  };
  const value: Spoilers = {
    hideScores,
    setHideScores,
    isHidden: (matchId) => hideScores && !revealed.has(matchId),
    reveal: (matchId) => setRevealed((current) => new Set(current).add(matchId)),
  };
  return <SpoilerContext.Provider value={value}>{children}</SpoilerContext.Provider>;
}

// Outside the provider (tests, isolated screens) nothing is hidden.
export function useSpoilers(): Spoilers {
  return useContext(SpoilerContext) ?? { hideScores: false, setHideScores: () => undefined, isHidden: () => false, reveal: () => undefined };
}
