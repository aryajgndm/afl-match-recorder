import React from 'react';
import { Fixture } from '../../types';
import { TEAMS } from '../../data/teams';
import { formatSeriesLabel } from '../../lib/series';
import { Check, ArrowRight, Lock, Radio } from 'lucide-react';

interface MatchCardProps {
  fixture: Fixture;
  onSelect: (fixture: Fixture) => void;
  currentSessionId?: string;
}

export const MatchCard: React.FC<MatchCardProps> = ({
  fixture,
  onSelect,
  currentSessionId,
}) => {
  const team1 = fixture.team1Id ? TEAMS[fixture.team1Id] : null;
  const team2 = fixture.team2Id ? TEAMS[fixture.team2Id] : null;

  const isOwnSession = !!(currentSessionId && fixture.activeSessionId === currentSessionId);
  const isUnopenable =
    fixture.isUnopenable ||
    ['po1-g1', 'po1-g2', 'po1-g3', 'po2-g1', 'po2-g2', 'po2-g3'].includes(fixture.id);

  const seriesNameFormatted = formatSeriesLabel(fixture.seriesId);

  return (
    <div className="w-full bg-[#242424] border border-[#333333] rounded-3xl p-5">
      {/* Top row: Match Identification and Date (GAME and PLAYOFF capital) */}
      <div className="flex items-center justify-between text-xs text-neutral-400 mb-4 tracking-wide font-sans font-bold">
        <span>
          GAME {fixture.gameNumber} · {seriesNameFormatted}
        </span>
        <span className="text-neutral-400 font-medium">{fixture.date}</span>
      </div>

      {/* Middle row: Teams & Logos (MuseoModerno extrabold) */}
      <div className="flex items-center justify-between my-4 px-2">
        {/* Team 1 */}
        <div className="flex items-center gap-3 flex-1 justify-end pr-2">
          <span className="font-display font-extrabold text-sm tracking-wide text-white uppercase text-right">
            {team1?.name || (fixture.seriesId === 'sf1' ? 'FALCONS' : 'TBD')}
          </span>
          <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center flex-shrink-0">
            {team1 ? (
              <img
                src={team1.logoUrl}
                alt={team1.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-xs text-neutral-500 font-bold">?</span>
            )}
          </div>
        </div>

        {/* Center V */}
        <div className="px-3">
          <span className="font-display text-sm font-extrabold text-neutral-500">V</span>
        </div>

        {/* Team 2 */}
        <div className="flex items-center gap-3 flex-1 justify-start pl-2">
          <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center flex-shrink-0">
            {team2 ? (
              <img
                src={team2.logoUrl}
                alt={team2.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-xs text-neutral-500 font-bold">?</span>
            )}
          </div>
          <span className="font-display font-extrabold text-sm tracking-wide text-white uppercase text-left">
            {team2?.name || (fixture.seriesId === 'sf1' ? 'WINNER PO1' : fixture.seriesId === 'sf2' ? 'WINNER PO2' : 'TBD')}
          </span>
        </div>
      </div>

      {/* Bottom Button Action (Darker buttons matching dark theme) */}
      <div className="mt-5">
        {fixture.status === 'completed' && isUnopenable && (
          <div className="w-full py-3.5 bg-[#181818] border border-[#2d2d2d] text-neutral-400 rounded-full font-bold text-xs tracking-wider flex items-center justify-center gap-2 uppercase font-sans cursor-default select-none">
            <Check size={16} className="text-neutral-500 stroke-[2.5]" />
            <span>COMPLETED</span>
          </div>
        )}

        {fixture.status === 'completed' && !isUnopenable && (
          <button
            onClick={() => onSelect(fixture)}
            className="w-full py-3.5 bg-emerald-800 hover:bg-emerald-700 border border-emerald-600/40 active:scale-[0.98] transition-all text-white rounded-full font-bold text-xs tracking-wider flex items-center justify-center gap-2 uppercase font-sans"
          >
            <Check size={16} className="stroke-[3]" />
            <span>VIEW RESULTS</span>
          </button>
        )}

        {/* Start recording button: Darker blue matching dark theme */}
        {fixture.status === 'available' && (
          <button
            onClick={() => onSelect(fixture)}
            className="w-full py-3.5 bg-[#0052cc] hover:bg-[#0047b3] border border-blue-500/30 active:scale-[0.98] transition-all text-white rounded-full font-bold text-xs tracking-wider flex items-center justify-center gap-2 uppercase font-sans"
          >
            <span>START RECORDING</span>
            <ArrowRight size={16} className="stroke-[3]" />
          </button>
        )}

        {fixture.status === 'in_progress' && (
          isOwnSession ? (
            <button
              onClick={() => onSelect(fixture)}
              className="w-full py-3.5 bg-blue-700 hover:bg-blue-600 border border-blue-500/40 active:scale-[0.98] transition-all text-white rounded-full font-bold text-xs tracking-wider flex items-center justify-center gap-2 uppercase font-sans"
            >
              <Radio size={16} />
              <span>RESUME RECORDING</span>
            </button>
          ) : (
            <div
              className="w-full py-3.5 bg-[#181818] border border-amber-900/50 text-amber-400/90 rounded-full font-bold text-xs tracking-wider flex items-center justify-center gap-2 uppercase font-sans cursor-not-allowed select-none"
              title="This match is currently locked and being recorded on another device"
            >
              <Lock size={15} className="text-amber-400/90" />
              <span>RECORDING IN PROGRESS (LOCKED)</span>
            </div>
          )
        )}

        {fixture.status === 'locked' && (
          <button
            disabled
            className="w-full py-3.5 bg-[#181818] border border-[#2e2e2e] text-neutral-600 rounded-full font-bold text-xs tracking-wider flex items-center justify-center gap-2 cursor-not-allowed uppercase font-sans"
          >
            <Lock size={14} />
            <span>{fixture.isConditional ? 'NOT YET REQUIRED' : 'AWAITING PREVIOUS GAME'}</span>
          </button>
        )}

        {fixture.status === 'not_required' && (
          <div className="w-full py-3.5 bg-[#181818] border border-[#2e2e2e] text-neutral-500 rounded-full font-bold text-xs tracking-wider flex items-center justify-center gap-2 uppercase font-sans">
            <span>SERIES CLINCHED (NOT REQUIRED)</span>
          </div>
        )}
      </div>
    </div>
  );
};
