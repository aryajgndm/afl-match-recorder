import React from 'react';
import { MatchEvent, Team } from '../../types';
import { getPlayerById } from '../../data/players';
import { compareMatchEvents } from '../../lib/scoring';

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
      <div className="flex flex-col items-center justify-center py-10 text-neutral-500 text-xs font-medium text-center font-sans">
        <p>No events recorded in this quarter yet.</p>
        {!readOnly && (
          <p className="text-xs text-neutral-500 mt-1">
            Use the dock below to add a goal or card.
          </p>
        )}
      </div>
    );
  }

  // Chronologically sorted events (minute asc, then creation time asc)
  const sorted = [...events].sort(compareMatchEvents);

  return (
    <div className="w-full mx-auto flex flex-col rounded-xl overflow-hidden border border-[#2d2d2d] bg-[#181818] font-sans">
      {sorted.map((ev, index) => {
        const isTeam1 = ev.teamId === team1?.id;
        const isSelected = selectedEventId === ev.id;
        const isCard = ev.type === 'card';

        const player = getPlayerById(ev.playerId);
        const assister = ev.assisterId ? getPlayerById(ev.assisterId) : null;

        const playerName = player?.name || ev.playerId;

        let suffix = '';
        if (ev.goalType === 'penalty') suffix = '(P)';
        if (ev.goalType === 'own_goal') suffix = '(OG)';

        if (isCard) {
          const isYellow = ev.cardType === 'yellow';
          return (
            <div
              key={ev.id}
              onClick={() => !readOnly && onSelectEvent?.(ev)}
              className={`w-full py-2.5 px-4 flex items-center justify-center gap-2 transition-all cursor-pointer select-none ${
                index % 2 === 0 ? 'bg-[#181818]' : 'bg-[#1e1e1e]'
              } ${
                isSelected
                  ? 'bg-[#007AFF]/25 ring-2 ring-[#007AFF]'
                  : 'hover:bg-[#252525]'
              }`}
            >
              <span
                className={`w-3 h-4 rounded-[2px] inline-block ${
                  isYellow ? 'bg-amber-400' : 'bg-rose-600'
                }`}
              />
              <span className="text-xs tracking-wide text-white uppercase">
                {/* Minute must be bold, player's name must be medium, bracketed text must be regular weight */}
                <span className="font-bold">{ev.minute}'</span>{' '}
                <span className="font-medium">{playerName.toUpperCase()}</span>
                {ev.isSecondYellowRed && (
                  <span className="font-normal text-neutral-400"> (2ND YELLOW)</span>
                )}
              </span>
            </div>
          );
        }

        // Goal Event
        const renderGoalContent = () => (
          <span className="text-xs tracking-wide text-white uppercase">
            {/* Minute must be bold, scorer's name must be medium, bracketed text must be regular weight */}
            <span className="font-bold">{ev.minute}'</span>{' '}
            <span className="font-medium">{playerName.toUpperCase()}</span>
            {assister && (
              <span className="font-normal text-neutral-400"> ({assister.name.toUpperCase()})</span>
            )}
            {suffix && (
              <span className="font-normal text-neutral-400"> {suffix}</span>
            )}
          </span>
        );

        return (
          <div
            key={ev.id}
            onClick={() => !readOnly && onSelectEvent?.(ev)}
            className={`w-full py-2.5 px-4 flex items-center justify-between text-xs select-none transition-all cursor-pointer ${
              index % 2 === 0 ? 'bg-[#181818]' : 'bg-[#1e1e1e]'
            } ${
              isSelected
                ? 'bg-[#007AFF]/25 ring-2 ring-[#007AFF]'
                : 'hover:bg-[#252525]'
            }`}
          >
            {/* Team 1 event column */}
            <div className="flex-1 flex justify-start">
              {isTeam1 && renderGoalContent()}
            </div>

            {/* Team 2 event column */}
            <div className="flex-1 flex justify-end text-right">
              {!isTeam1 && renderGoalContent()}
            </div>
          </div>
        );
      })}
    </div>
  );
};
