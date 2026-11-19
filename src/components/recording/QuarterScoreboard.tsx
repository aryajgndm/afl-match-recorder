import React from 'react';
import { Quarter, Team } from '../../types';
import { Plus } from 'lucide-react';

interface QuarterScoreboardProps {
  quarter: Quarter;
  team1: Team | null;
  team2: Team | null;
  team1QuarterScore: number;
  team2QuarterScore: number;
  canSubmit?: boolean;
  onSubmitClick?: () => void;
  isReadOnly?: boolean;
}

export const QuarterScoreboard: React.FC<QuarterScoreboardProps> = ({
  quarter,
  team1,
  team2,
  team1QuarterScore,
  team2QuarterScore,
  canSubmit = false,
  onSubmitClick,
  isReadOnly = false,
}) => {
  const quarterTitle =
    quarter === 'et' ? 'EXTRA TIME' : `QUARTER ${quarter.replace('q', '')}`;

  return (
    <div className="w-full flex flex-col gap-2 pt-1 pb-2">
      {/* Quarter Title & Submit Button Header */}
      {isReadOnly || !onSubmitClick ? (
        <div className="flex items-center justify-center py-1">
          <h2 className="font-display text-2xl font-black tracking-tight text-slate-900 uppercase">
            {quarterTitle}
          </h2>
        </div>
      ) : (
        <div className="flex items-center justify-between px-1">
          <h2 className="font-display text-2xl font-black tracking-tight text-slate-900 uppercase">
            {quarterTitle}
          </h2>

          {/* Submit Pill Button: Light gray when disabled, #BE2041 when active */}
          {canSubmit ? (
            <button
              type="button"
              onClick={onSubmitClick}
              className="px-4 py-1.5 bg-[#BE2041] hover:bg-[#a81938] active:scale-95 transition-all text-white rounded-full font-bold text-xs tracking-wider flex items-center gap-1 shadow-md shadow-[#BE2041]/30 uppercase"
            >
              <span>SUBMIT</span>
              <Plus size={15} className="stroke-[3]" />
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="px-4 py-1.5 bg-slate-200 text-slate-400 rounded-full font-bold text-xs tracking-wider flex items-center gap-1 cursor-not-allowed uppercase"
              title="MATCH CAN BE SUBMITTED IN Q4 OR EXTRA TIME"
            >
              <span>SUBMIT</span>
              <Plus size={15} className="stroke-[3]" />
            </button>
          )}
        </div>
      )}

      {/* Mini Scoreboard Black Pill: [logo] PANTHERS 4 3 BULLS [logo] */}
      <div className="w-full bg-black text-white rounded-2xl py-2 px-4 flex items-center justify-between shadow-md">
        {/* Team 1 */}
        <div className="flex items-center gap-2 flex-1 truncate">
          <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 filter drop-shadow-sm">
            {team1 && (
              <img
                src={team1.logoUrl}
                alt={team1.name}
                className="w-full h-full object-contain"
              />
            )}
          </div>
          <span className="font-display font-black text-xs tracking-wider text-white uppercase truncate">
            {team1?.name}
          </span>
        </div>

        {/* Scores */}
        <div className="flex items-center gap-4 px-3 font-display font-black text-lg text-white">
          <span className="w-5 text-center">{team1QuarterScore}</span>
          <span className="w-5 text-center">{team2QuarterScore}</span>
        </div>

        {/* Team 2 */}
        <div className="flex items-center gap-2 flex-1 justify-end truncate">
          <span className="font-display font-black text-xs tracking-wider text-white uppercase truncate text-right">
            {team2?.name}
          </span>
          <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 filter drop-shadow-sm">
            {team2 && (
              <img
                src={team2.logoUrl}
                alt={team2.name}
                className="w-full h-full object-contain"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
