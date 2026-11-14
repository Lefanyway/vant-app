import type { ReactNode } from "react";
import type { PressableStateCallbackType, StyleProp, ViewStyle } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

// The app's two motions, kept small so they feel quick and clean:
// a card slides up a few pixels and fades in as it arrives, the first ones one after another,
export function Appear({ index = 0, children, style }: { index?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <Animated.View entering={FadeInDown.duration(260).delay(Math.min(index, 6) * 45)} style={style}>{children}</Animated.View>;
}

// and anything tappable shrinks slightly under the finger.
export const pressed = (base?: StyleProp<ViewStyle>) => ({ pressed: down }: PressableStateCallbackType): StyleProp<ViewStyle> =>
  [base, down ? { transform: [{ scale: 0.97 }], opacity: 0.88 } : null];
