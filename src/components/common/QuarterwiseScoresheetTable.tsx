import React from 'react';
import { MatchScore, Team } from '../../types';

interface QuarterwiseScoresheetTableProps {
  score: MatchScore;
  team1: Team | null;
  team2: Team | null;
}

export const QuarterwiseScoresheetTable: React.FC<QuarterwiseScoresheetTableProps> = ({
  score,
  team1,
  team2,
}) => {
  return (
    <div className="w-full max-w-sm mx-auto select-none">
      <table className="w-full border-collapse border border-slate-300 rounded-lg overflow-hidden shadow-xs">
        {/* Table Header: Column headers directly above each score column */}
        <thead>
          <tr className="bg-transparent">
            {/* Empty header above Team column */}
            <th className="w-[84px] py-1"></th>
            <th className="w-9 py-1 text-center font-display font-black text-xs text-slate-800 uppercase tracking-wider">
              Q1
            </th>
            <th className="w-9 py-1 text-center font-display font-black text-xs text-slate-800 uppercase tracking-wider">
              Q2
            </th>
            <th className="w-9 py-1 text-center font-display font-black text-xs text-slate-800 uppercase tracking-wider">
              Q3
            </th>
            <th className="w-9 py-1 text-center font-display font-black text-xs text-slate-800 uppercase tracking-wider">
              Q4
            </th>
            <th className="w-9 py-1 text-center font-display font-black text-xs text-slate-800 uppercase tracking-wider">
              ET
            </th>
            <th className="w-11 py-1 text-center font-display font-black text-xs text-slate-900 uppercase tracking-wider">
              FT
            </th>
          </tr>
        </thead>

        {/* Table Body */}
        <tbody>
          {/* Team 1 Row */}
          <tr>
            {/* Team 1 Badge Cell: Solid Black with logo + 3-letter abbreviation */}
            <td className="bg-black text-white px-2 py-2.5 border border-black">
              <div className="flex items-center justify-center gap-1.5">
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 filter drop-shadow-sm">
                  {team1 && (
                    <img
                      src={team1.logoUrl}
                      alt=""
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
                <span className="font-display font-black text-xs tracking-wider uppercase text-white">
                  {team1?.shortName || 'T1'}
                </span>
              </div>
            </td>

            {/* Q1 */}
            <td className="bg-white border border-slate-300 text-center font-display font-black text-base text-slate-900 py-2">
              {score.team1QuarterScores.q1}
            </td>
            {/* Q2 */}
            <td className="bg-white border border-slate-300 text-center font-display font-black text-base text-slate-900 py-2">
              {score.team1QuarterScores.q2}
            </td>
            {/* Q3 */}
            <td className="bg-white border border-slate-300 text-center font-display font-black text-base text-slate-900 py-2">
              {score.team1QuarterScores.q3}
            </td>
            {/* Q4 */}
            <td className="bg-white border border-slate-300 text-center font-display font-black text-base text-slate-900 py-2">
              {score.team1QuarterScores.q4}
            </td>
            {/* ET */}
            <td className="bg-white border border-slate-300 text-center font-display font-black text-base text-slate-400 py-2">
              {score.isExtraTime ? score.team1QuarterScores.et : '/'}
            </td>
            {/* FT (Prominent Total Score) */}
            <td className="bg-white border border-slate-300 text-center font-display font-black text-lg text-slate-900 py-2">
              {score.team1Total}
            </td>
          </tr>

          {/* Team 2 Row */}
          <tr>
            {/* Team 2 Badge Cell: Solid Black with logo + 3-letter abbreviation */}
            <td className="bg-black text-white px-2 py-2.5 border border-black">
              <div className="flex items-center justify-center gap-1.5">
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 filter drop-shadow-sm">
                  {team2 && (
                    <img
                      src={team2.logoUrl}
                      alt=""
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
                <span className="font-display font-black text-xs tracking-wider uppercase text-white">
                  {team2?.shortName || 'T2'}
                </span>
              </div>
            </td>

            {/* Q1 */}
            <td className="bg-white border border-slate-300 text-center font-display font-black text-base text-slate-900 py-2">
              {score.team2QuarterScores.q1}
            </td>
            {/* Q2 */}
            <td className="bg-white border border-slate-300 text-center font-display font-black text-base text-slate-900 py-2">
              {score.team2QuarterScores.q2}
            </td>
            {/* Q3 */}
            <td className="bg-white border border-slate-300 text-center font-display font-black text-base text-slate-900 py-2">
              {score.team2QuarterScores.q3}
            </td>
            {/* Q4 */}
            <td className="bg-white border border-slate-300 text-center font-display font-black text-base text-slate-900 py-2">
              {score.team2QuarterScores.q4}
            </td>
            {/* ET */}
            <td className="bg-white border border-slate-300 text-center font-display font-black text-base text-slate-400 py-2">
              {score.isExtraTime ? score.team2QuarterScores.et : '/'}
            </td>
            {/* FT (Prominent Total Score) */}
            <td className="bg-white border border-slate-300 text-center font-display font-black text-lg text-slate-900 py-2">
              {score.team2Total}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
