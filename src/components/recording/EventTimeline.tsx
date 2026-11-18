import React from 'react';
import { MatchEvent, Team } from '../../types';
import { getPlayerById } from '../../data/players';

interface EventTimelineProps {
  events: MatchEvent[];
  team1: Team | null;
  team2: Team | null;
  selectedEventId?: string | null;
  onSelectEvent?: (event: MatchEvent) => void;
  readOnly?: boolean;
}

export const EventTimeline: React.FC<EventTimelineProps> = ({
  events,
  team1,
  selectedEventId,
  onSelectEvent,
  readOnly = false,
}) => {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-xs font-medium">
        <p>No events recorded in this quarter yet.</p>
        {!readOnly && <p className="text-[11px] text-slate-600 mt-1">Use the dock below to add a goal or card.</p>}
      </div>
    );
  }

  // Chronologically sorted events
  const sorted = [...events].sort((a, b) => a.minute - b.minute);

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col gap-1.5 py-1">
      {sorted.map((ev, index) => {
        const isTeam1 = ev.teamId === team1?.id;
        const isSelected = selectedEventId === ev.id;
        const isCard = ev.type === 'card';

        const player = getPlayerById(ev.playerId);
        const assister = ev.assisterId ? getPlayerById(ev.assisterId) : null;

        // Label formulation
        const playerName = player?.name || ev.playerId;
        const assisterText = assister ? ` (${assister.name})` : '';

        let suffix = '';
        if (ev.goalType === 'penalty') suffix = ' (P)';
        if (ev.goalType === 'own_goal') suffix = ' (OG)';

        const goalLabel = `${ev.minute}' ${playerName.toUpperCase()}${assisterText.toUpperCase()}${suffix}`;

        if (isCard) {
          const isYellow = ev.cardType === 'yellow';
          return (
            <div
              key={ev.id}
              onClick={() => !readOnly && onSelectEvent?.(ev)}
              className={`w-full py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer select-none ${
                index % 2 === 0 ? 'bg-[#181d28]/70' : 'bg-[#131720]/70'
              } ${
                isSelected
                  ? 'ring-2 ring-blue-500 bg-blue-950/30'
                  : 'hover:bg-slate-800/50'
              }`}
            >
              <span
                className={`w-3.5 h-4.5 rounded-sm inline-block shadow-sm ${
                  isYellow ? 'bg-amber-400' : 'bg-rose-600'
                }`}
              />
              <span className="text-xs font-black tracking-wide text-slate-100 uppercase">
                {ev.minute}' {playerName.toUpperCase()}{' '}
                {ev.isSecondYellowRed && '(2ND YELLOW)'}
              </span>
            </div>
          );
        }

        return (
          <div
            key={ev.id}
            onClick={() => !readOnly && onSelectEvent?.(ev)}
            className={`w-full py-2.5 px-3 rounded-xl flex items-center justify-between text-xs font-extrabold tracking-wide select-none transition-all cursor-pointer ${
              index % 2 === 0 ? 'bg-[#181d28]/70' : 'bg-[#131720]/70'
            } ${
              isSelected
                ? 'ring-2 ring-blue-500 bg-blue-950/30'
                : 'hover:bg-slate-800/50'
            }`}
          >
            {/* Team 1 event column */}
            <div className="flex-1 flex justify-start">
              {isTeam1 && (
                <span className="text-slate-100 uppercase">
                  {goalLabel}
                </span>
              )}
            </div>

            {/* Team 2 event column */}
            <div className="flex-1 flex justify-end text-right">
              {!isTeam1 && (
                <span className="text-slate-100 uppercase">
                  {goalLabel}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
