import { MatchEvent, MatchScore, Quarter, Team } from '../types';

export function calculateMatchScore(
  events: MatchEvent[],
  team1: Team | null,
  team2: Team | null
): MatchScore {
  const team1QuarterScores: Record<Quarter, number> = {
    q1: 0,
    q2: 0,
    q3: 0,
    q4: 0,
    et: 0,
  };

  const team2QuarterScores: Record<Quarter, number> = {
    q1: 0,
    q2: 0,
    q3: 0,
    q4: 0,
    et: 0,
  };

  const team1Id = team1?.id;
  const team2Id = team2?.id;

  // Process all goal events
  for (const ev of events) {
    if (ev.type !== 'goal') continue;

    const quarter = ev.quarter;
    if (team1Id && ev.teamId === team1Id) {
      team1QuarterScores[quarter] = (team1QuarterScores[quarter] || 0) + 1;
    } else if (team2Id && ev.teamId === team2Id) {
      team2QuarterScores[quarter] = (team2QuarterScores[quarter] || 0) + 1;
    }
  }

  // Calculate totals
  const team1Regular =
    team1QuarterScores.q1 +
    team1QuarterScores.q2 +
    team1QuarterScores.q3 +
    team1QuarterScores.q4;

  const team2Regular =
    team2QuarterScores.q1 +
    team2QuarterScores.q2 +
    team2QuarterScores.q3 +
    team2QuarterScores.q4;

  const isTiedAtEndQ4 = team1Regular === team2Regular && team1Regular > 0;
  const hasExtraTimeGoals = team1QuarterScores.et > 0 || team2QuarterScores.et > 0;
  const isExtraTime = isTiedAtEndQ4 || hasExtraTimeGoals;

  const team1Total = team1Regular + team1QuarterScores.et;
  const team2Total = team2Regular + team2QuarterScores.et;

  let winnerTeamId: string | null = null;
  let winDescription = '';

  if (team1Id && team2Id) {
    if (team1Total > team2Total) {
      winnerTeamId = team1Id;
      winDescription = isExtraTime
        ? `${team1?.name} win ${team1Total}–${team2Total} in extra time`
        : `${team1?.name} win ${team1Total}–${team2Total}`;
    } else if (team2Total > team1Total) {
      winnerTeamId = team2Id;
      winDescription = isExtraTime
        ? `${team2?.name} win ${team2Total}–${team1Total} in extra time`
        : `${team2?.name} win ${team2Total}–${team1Total}`;
    } else {
      winDescription = `Scores level ${team1Total}–${team2Total}`;
    }
  }

  return {
    team1QuarterScores,
    team2QuarterScores,
    team1Total,
    team2Total,
    isExtraTime,
    winnerTeamId,
    winDescription,
  };
}

/**
 * Extra-time ends when a team achieves a two-goal lead during extra time
 */
export function checkExtraTimeTwoGoalLead(
  team1EtScore: number,
  team2EtScore: number
): { clinched: boolean; winnerLead: number } {
  const diff = team1EtScore - team2EtScore;
  if (Math.abs(diff) >= 2) {
    return { clinched: true, winnerLead: diff };
  }
  return { clinched: false, winnerLead: diff };
}
