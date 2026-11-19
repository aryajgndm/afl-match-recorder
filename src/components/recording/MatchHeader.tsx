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
    ? `Playoff ${fixture.seriesId.replace('po', '')}`
    : fixture.seriesId.startsWith('sf')
    ? `Semi-Final ${fixture.seriesId.replace('sf', '')}`
    : 'Finals';

  return (
    <header className="w-full max-w-md mx-auto pt-3 pb-1 px-4 flex items-center justify-between">
      {/* Back button */}
      <button
        onClick={onBackClick}
        className="p-1 -ml-1 text-slate-400 hover:text-slate-900 rounded-lg transition-colors"
        title="Back to Dashboard"
      >
        <ChevronLeft size={24} />
      </button>

      {/* Centered Match ID - informational line: Bricolage Grotesque, Title Case */}
      <div className="flex flex-col items-center">
        <span className="font-sans font-bold text-xs tracking-wide text-slate-500">
          Game {fixture.gameNumber} · {seriesNameFormatted}
        </span>
      </div>

      {/* Spacer to keep center alignment */}
      <div className="w-8" />
    </header>
  );
};
