import React from 'react';
import { MatchScore, Team } from '../../types';
import { QuarterwiseScoresheetTable } from '../common/QuarterwiseScoresheetTable';

interface ResultsTableProps {
  score: MatchScore;
  team1: Team | null;
  team2: Team | null;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({ score, team1, team2 }) => {
  return (
    <div className="w-full flex flex-col items-center mb-4">
      <QuarterwiseScoresheetTable score={score} team1={team1} team2={team2} />
      {score.winDescription && (
        <div className="mt-2.5 text-center">
          <span className="font-display text-xs font-black text-emerald-600 tracking-wide uppercase">
            {score.winDescription}
          </span>
        </div>
      )}
    </div>
  );
};
