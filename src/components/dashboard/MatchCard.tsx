import React from 'react';
import { Fixture } from '../../types';
import { TEAMS } from '../../data/teams';
import { Check, ArrowRight, Lock, Radio } from 'lucide-react';

interface MatchCardProps {
  fixture: Fixture;
  onSelect: (fixture: Fixture) => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({ fixture, onSelect }) => {
  const team1 = fixture.team1Id ? TEAMS[fixture.team1Id] : null;
  const team2 = fixture.team2Id ? TEAMS[fixture.team2Id] : null;

  const seriesNameFormatted = fixture.seriesId.startsWith('po')
    ? `PLAYOFF ${fixture.seriesId.replace('po', '')}`
    : fixture.seriesId.startsWith('sf')
    ? `SEMI-FINAL ${fixture.seriesId.replace('sf', '')}`
    : 'FINALS';

  return (
    <div className="w-full bg-[#141720] border border-slate-800/80 rounded-3xl p-5 shadow-lg transition-all hover:border-slate-700">
      {/* Top row: Match Identification and Date */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-4 tracking-wider uppercase">
        <span>
          GAME {fixture.gameNumber} • {seriesNameFormatted}
        </span>
        <span className="text-slate-400 normal-case">{fixture.date}</span>
      </div>

      {/* Middle row: Teams & Logos */}
      <div className="flex items-center justify-between my-4 px-2">
        {/* Team 1 */}
        <div className="flex items-center gap-3 flex-1 justify-end pr-2">
          <span className="font-extrabold text-sm tracking-wide text-white uppercase text-right">
            {team1?.name || (fixture.seriesId === 'sf1' ? 'Falcons' : 'TBD')}
          </span>
          <div className="w-12 h-12 rounded-xl bg-slate-900/90 p-1.5 flex items-center justify-center border border-slate-800/60 shadow-inner">
            {team1 ? (
              <img
                src={team1.logoUrl}
                alt={team1.name}
                className="w-full h-full object-contain rounded-lg"
              />
            ) : (
              <span className="text-xs text-slate-500 font-bold">?</span>
            )}
          </div>
        </div>

        {/* Center V */}
        <div className="px-3">
          <span className="text-sm font-black text-slate-300">V</span>
        </div>

        {/* Team 2 */}
        <div className="flex items-center gap-3 flex-1 justify-start pl-2">
          <div className="w-12 h-12 rounded-xl bg-slate-900/90 p-1.5 flex items-center justify-center border border-slate-800/60 shadow-inner">
            {team2 ? (
              <img
                src={team2.logoUrl}
                alt={team2.name}
                className="w-full h-full object-contain rounded-lg"
              />
            ) : (
              <span className="text-xs text-slate-500 font-bold">?</span>
            )}
          </div>
          <span className="font-extrabold text-sm tracking-wide text-white uppercase text-left">
            {team2?.name || (fixture.seriesId === 'sf1' ? 'Winner PO1' : fixture.seriesId === 'sf2' ? 'Winner PO2' : 'TBD')}
          </span>
        </div>
      </div>

      {/* Bottom Button Action */}
      <div className="mt-5">
        {fixture.status === 'completed' && (
          <button
            onClick={() => onSelect(fixture)}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] transition-all text-white rounded-full font-bold text-xs tracking-wider flex items-center justify-center gap-2 shadow-md shadow-emerald-950/40 uppercase"
          >
            <Check size={16} className="stroke-[3]" />
            <span>VIEW RESULTS</span>
          </button>
        )}

        {fixture.status === 'available' && (
          <button
            onClick={() => onSelect(fixture)}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] transition-all text-white rounded-full font-bold text-xs tracking-wider flex items-center justify-center gap-2 shadow-md shadow-blue-950/40 uppercase"
          >
            <span>START RECORDING</span>
            <ArrowRight size={16} className="stroke-[3]" />
          </button>
        )}

        {fixture.status === 'in_progress' && (
          <button
            onClick={() => onSelect(fixture)}
            className="w-full py-3.5 bg-amber-600/90 hover:bg-amber-600 active:scale-[0.98] transition-all text-white rounded-full font-bold text-xs tracking-wider flex items-center justify-center gap-2 shadow-md shadow-amber-950/40 uppercase"
          >
            <Radio size={16} className="animate-pulse" />
            <span>RECORDING UNDERWAY</span>
          </button>
        )}

        {fixture.status === 'locked' && (
          <button
            disabled
            className="w-full py-3.5 bg-slate-800/60 text-slate-500 rounded-full font-semibold text-xs tracking-wider flex items-center justify-center gap-2 cursor-not-allowed uppercase"
          >
            <Lock size={14} />
            <span>{fixture.isConditional ? 'NOT YET REQUIRED' : 'AWAITING PREVIOUS GAME'}</span>
          </button>
        )}

        {fixture.status === 'not_required' && (
          <div className="w-full py-3.5 bg-slate-900/60 text-slate-400 rounded-full font-semibold text-xs tracking-wider flex items-center justify-center gap-2 border border-slate-800/40 uppercase">
            <span>SERIES CLINCHED (NOT REQUIRED)</span>
          </div>
        )}
      </div>
    </div>
  );
};
