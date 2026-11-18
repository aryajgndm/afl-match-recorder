export type TeamId = 'panthers' | 'bulls' | 'grizzlies' | 'stallions' | 'falcons' | 'raptors';

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logoUrl: string;
}

export interface Player {
  id: string;
  fullName: string;
  name: string; // short name
  teamId: string;
}

export type PostseasonPhase = 'playoffs' | 'semifinals' | 'finals';

export type SeriesId = 'po1' | 'po2' | 'sf1' | 'sf2' | 'finals';

export type Quarter = 'q1' | 'q2' | 'q3' | 'q4' | 'et';

export type GoalType = 'regular' | 'penalty' | 'own_goal';

export type CardType = 'yellow' | 'red';

export interface MatchEvent {
  id: string;
  matchId: string;
  quarter: Quarter;
  minute: number;
  type: 'goal' | 'card';
  goalType?: GoalType;
  cardType?: CardType;
  teamId: string; // team credited with the goal, or team of carded player
  playerId: string; // scorer, carded player, or player causing own goal
  assisterId?: string | null;
  concedingTeamId?: string; // in own goal, the team the player belongs to
  isSecondYellowRed?: boolean; // true if this red card was automatically created from a 2nd yellow
  createdAt: string;
}

export type MatchStatus =
  | 'available'      // Start Recording
  | 'in_progress'    // Recording underway
  | 'completed'      // View Results
  | 'locked'         // Not yet required / awaiting previous games
  | 'not_required';  // Series already clinched

export interface MatchScore {
  team1QuarterScores: Record<Quarter, number>;
  team2QuarterScores: Record<Quarter, number>;
  team1Total: number;
  team2Total: number;
  isExtraTime: boolean;
  winnerTeamId: string | null;
  winDescription: string;
}

export interface MatchResult {
  matchId: string;
  score: MatchScore;
  completedAt: string;
  submittedBySession?: string;
}

export interface Fixture {
  id: string;
  seriesId: SeriesId;
  gameNumber: number;
  date: string;
  phase: PostseasonPhase;
  team1Id: string | null;
  team2Id: string | null;
  status: MatchStatus;
  isConditional: boolean;
  passcode: string;
  activeSessionId?: string | null;
  lockHeartbeatAt?: string | null;
  submittedAt?: string | null;
  result?: MatchResult | null;
}

export interface Series {
  id: SeriesId;
  phase: PostseasonPhase;
  name: string;
  team1Id: string | null;
  team2Id: string | null;
  bestOf: number;
  winsRequired: number;
  team1Wins: number;
  team2Wins: number;
  winnerId: string | null;
  isClinched: boolean;
}
