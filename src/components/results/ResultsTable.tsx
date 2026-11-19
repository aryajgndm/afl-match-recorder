import React from 'react';
import { MatchScore, Team } from '../../types';

interface ResultsTableProps {
  score: MatchScore;
  team1: Team | null;
  team2: Team | null;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({ score, team1, team2 }) => {
  return (
    <div className="w-full max-w-sm mx-auto bg-[#161a23] border border-slate-800 rounded-2xl p-4 shadow-lg mb-4">
      {/* Table Headers */}
      <div className="grid grid-cols-7 text-[10px] font-black tracking-widest text-slate-400 pb-2 border-b border-slate-800/80">
        <span className="col-span-1 text-left pl-1">TEAM</span>
        <span className="text-center">Q1</span>
        <span className="text-center">Q2</span>
        <span className="text-center">Q3</span>
        <span className="text-center">Q4</span>
        <span className="text-center">ET</span>
        <span className="text-center font-bold text-white">FT</span>
      </div>

      {/* Team 1 Row */}
      <div className="grid grid-cols-7 text-xs font-bold items-center py-2.5 border-b border-slate-800/60">
        <div className="col-span-1 flex items-center gap-1.5 pl-1">
          <div className="w-7 h-7 flex items-center justify-center flex-shrink-0 filter drop-shadow-sm">
            {team1 && <img src={team1.logoUrl} alt="" className="w-full h-full object-contain" />}
          </div>
          <span className="font-display text-xs font-black text-white">{team1?.shortName}</span>
        </div>
        <span className="text-center font-display text-slate-300">{score.team1QuarterScores.q1}</span>
        <span className="text-center font-display text-slate-300">{score.team1QuarterScores.q2}</span>
        <span className="text-center font-display text-slate-300">{score.team1QuarterScores.q3}</span>
        <span className="text-center font-display text-slate-300">{score.team1QuarterScores.q4}</span>
        <span className="text-center font-display text-slate-400">{score.isExtraTime ? score.team1QuarterScores.et : '/'}</span>
        <span className="text-center font-display font-black text-emerald-400 text-sm">{score.team1Total}</span>
      </div>

      {/* Team 2 Row */}
      <div className="grid grid-cols-7 text-xs font-bold items-center pt-2.5">
        <div className="col-span-1 flex items-center gap-1.5 pl-1">
          <div className="w-7 h-7 flex items-center justify-center flex-shrink-0 filter drop-shadow-sm">
            {team2 && <img src={team2.logoUrl} alt="" className="w-full h-full object-contain" />}
          </div>
          <span className="font-display text-xs font-black text-white">{team2?.shortName}</span>
        </div>
        <span className="text-center font-display text-slate-300">{score.team2QuarterScores.q1}</span>
        <span className="text-center font-display text-slate-300">{score.team2QuarterScores.q2}</span>
        <span className="text-center font-display text-slate-300">{score.team2QuarterScores.q3}</span>
        <span className="text-center font-display text-slate-300">{score.team2QuarterScores.q4}</span>
        <span className="text-center font-display text-slate-400">{score.isExtraTime ? score.team2QuarterScores.et : '/'}</span>
        <span className="text-center font-display font-black text-emerald-400 text-sm">{score.team2Total}</span>
      </div>

      {/* Winner Tag */}
      {score.winDescription && (
        <div className="mt-3 pt-2 border-t border-slate-800/80 text-center">
          <span className="font-display text-xs font-bold text-emerald-400 tracking-wide">
            {score.winDescription}
          </span>
        </div>
      )}
    </div>
  );
};
