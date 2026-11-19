import React from 'react';
import { MatchScore, Team } from '../../types';

interface ResultsTableProps {
  score: MatchScore;
  team1: Team | null;
  team2: Team | null;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({ score, team1, team2 }) => {
  return (
    <div className="w-full bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm mb-4">
      {/* Table Headers */}
      <div className="grid grid-cols-7 text-[10px] font-black tracking-widest text-slate-600 bg-slate-50 py-2 border-b border-slate-300">
        <span className="col-span-2 text-left pl-3 uppercase">TEAM</span>
        <span className="text-center uppercase">Q1</span>
        <span className="text-center uppercase">Q2</span>
        <span className="text-center uppercase">Q3</span>
        <span className="text-center uppercase">Q4</span>
        <span className="text-center uppercase">ET</span>
        <span className="text-center font-black text-slate-900 uppercase">FT</span>
      </div>

      {/* Team 1 Row */}
      <div className="grid grid-cols-7 text-xs font-bold items-center py-2.5 border-b border-slate-200">
        <div className="col-span-2 flex items-center gap-1.5 pl-2">
          <div className="bg-black text-white px-2 py-0.5 rounded flex items-center gap-1.5 shadow-sm">
            <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
              {team1 && <img src={team1.logoUrl} alt="" className="w-full h-full object-contain" />}
            </div>
            <span className="font-display text-[10px] font-black">{team1?.shortName}</span>
          </div>
        </div>
        <span className="text-center font-display text-slate-800 font-bold">{score.team1QuarterScores.q1}</span>
        <span className="text-center font-display text-slate-800 font-bold">{score.team1QuarterScores.q2}</span>
        <span className="text-center font-display text-slate-800 font-bold">{score.team1QuarterScores.q3}</span>
        <span className="text-center font-display text-slate-800 font-bold">{score.team1QuarterScores.q4}</span>
        <span className="text-center font-display text-slate-400 font-bold">{score.isExtraTime ? score.team1QuarterScores.et : '/'}</span>
        <span className="text-center font-display font-black text-slate-900 text-sm">{score.team1Total}</span>
      </div>

      {/* Team 2 Row */}
      <div className="grid grid-cols-7 text-xs font-bold items-center py-2.5">
        <div className="col-span-2 flex items-center gap-1.5 pl-2">
          <div className="bg-black text-white px-2 py-0.5 rounded flex items-center gap-1.5 shadow-sm">
            <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
              {team2 && <img src={team2.logoUrl} alt="" className="w-full h-full object-contain" />}
            </div>
            <span className="font-display text-[10px] font-black">{team2?.shortName}</span>
          </div>
        </div>
        <span className="text-center font-display text-slate-800 font-bold">{score.team2QuarterScores.q1}</span>
        <span className="text-center font-display text-slate-800 font-bold">{score.team2QuarterScores.q2}</span>
        <span className="text-center font-display text-slate-800 font-bold">{score.team2QuarterScores.q3}</span>
        <span className="text-center font-display text-slate-800 font-bold">{score.team2QuarterScores.q4}</span>
        <span className="text-center font-display text-slate-400 font-bold">{score.isExtraTime ? score.team2QuarterScores.et : '/'}</span>
        <span className="text-center font-display font-black text-slate-900 text-sm">{score.team2Total}</span>
      </div>

      {/* Winner Tag */}
      {score.winDescription && (
        <div className="py-2 bg-slate-50 border-t border-slate-200 text-center">
          <span className="font-display text-xs font-black text-emerald-600 tracking-wide uppercase">
            {score.winDescription}
          </span>
        </div>
      )}
    </div>
  );
};
