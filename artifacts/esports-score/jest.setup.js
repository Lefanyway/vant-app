jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("@expo/vector-icons/Feather", () => ({ __esModule: true, default: () => null }));
jest.mock("@expo/vector-icons/Ionicons", () => ({ __esModule: true, default: () => null }));

jest.mock("@/components/ResolvedLogo", () => ({
  ResolvedLogo: () => null,
  logoSlot: { list: { size: 22, maxWidth: 64 }, header: { size: 28, maxWidth: 84 }, profile: { size: 72, maxWidth: 180 } },
}));

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

// Screens read the bell's unread count; tests run without the Supabase-backed provider.
jest.mock("@/context/NotificationsContext", () => ({
  useNotifications: () => ({ items: [], unread: 0, markAllRead: async () => undefined, simulate: async () => undefined }),
  NotificationsProvider: ({ children }) => children,
}));

jest.mock("react-native-keyboard-controller", () => require("react-native-keyboard-controller/jest"));

// Swipe tabs render as plain views in tests; gestures and slide animations need the native runtime.
jest.mock("react-native-reanimated", () => { const { View } = require("react-native"); const slide = { duration: () => slide }; const { Text } = require("react-native"); const value = (v) => v; return { __esModule: true, default: { View, Text, createAnimatedComponent: (c) => c }, FadeIn: slide, FadeOut: slide, SlideInLeft: slide, SlideInRight: slide, SlideInDown: slide, FadeInDown: { duration: () => ({ delay: () => slide }) }, createAnimatedComponent: (c) => c, useSharedValue: (v) => ({ value: v }), useAnimatedStyle: () => ({}), withTiming: value, withSpring: value, withDelay: (_, v) => v, withSequence: (...v) => v[v.length - 1] }; });
jest.mock("expo-haptics", () => ({ impactAsync: async () => undefined, ImpactFeedbackStyle: { Light: "light", Medium: "medium" } }));
jest.mock("react-native-gesture-handler", () => ({ GestureDetector: ({ children }) => children, usePanGesture: () => ({}), GestureHandlerRootView: ({ children }) => children }));
