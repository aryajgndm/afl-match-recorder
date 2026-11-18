import React from 'react';
import { Quarter, Team } from '../../types';

interface QuarterScoreboardProps {
  quarter: Quarter;
  team1: Team | null;
  team2: Team | null;
  team1QuarterScore: number;
  team2QuarterScore: number;
}

export const QuarterScoreboard: React.FC<QuarterScoreboardProps> = ({
  quarter,
  team1,
  team2,
  team1QuarterScore,
  team2QuarterScore,
}) => {
  const quarterTitle =
    quarter === 'et' ? 'EXTRA TIME' : `QUARTER ${quarter.replace('q', '')}`;

  return (
    <div className="flex flex-col items-center justify-center pt-2 pb-3 px-4">
      {/* Large Title */}
      <h2 className="text-xl font-black tracking-tight text-white mb-2 uppercase">
        {quarterTitle}
      </h2>

      {/* Mini Scoreboard Pill: [logo] PANTHERS 4 3 BULLS [logo] */}
      <div className="w-full max-w-sm bg-[#161a23] border border-slate-800 rounded-2xl py-2 px-4 flex items-center justify-between shadow-md">
        {/* Team 1 */}
        <div className="flex items-center gap-2 flex-1">
          <div className="w-6 h-6 rounded-md bg-slate-900 p-0.5 flex items-center justify-center border border-slate-800">
            {team1 && (
              <img
                src={team1.logoUrl}
                alt={team1.name}
                className="w-full h-full object-contain rounded"
              />
            )}
          </div>
          <span className="font-extrabold text-xs tracking-wider text-slate-200 uppercase truncate">
            {team1?.name}
          </span>
        </div>

        {/* Scores */}
        <div className="flex items-center gap-3 px-3 font-black text-base text-white">
          <span className="w-5 text-center">{team1QuarterScore}</span>
          <span className="text-slate-600 font-normal">:</span>
          <span className="w-5 text-center">{team2QuarterScore}</span>
        </div>

        {/* Team 2 */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          <span className="font-extrabold text-xs tracking-wider text-slate-200 uppercase truncate text-right">
            {team2?.name}
          </span>
          <div className="w-6 h-6 rounded-md bg-slate-900 p-0.5 flex items-center justify-center border border-slate-800">
            {team2 && (
              <img
                src={team2.logoUrl}
                alt={team2.name}
                className="w-full h-full object-contain rounded"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
