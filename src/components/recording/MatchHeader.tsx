import React from 'react';
import { Fixture, MatchScore, Team } from '../../types';
import { ArrowRight, ChevronLeft } from 'lucide-react';

interface MatchHeaderProps {
  fixture: Fixture;
  team1: Team | null;
  team2: Team | null;
  score: MatchScore;
  canSubmit: boolean;
  onSubmitClick: () => void;
  onBackClick: () => void;
}

export const MatchHeader: React.FC<MatchHeaderProps> = ({
  fixture,
  team1,
  team2,
  score,
  canSubmit,
  onSubmitClick,
  onBackClick,
}) => {
  const seriesNameFormatted = fixture.seriesId.startsWith('po')
    ? `PLAYOFF ${fixture.seriesId.replace('po', '')}`
    : fixture.seriesId.startsWith('sf')
    ? `SEMI-FINAL ${fixture.seriesId.replace('sf', '')}`
    : 'FINALS';

  return (
    <header className="sticky top-0 z-40 bg-[#0e1117]/95 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Left: Back button & Match ID */}
        <div className="flex items-center gap-2">
          <button
            onClick={onBackClick}
            className="p-1.5 -ml-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Back to Dashboard"
          >
            <ChevronLeft size={22} />
          </button>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              GAME {fixture.gameNumber} • {seriesNameFormatted}
            </span>
          </div>
        </div>

        {/* Center: Live Match Score PAN [logo] 6 7 [logo] BUL */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-black tracking-wider text-slate-200 uppercase">
            {team1?.shortName || 'T1'}
          </span>
          <div className="w-6 h-6 rounded-md bg-slate-900 p-0.5 flex items-center justify-center border border-slate-800">
            {team1 && (
              <img
                src={team1.logoUrl}
                alt={team1.name}
                className="w-full h-full object-contain rounded"
              />
            )}
          </div>
          <div className="flex items-center gap-1.5 bg-[#161a23] px-2.5 py-1 rounded-lg border border-slate-700/60 font-black text-sm text-white">
            <span>{score.team1Total}</span>
            <span className="text-slate-500 font-normal">:</span>
            <span>{score.team2Total}</span>
          </div>
          <div className="w-6 h-6 rounded-md bg-slate-900 p-0.5 flex items-center justify-center border border-slate-800">
            {team2 && (
              <img
                src={team2.logoUrl}
                alt={team2.name}
                className="w-full h-full object-contain rounded"
              />
            )}
          </div>
          <span className="text-xs font-black tracking-wider text-slate-200 uppercase">
            {team2?.shortName || 'T2'}
          </span>
        </div>

        {/* Right: Submit Button */}
        <div>
          {canSubmit ? (
            <button
              onClick={onSubmitClick}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all text-white rounded-full font-bold text-xs tracking-wider flex items-center gap-1 shadow-md shadow-blue-900/30 uppercase"
            >
              <span>SUBMIT</span>
              <ArrowRight size={13} className="stroke-[3]" />
            </button>
          ) : (
            <button
              disabled
              className="px-3 py-1.5 bg-slate-800/60 text-slate-500 rounded-full font-bold text-xs tracking-wider flex items-center gap-1 cursor-not-allowed uppercase"
              title="Match can be submitted in Q4 or Extra Time"
            >
              <span>SUBMIT</span>
              <span className="text-[10px] text-slate-500">+</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
