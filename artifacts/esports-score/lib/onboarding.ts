// Per-account flag: the onboarding is shown once, on the first visit.
export const onboardingKey = (userId?: string) => `vant:onboarded:${userId ?? "anon"}`;
