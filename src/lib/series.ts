import { Fixture, Series, SeriesId } from '../types';

/**
 * Formats a series ID into its standardized uppercase display label.
 */
export function formatSeriesLabel(seriesId: SeriesId | string): string {
  if (seriesId.startsWith('po')) {
    return `PLAYOFF ${seriesId.replace('po', '')}`;
  }
  if (seriesId.startsWith('sf')) {
    return `SEMIFINAL ${seriesId.replace('sf', '')}`;
  }
  return 'FINALS';
}

export function calculateSeriesProgress(fixtures: Fixture[]): {
  seriesMap: Record<SeriesId, Series>;
  updatedFixtures: Fixture[];
} {
  // 1. Initialize base series structure
  const seriesMap: Record<SeriesId, Series> = {
    po1: {
      id: 'po1',
      phase: 'playoffs',
      name: 'PLAYOFF 1',
      team1Id: 'panthers',
      team2Id: 'bulls',
      bestOf: 5,
      winsRequired: 3,
      team1Wins: 0,
      team2Wins: 0,
      winnerId: null,
      isClinched: false,
    },
    po2: {
      id: 'po2',
      phase: 'playoffs',
      name: 'PLAYOFF 2',
      team1Id: 'grizzlies',
      team2Id: 'stallions',
      bestOf: 5,
      winsRequired: 3,
      team1Wins: 0,
      team2Wins: 0,
      winnerId: null,
      isClinched: false,
    },
    sf1: {
      id: 'sf1',
      phase: 'semifinals',
      name: 'SEMIFINAL 1',
      team1Id: 'falcons',
      team2Id: null, // Winner PO1
      bestOf: 5,
      winsRequired: 3,
      team1Wins: 0,
      team2Wins: 0,
      winnerId: null,
      isClinched: false,
    },
    sf2: {
      id: 'sf2',
      phase: 'semifinals',
      name: 'SEMIFINAL 2',
      team1Id: 'raptors',
      team2Id: null, // Winner PO2
      bestOf: 5,
      winsRequired: 3,
      team1Wins: 0,
      team2Wins: 0,
      winnerId: null,
      isClinched: false,
    },
    finals: {
      id: 'finals',
      phase: 'finals',
      name: 'FINALS',
      team1Id: null, // Winner SF1
      team2Id: null, // Winner SF2
      bestOf: 5,
      winsRequired: 3,
      team1Wins: 0,
      team2Wins: 0,
      winnerId: null,
      isClinched: false,
    },
  };

  // 2. Count wins for completed matches
  for (const f of fixtures) {
    if (f.status === 'completed' && f.result?.score.winnerTeamId) {
      const s = seriesMap[f.seriesId];
      if (!s) continue;
      const winner = f.result.score.winnerTeamId;
      if (winner === s.team1Id) {
        s.team1Wins += 1;
      } else if (winner === s.team2Id) {
        s.team2Wins += 1;
      }
    }
  }

  // 3. Determine clinches for Playoffs
  for (const sId of ['po1', 'po2'] as SeriesId[]) {
    const s = seriesMap[sId];
    if (s.team1Wins >= s.winsRequired) {
      s.winnerId = s.team1Id;
      s.isClinched = true;
    } else if (s.team2Wins >= s.winsRequired) {
      s.winnerId = s.team2Id;
      s.isClinched = true;
    }
  }

  // 4. Advance bracket to Semifinals
  if (seriesMap.po1.winnerId) {
    seriesMap.sf1.team2Id = seriesMap.po1.winnerId;
  }
  if (seriesMap.po2.winnerId) {
    seriesMap.sf2.team2Id = seriesMap.po2.winnerId;
  }

  // Count wins for Semifinals if completed matches exist
  for (const sId of ['sf1', 'sf2'] as SeriesId[]) {
    const s = seriesMap[sId];
    if (s.team1Wins >= s.winsRequired) {
      s.winnerId = s.team1Id;
      s.isClinched = true;
    } else if (s.team2Wins >= s.winsRequired) {
      s.winnerId = s.team2Id;
      s.isClinched = true;
    }
  }

  // 5. Advance bracket to Finals
  if (seriesMap.sf1.winnerId) {
    seriesMap.finals.team1Id = seriesMap.sf1.winnerId;
  }
  if (seriesMap.sf2.winnerId) {
    seriesMap.finals.team2Id = seriesMap.sf2.winnerId;
  }

  if (seriesMap.finals.team1Wins >= seriesMap.finals.winsRequired) {
    seriesMap.finals.winnerId = seriesMap.finals.team1Id;
    seriesMap.finals.isClinched = true;
  } else if (seriesMap.finals.team2Wins >= seriesMap.finals.winsRequired) {
    seriesMap.finals.winnerId = seriesMap.finals.team2Id;
    seriesMap.finals.isClinched = true;
  }

  // 6. Update conditional fixtures and team names for future rounds
  const updatedFixtures = fixtures.map((f) => {
    const copy = { ...f };
    const s = seriesMap[copy.seriesId];

    // Propagate team IDs to dependent fixtures
    if (!copy.team1Id && s.team1Id) {
      copy.team1Id = s.team1Id;
    }
    if (!copy.team2Id && s.team2Id) {
      copy.team2Id = s.team2Id;
    }

    // If fixture is already completed or in_progress, don't change status
    if (copy.status === 'completed' || copy.status === 'in_progress') {
      return copy;
    }

    // Phase Progression Guard:
    // Semifinals can only become available once ALL playoff series are clinched
    const playoffsCompleted = seriesMap.po1.isClinched && seriesMap.po2.isClinched;
    if (copy.phase === 'semifinals' && !playoffsCompleted) {
      copy.status = 'locked';
      return copy;
    }

    // Finals can only become available once ALL semifinal series are clinched
    const semifinalsCompleted = seriesMap.sf1.isClinched && seriesMap.sf2.isClinched;
    if (copy.phase === 'finals' && !semifinalsCompleted) {
      copy.status = 'locked';
      return copy;
    }

    // If series is already clinched
    if (s.isClinched) {
      if (copy.gameNumber > (s.team1Wins + s.team2Wins)) {
        copy.status = 'not_required';
        return copy;
      }
    }

    // Determine conditional Game 4 & Game 5 requirements
    const gamesPlayed = s.team1Wins + s.team2Wins;

    if (copy.gameNumber === 4) {
      if (gamesPlayed < 3) {
        copy.status = 'locked';
      } else if (s.isClinched) {
        copy.status = 'not_required';
      } else {
        // Series undecided after Game 3 -> Game 4 becomes eligible
        copy.status = 'available';
      }
    } else if (copy.gameNumber === 5) {
      if (gamesPlayed < 4) {
        copy.status = 'locked';
      } else if (s.isClinched) {
        copy.status = 'not_required';
      } else {
        // Series undecided after Game 4 -> Game 5 becomes eligible
        copy.status = 'available';
      }
    } else if (copy.gameNumber <= 3) {
      // Check if previous game in same series is completed
      if (copy.gameNumber === 1) {
        // Available if both teams known
        copy.status = copy.team1Id && copy.team2Id ? 'available' : 'locked';
      } else {
        const prevGame = fixtures.find(
          (p) => p.seriesId === copy.seriesId && p.gameNumber === copy.gameNumber - 1
        );
        if (prevGame?.status === 'completed' && copy.team1Id && copy.team2Id) {
          copy.status = 'available';
        } else {
          copy.status = 'locked';
        }
      }
    }

    return copy;
  });

  // 7. Only allow the single next chronological match to be recorded
  const hasInProgress = updatedFixtures.some((f) => f.status === 'in_progress');
  const availableChronological = updatedFixtures
    .filter((f) => f.status === 'available')
    .sort((a, b) => {
      const timeA = Date.parse(a.date) || 0;
      const timeB = Date.parse(b.date) || 0;
      if (timeA !== timeB) return timeA - timeB;
      return a.gameNumber - b.gameNumber;
    });

  const nextAvailableId =
    !hasInProgress && availableChronological.length > 0
      ? availableChronological[0].id
      : null;

  const finalFixtures = updatedFixtures.map((f) => {
    if (f.status === 'available' && f.id !== nextAvailableId) {
      return { ...f, status: 'locked' as const };
    }
    return f;
  });

  return { seriesMap, updatedFixtures: finalFixtures };
}
