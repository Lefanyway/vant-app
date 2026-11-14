import type { Match } from "@/lib/data";
import { currentStreak, grade, isValidScore, winsNeeded } from "@/lib/picks";

jest.mock("@/lib/supabase", () => ({ supabase: {} }));

const match = (id: string, scoreA: number, scoreB: number, day: number): Match => ({ id, status: "Finished", scoreA, scoreB, startTime: `2026-11-${String(day).padStart(2, "0")}T12:00:00Z`, teamA: { id: "loud", name: "LOUD" }, teamB: { id: "furia", name: "FURIA" }, game: "Valorant", tournament: "VCT", time: "", detail: "" } as Match);

test("grades winner, exact score and misses", () => {
  expect(grade({ matchId: "1", teamId: "loud", homeScore: null, awayScore: null, match: match("1", 2, 1, 1) })).toMatchObject({ state: "hit", points: 10 });
  expect(grade({ matchId: "2", teamId: "loud", homeScore: 2, awayScore: 1, match: match("2", 2, 1, 2) })).toMatchObject({ state: "exact", points: 25 });
  expect(grade({ matchId: "3", teamId: "furia", homeScore: null, awayScore: null, match: match("3", 2, 0, 3) })).toMatchObject({ state: "miss", points: 0 });
});

test("streak counts right picks back from the latest result", () => {
  const picks = [["1", "furia", 1], ["2", "loud", 2], ["3", "loud", 3]].map(([id, team, day]) => grade({ matchId: id as string, teamId: team as string, homeScore: null, awayScore: null, match: match(id as string, 2, 0, day as number) }));
  expect(currentStreak(picks)).toBe(2);
});

test("a bolão score is complete when exactly one side reached the maps needed", () => {
  expect(winsNeeded("BO5")).toBe(3);
  expect(isValidScore("BO3", 2, 1)).toBe(true);
  expect(isValidScore("BO3", 1, 1)).toBe(false);
  expect(isValidScore("BO1", 0, 1)).toBe(true);
  expect(isValidScore("BO5", 3, 3)).toBe(false);
});
