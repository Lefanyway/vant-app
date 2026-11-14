import * as Haptics from "expo-haptics";
import { type ReactNode, useEffect, useRef } from "react";
import { Dimensions, Platform, Pressable, StyleSheet, View, type PressableProps, type PressableStateCallbackType, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from "react-native-reanimated";

// The app's small motions, kept quick so they feel alive without getting in the way:
// a card slides up a few pixels and fades in as it arrives, the first ones one after another,
export function Appear({ index = 0, children, style }: { index?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <Animated.View entering={FadeInDown.duration(200).delay(Math.min(index, 5) * 30)} style={style}>{children}</Animated.View>;
}

// anything tappable shrinks slightly under the finger,
export const pressed = (base?: StyleProp<ViewStyle>) => ({ pressed: down }: PressableStateCallbackType): StyleProp<ViewStyle> =>
  [base, down ? { transform: [{ scale: 0.97 }], opacity: 0.88 } : null];

// big tappable cards sink softly and spring back instead of snapping,
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const soft = { damping: 14, stiffness: 260, mass: 0.6 };
export function Tap({ style, children, ...props }: Omit<PressableProps, "style"> & { style?: StyleProp<ViewStyle> }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <AnimatedPressable {...props} onPressIn={(event) => { scale.value = withSpring(0.97, soft); props.onPressIn?.(event); }} onPressOut={(event) => { scale.value = withSpring(1, soft); props.onPressOut?.(event); }} style={[style, anim]}>{children}</AnimatedPressable>;
}

// the phone gives a light tap only at the moments that matter (follow, a live map ends, a win),
export function buzz(strong = false) {
  if (Platform.OS !== "web") Haptics.impactAsync(strong ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

// a follow icon pops and throws a few sparks when it turns on,
export function Pop({ active, color, children }: { active: boolean; color: string; children: ReactNode }) {
  const scale = useSharedValue(1);
  const burst = useSharedValue(1);
  const was = useRef(active);
  useEffect(() => {
    if (active && !was.current) {
      scale.value = withSequence(withTiming(1.35, { duration: 110 }), withSpring(1, { damping: 8 }));
      burst.value = 0;
      burst.value = withTiming(1, { duration: 450 });
    }
    was.current = active;
  }, [active, burst, scale]);
  const icon = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <View style={styles.pop}>
    {[0, 1, 2, 3, 4, 5].map(i => <Spark key={i} angle={(i * Math.PI) / 3} color={color} burst={burst} />)}
    <Animated.View style={icon}>{children}</Animated.View>
  </View>;
}

function Spark({ angle, color, burst }: { angle: number; color: string; burst: { value: number } }) {
  const style = useAnimatedStyle(() => ({
    opacity: burst.value < 1 ? 1 - burst.value : 0,
    transform: [{ translateX: Math.cos(angle) * 18 * burst.value }, { translateY: Math.sin(angle) * 18 * burst.value }],
  }));
  return <Animated.View pointerEvents="none" style={[styles.spark, { backgroundColor: color }, style]} />;
}

// a changing score rolls in from below like an odometer (but not on first render),
export function RollingNumber({ value, style }: { value: number | string; style?: StyleProp<TextStyle> }) {
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; }, []);
  return <View style={styles.roll}><Animated.Text key={String(value)} entering={mounted.current ? FadeIn.duration(140) : undefined} style={style}>{value}</Animated.Text></View>;
}

// an on/off toggle whose white knob glides across with a soft spring (the same on every phone and the web),
export function Toggle({ value, onColor, offColor }: { value: boolean; onColor: string; offColor: string }) {
  const x = useSharedValue(value ? 1 : 0);
  useEffect(() => { x.value = withTiming(value ? 1 : 0, { duration: 160 }); }, [value, x]);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * 20 }] }));
  return <View style={[styles.track, { backgroundColor: value ? onColor : offColor }]}>
    <Animated.View style={[styles.knob, knob]} />
  </View>;
}

// and a win gets a short burst of confetti falling over the screen.
const confettiColors = ["#FF4655", "#FFD166", "#06D6A0", "#4CC9F0", "#B388FF", "#FFFFFF"];
export function Confetti() {
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>{Array.from({ length: 28 }, (_, i) => <Piece key={i} index={i} />)}</View>;
}

function Piece({ index }: { index: number }) {
  const fall = useSharedValue(0);
  const seed = useRef({ x: Math.random(), spin: Math.random() > 0.5 ? 1 : -1, delay: Math.random() * 250, time: 1300 + Math.random() * 700 }).current;
  const height = Dimensions.get("window").height;
  useEffect(() => { fall.value = withDelay(seed.delay, withTiming(1, { duration: seed.time })); }, [fall, seed]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - fall.value * fall.value,
    transform: [{ translateY: fall.value * height * 0.8 }, { translateX: Math.sin(fall.value * 6 + index) * 14 }, { rotate: `${fall.value * 540 * seed.spin}deg` }],
  }));
  return <Animated.View style={[styles.piece, { left: `${seed.x * 100}%`, backgroundColor: confettiColors[index % confettiColors.length] }, style]} />;
}

const styles = StyleSheet.create({
  pop: { alignItems: "center", justifyContent: "center" },
  spark: { position: "absolute", width: 5, height: 5, borderRadius: 3 },
  roll: { overflow: "hidden" },
  track: { width: 50, height: 30, borderRadius: 15, overflow: "hidden" },
  knob: { position: "absolute", top: 2, left: 2, width: 26, height: 26, borderRadius: 13, backgroundColor: "#FFFFFF", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  piece: { position: "absolute", top: -12, width: 8, height: 12, borderRadius: 2 },
});
