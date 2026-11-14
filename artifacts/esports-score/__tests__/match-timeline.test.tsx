import { render, screen } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MatchTimeline } from "@/components/MatchTimeline";

jest.mock("@/lib/api", () => ({ fetchMatchMaps: () => Promise.resolve([]) }));

const team = (id: string, name: string) => ({ id, name, short: name.slice(0, 3), color: "#fff", game: "Valorant" as const });

test("tells map by map who won, the running series score and the map not needed", () => {
  const match = {
    id: "m", game: "Valorant", tournament: "VCT", time: "", status: "Finished", detail: "", format: "BO3",
    teamA: team("a", "LOUD"), teamB: team("b", "MIBR"), scoreA: 2, scoreB: 0,
    games: [{ number: 1, status: "finished", winnerId: "a", minutes: 55 }, { number: 2, status: "finished", winnerId: "a", minutes: 48 }],
  } as any;
  render(<QueryClientProvider client={new QueryClient()}><MatchTimeline match={match} /></QueryClientProvider>);
  expect(screen.getAllByText("LOUD venceu")).toHaveLength(2);
  expect(screen.getByText("· série 2–0")).toBeTruthy();
  expect(screen.getByText("Não foi necessário")).toBeTruthy();
});

test("hides who won each map while the score is hidden", () => {
  const match = {
    id: "m", game: "Valorant", tournament: "VCT", time: "", status: "Finished", detail: "", format: "BO3",
    teamA: team("a", "LOUD"), teamB: team("b", "MIBR"), scoreA: 2, scoreB: 0,
    games: [{ number: 1, status: "finished", winnerId: "a", mapName: "Bind", homeRounds: 13, awayRounds: 7 }],
  } as any;
  render(<QueryClientProvider client={new QueryClient()}><MatchTimeline match={match} hidden /></QueryClientProvider>);
  expect(screen.queryByText("LOUD venceu")).toBeNull();
  expect(screen.queryByText("13–7")).toBeNull();
  expect(screen.getByText("Mapa 1 · Bind")).toBeTruthy();
});
