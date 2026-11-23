import React from 'react';
import { MatchScore, Team } from '../../types';

interface QuarterwiseScoresheetTableProps {
  score: MatchScore;
  team1: Team | null;
  team2: Team | null;
  theme?: 'dark' | 'light';
}

export const QuarterwiseScoresheetTable: React.FC<QuarterwiseScoresheetTableProps> = ({
  score,
  team1,
  team2,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';

  return (
    <div className="w-full max-w-sm mx-auto select-none font-sans">
      {/* Column Headers above the table box: Q1, Q2, Q3, Q4, ET, FT */}
      <div className="grid grid-cols-[88px_repeat(5,_1fr)_48px] text-center mb-1.5 px-0">
        <div>{/* Empty space above team column */}</div>
        <div className={`font-sans font-bold text-xs uppercase tracking-wide ${isDark ? 'text-neutral-400' : 'text-slate-700'}`}>Q1</div>
        <div className={`font-sans font-bold text-xs uppercase tracking-wide ${isDark ? 'text-neutral-400' : 'text-slate-700'}`}>Q2</div>
        <div className={`font-sans font-bold text-xs uppercase tracking-wide ${isDark ? 'text-neutral-400' : 'text-slate-700'}`}>Q3</div>
        <div className={`font-sans font-bold text-xs uppercase tracking-wide ${isDark ? 'text-neutral-400' : 'text-slate-700'}`}>Q4</div>
        <div className={`font-sans font-bold text-xs uppercase tracking-wide ${isDark ? 'text-neutral-400' : 'text-slate-700'}`}>ET</div>
        <div className={`font-sans font-bold text-xs uppercase tracking-wide ${isDark ? 'text-white' : 'text-slate-900'}`}>FT</div>
      </div>

      {/* Main Table Box: Perfect rounded-xl container with crisp border on all 4 sides */}
      <div className={`border rounded-xl overflow-hidden ${isDark ? 'border-[#333333] bg-[#242424]' : 'border-slate-300 bg-white'}`}>
        {/* Team 1 Row */}
        <div className={`grid grid-cols-[88px_repeat(5,_1fr)_48px] border-b items-stretch ${isDark ? 'border-[#333333]' : 'border-slate-300'}`}>
          {/* Team 1 Cell: Solid Black with logo + 3-letter abbreviation */}
          <div className={`bg-black text-white px-2.5 py-2 flex items-center justify-center gap-1.5 border-r ${isDark ? 'border-[#333333]' : 'border-slate-300'}`}>
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              {team1 && (
                <img
                  src={team1.logoUrl}
                  alt=""
                  className="w-full h-full object-contain"
                />
              )}
            </div>
            <span className="font-sans font-bold text-xs tracking-wider uppercase text-white">
              {team1?.shortName || 'T1'}
            </span>
          </div>

          {/* Numbers in Bricolage Grotesque fontface as requested */}
          <div className={`flex items-center justify-center border-r font-sans font-bold text-base py-2 ${isDark ? 'border-[#333333] text-white' : 'border-slate-300 text-slate-900'}`}>
            {score.team1QuarterScores.q1}
          </div>
          <div className={`flex items-center justify-center border-r font-sans font-bold text-base py-2 ${isDark ? 'border-[#333333] text-white' : 'border-slate-300 text-slate-900'}`}>
            {score.team1QuarterScores.q2}
          </div>
          <div className={`flex items-center justify-center border-r font-sans font-bold text-base py-2 ${isDark ? 'border-[#333333] text-white' : 'border-slate-300 text-slate-900'}`}>
            {score.team1QuarterScores.q3}
          </div>
          <div className={`flex items-center justify-center border-r font-sans font-bold text-base py-2 ${isDark ? 'border-[#333333] text-white' : 'border-slate-300 text-slate-900'}`}>
            {score.team1QuarterScores.q4}
          </div>
          <div className={`flex items-center justify-center border-r font-sans font-bold text-base py-2 ${isDark ? 'border-[#333333] text-neutral-500' : 'border-slate-300 text-slate-400'}`}>
            {score.isExtraTime ? score.team1QuarterScores.et : '/'}
          </div>
          <div className={`flex items-center justify-center font-sans font-extrabold text-lg py-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {score.team1Total}
          </div>
        </div>

        {/* Team 2 Row */}
        <div className="grid grid-cols-[88px_repeat(5,_1fr)_48px] items-stretch">
          {/* Team 2 Cell: Solid Black with logo + 3-letter abbreviation */}
          <div className={`bg-black text-white px-2.5 py-2 flex items-center justify-center gap-1.5 border-r ${isDark ? 'border-[#333333]' : 'border-slate-300'}`}>
            <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
              {team2 && (
                <img
                  src={team2.logoUrl}
                  alt=""
                  className="w-full h-full object-contain"
                />
              )}
            </div>
            <span className="font-sans font-bold text-xs tracking-wider uppercase text-white">
              {team2?.shortName || 'T2'}
            </span>
          </div>

          {/* Numbers in Bricolage Grotesque fontface as requested */}
          <div className={`flex items-center justify-center border-r font-sans font-bold text-base py-2 ${isDark ? 'border-[#333333] text-white' : 'border-slate-300 text-slate-900'}`}>
            {score.team2QuarterScores.q1}
          </div>
          <div className={`flex items-center justify-center border-r font-sans font-bold text-base py-2 ${isDark ? 'border-[#333333] text-white' : 'border-slate-300 text-slate-900'}`}>
            {score.team2QuarterScores.q2}
          </div>
          <div className={`flex items-center justify-center border-r font-sans font-bold text-base py-2 ${isDark ? 'border-[#333333] text-white' : 'border-slate-300 text-slate-900'}`}>
            {score.team2QuarterScores.q3}
          </div>
          <div className={`flex items-center justify-center border-r font-sans font-bold text-base py-2 ${isDark ? 'border-[#333333] text-white' : 'border-slate-300 text-slate-900'}`}>
            {score.team2QuarterScores.q4}
          </div>
          <div className={`flex items-center justify-center border-r font-sans font-bold text-base py-2 ${isDark ? 'border-[#333333] text-neutral-500' : 'border-slate-300 text-slate-400'}`}>
            {score.isExtraTime ? score.team2QuarterScores.et : '/'}
          </div>
          <div className={`flex items-center justify-center font-sans font-extrabold text-lg py-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {score.team2Total}
          </div>
        </div>
      </div>
    </div>
  );
};
