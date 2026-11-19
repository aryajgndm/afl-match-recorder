import React from 'react';
import { Fixture } from '../../types';
import { ArrowRight, ChevronLeft } from 'lucide-react';

interface MatchHeaderProps {
  fixture: Fixture;
  canSubmit: boolean;
  onSubmitClick: () => void;
  onBackClick: () => void;
}

export const MatchHeader: React.FC<MatchHeaderProps> = ({
  fixture,
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
    <header className="sticky top-0 z-40 bg-[#0e1117]/95 backdrop-blur-md border-b border-slate-800/80 px-4 py-3.5">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Left: Back button & Match ID with ample space */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBackClick}
            className="p-1.5 -ml-1 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            title="Back to Dashboard"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex flex-col">
            <span className="font-display font-black text-xs tracking-wider text-slate-200 uppercase">
              GAME {fixture.gameNumber} • {seriesNameFormatted}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {fixture.date}
            </span>
          </div>
        </div>

        {/* Right: Submit Button */}
        <div>
          {canSubmit ? (
            <button
              onClick={onSubmitClick}
              className="px-4 py-2 bg-[#BE2041] hover:bg-[#a81938] active:scale-95 transition-all text-white rounded-full font-black text-xs tracking-wider flex items-center gap-1.5 shadow-md shadow-[#BE2041]/30 uppercase font-sans"
            >
              <span>SUBMIT</span>
              <ArrowRight size={14} className="stroke-[3]" />
            </button>
          ) : (
            <button
              disabled
              className="px-3.5 py-1.5 bg-slate-800/60 text-slate-500 rounded-full font-bold text-xs tracking-wider flex items-center gap-1 cursor-not-allowed uppercase font-sans"
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
