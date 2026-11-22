import React from 'react';
import { MatchScore, Team } from '../../types';

interface TotalScoreboardProps {
  team1: Team | null;
  team2: Team | null;
  score: MatchScore;
}

export const TotalScoreboard: React.FC<TotalScoreboardProps> = ({ team1, team2, score }) => {
  return (
    <div className="w-full flex items-center justify-center gap-3 py-2 select-none">
      {/* Team 1: 3-Letter Abbr + Logo */}
      <div className="flex items-center gap-2">
        <span className="font-display font-black text-base tracking-wider text-slate-900 uppercase">
          {team1?.shortName || 'T1'}
        </span>
        <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
          {team1 && (
            <img
              src={team1.logoUrl}
              alt={team1.name}
              className="w-full h-full object-contain"
            />
          )}
        </div>
      </div>

      {/* Score Digits in Clean Rounded Cards */}
      <div className="flex items-center gap-1.5">
        <div className="w-10 h-10 flex items-center justify-center bg-white border border-slate-300 rounded-xl font-display font-black text-2xl text-slate-900">
          {score.team1Total}
        </div>
        <div className="w-10 h-10 flex items-center justify-center bg-white border border-slate-300 rounded-xl font-display font-black text-2xl text-slate-900">
          {score.team2Total}
        </div>
      </div>

      {/* Team 2: Logo + 3-Letter Abbr */}
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
          {team2 && (
            <img
              src={team2.logoUrl}
              alt={team2.name}
              className="w-full h-full object-contain"
            />
          )}
        </div>
        <span className="font-display font-black text-base tracking-wider text-slate-900 uppercase">
          {team2?.shortName || 'T2'}
        </span>
      </div>
    </div>
  );
};
