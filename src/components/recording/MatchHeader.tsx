import React from 'react';
import { Fixture } from '../../types';
import { ChevronLeft } from 'lucide-react';

interface MatchHeaderProps {
  fixture: Fixture;
  onBackClick: () => void;
}

export const MatchHeader: React.FC<MatchHeaderProps> = ({
  fixture,
  onBackClick,
}) => {
  const seriesNameFormatted = fixture.seriesId.startsWith('po')
    ? `PLAYOFF ${fixture.seriesId.replace('po', '')}`
    : fixture.seriesId.startsWith('sf')
    ? `SEMI-FINAL ${fixture.seriesId.replace('sf', '')}`
    : 'FINALS';

  return (
    <header className="w-full max-w-md mx-auto pt-3 pb-1 px-4 flex items-center justify-between">
      {/* Back button */}
      <button
        onClick={onBackClick}
        className="p-1 -ml-1 text-slate-400 hover:text-slate-900 rounded-lg transition-colors"
        title="BACK TO DASHBOARD"
      >
        <ChevronLeft size={24} />
      </button>

      {/* Centered Match ID */}
      <div className="flex flex-col items-center">
        <span className="font-display font-black text-xs tracking-wider text-slate-500 uppercase">
          GAME {fixture.gameNumber} • {seriesNameFormatted}
        </span>
      </div>

      {/* Spacer to keep center alignment */}
      <div className="w-8" />
    </header>
  );
};
