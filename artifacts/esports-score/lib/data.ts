export type Game = "Valorant" | "CS2" | "League of Legends";
export type MatchStatus = "Live" | "Upcoming" | "Finished" | "Cancelled" | "Postponed";

export type Team = {
  id: string;
  name: string;
  short: string;
  color: string;
  game: Game;
  logoUrl?: string;
  country?: string;
};

export type Match = {
  id: string;
  startTime?: string;
  scheduledTime?: string;
  game: Game;
  tournament: string;
  competitionId?: string;
  competitionName?: string;
  stage?: string;
  time: string;
  status: MatchStatus;
  teamA: Team;
  teamB: Team;
  scoreA?: number;
  scoreB?: number;
  format?: "BO1" | "BO3" | "BO5";
  detail: string;
  competitionLogoUrl?: string;
  streams?: { url: string; language?: string; official?: boolean }[];
  games?: MatchGame[];
};

// One map of a series: its number, state, winner (team id), start and length in minutes.
export type MatchGame = { number: number; status: "scheduled" | "live" | "finished"; winnerId?: string; startTime?: string; minutes?: number; mapName?: string; homeRounds?: number; awayRounds?: number };
