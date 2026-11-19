import React from 'react';
import { MatchScore, Team } from '../../types';

interface TotalScoreboardProps {
  team1: Team | null;
  team2: Team | null;
  score: MatchScore;
}

export const TotalScoreboard: React.FC<TotalScoreboardProps> = ({ team1, team2, score }) => {
  return (
    <div className="w-full max-w-sm mx-auto my-3 bg-[#131722] border border-slate-800/80 rounded-3xl p-4 shadow-xl">
      <div className="text-[10px] font-black tracking-widest text-slate-400 uppercase text-center mb-2">
        MATCH SCORE • TOTAL
      </div>

      <div className="flex items-center justify-between px-2">
        {/* Team 1 */}
        <div className="flex items-center gap-2.5 flex-1 justify-end pr-2">
          <span className="font-display font-black text-sm tracking-wide text-white uppercase text-right truncate">
            {team1?.name}
          </span>
          <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center flex-shrink-0 filter drop-shadow-md">
            {team1 && (
              <img
                src={team1.logoUrl}
                alt={team1.name}
                className="w-full h-full object-contain"
              />
            )}
          </div>
        </div>

        {/* Big Center Score in MuseoModerno */}
        <div className="flex items-center gap-2 px-3 py-1 bg-[#1a202e] rounded-2xl border border-slate-700/60 shadow-inner flex-shrink-0">
          <span className="font-display font-black text-2xl sm:text-3xl text-white tracking-wider w-7 text-center">
            {score.team1Total}
          </span>
          <span className="text-slate-500 font-bold text-base select-none">:</span>
          <span className="font-display font-black text-2xl sm:text-3xl text-white tracking-wider w-7 text-center">
            {score.team2Total}
          </span>
        </div>

        {/* Team 2 */}
        <div className="flex items-center gap-2.5 flex-1 justify-start pl-2">
          <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center flex-shrink-0 filter drop-shadow-md">
            {team2 && (
              <img
                src={team2.logoUrl}
                alt={team2.name}
                className="w-full h-full object-contain"
              />
            )}
          </div>
          <span className="font-display font-black text-sm tracking-wide text-white uppercase text-left truncate">
            {team2?.name}
          </span>
        </div>
      </div>
    </div>
  );
};
