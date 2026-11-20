import React, { useState, useEffect, useMemo } from 'react';
import { MatchEvent, Quarter, Team, CardType } from '../../types';
import { getPlayersByTeam } from '../../data/players';
import { calculateDisciplinaryState } from '../../lib/disciplinary';
import { ChevronLeft, ChevronRight, ChevronDown, Trash2, X } from 'lucide-react';

interface BottomDockProps {
  events?: MatchEvent[];
  currentQuarter: Quarter;
  onQuarterChange: (q: Quarter) => void;
  team1: Team | null;
  team2: Team | null;
  isExtraTimeActive: boolean;
  onAddEvent: (eventData: Omit<MatchEvent, 'id' | 'createdAt'>) => void;
  onUpdateEvent: (event: MatchEvent) => void;
  onDeleteEvent: (eventId: string) => void;
  editingEvent: MatchEvent | null;
  onCancelEdit: () => void;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  events = [],
  currentQuarter,
  onQuarterChange,
  team1,
  team2,
  isExtraTimeActive,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  editingEvent,
  onCancelEdit,
}) => {
  const [mode, setMode] = useState<'goal' | 'card'>('goal');

  // Form states
  const [minute, setMinute] = useState<number>(1);
  const [selectedTeamId, setSelectedTeamId] = useState<string>(team1?.id || '');
  const [scorerId, setScorerId] = useState<string>('');
  const [assisterId, setAssisterId] = useState<string>('');
  const [isPenalty, setIsPenalty] = useState<boolean>(false);
  const [isOwnGoal, setIsOwnGoal] = useState<boolean>(false);

  const [cardType, setCardType] = useState<CardType>('yellow');
  const [cardPlayerId, setCardPlayerId] = useState<string>('');

  // Default team setup & sync when team1/team2 update
  useEffect(() => {
    if (team1 && team2) {
      if (selectedTeamId !== team1.id && selectedTeamId !== team2.id) {
        setSelectedTeamId(team1.id);
      }
    } else if (team1 && !selectedTeamId) {
      setSelectedTeamId(team1.id);
    }
  }, [team1, team2, selectedTeamId]);

  // Sync when entering/leaving edit mode
  useEffect(() => {
    if (editingEvent) {
      setMode(editingEvent.type);
      setMinute(editingEvent.minute);
      setSelectedTeamId(editingEvent.teamId);

      if (editingEvent.type === 'goal') {
        setScorerId(editingEvent.playerId);
        setIsPenalty(editingEvent.goalType === 'penalty');
        setIsOwnGoal(editingEvent.goalType === 'own_goal');
        if (editingEvent.goalType === 'penalty' || editingEvent.goalType === 'own_goal') {
          setAssisterId('');
        } else {
          setAssisterId(editingEvent.assisterId || '');
        }
      } else {
        setCardType(editingEvent.cardType || 'yellow');
        setCardPlayerId(editingEvent.playerId);
      }
    } else {
      // Reset defaults
      setScorerId('');
      setAssisterId('');
      setIsPenalty(false);
      setIsOwnGoal(false);
      setCardPlayerId('');
    }
  }, [editingEvent]);

  // Opposing team for Own Goal logic
  const opposingTeamId = selectedTeamId === team1?.id ? team2?.id : team1?.id;

  // Determine player lists
  const scorerTeamId = isOwnGoal ? opposingTeamId || selectedTeamId : selectedTeamId;
  const scorerPlayers = scorerTeamId ? getPlayersByTeam(scorerTeamId) : [];
  const assisterPlayers = selectedTeamId ? getPlayersByTeam(selectedTeamId) : [];
  const cardPlayers = selectedTeamId ? getPlayersByTeam(selectedTeamId) : [];

  // Disciplinary state tracking for current match
  const disciplinaryMap = useMemo(() => {
    return events ? calculateDisciplinaryState(events) : new Map();
  }, [events]);

  // Minute Steppers - strictly limited to 12 minutes for Quarters 1-4
  const maxMinute = currentQuarter === 'et' ? 30 : 12;

  const handleMinuteStep = (delta: number) => {
    setMinute((prev) => Math.max(1, Math.min(prev + delta, maxMinute)));
  };

  useEffect(() => {
    const max = currentQuarter === 'et' ? 30 : 12;
    if (minute > max) {
      setMinute(max);
    }
  }, [currentQuarter, minute]);

  const toggleTeam = () => {
    if (team1 && team2) {
      const nextId = selectedTeamId === team1.id ? team2.id : team1.id;
      setSelectedTeamId(nextId);
      setScorerId('');
      setAssisterId('');
      setCardPlayerId('');
    }
  };

  const handleSaveGoal = () => {
    if (!scorerId) return;

    const effectiveMinute = Math.min(minute, maxMinute);

    let goalType: 'regular' | 'penalty' | 'own_goal' = 'regular';
    if (isPenalty) goalType = 'penalty';
    if (isOwnGoal) goalType = 'own_goal';

    const creditedTeamId = selectedTeamId;
    const finalAssisterId = isPenalty || isOwnGoal ? undefined : assisterId || undefined;

    if (editingEvent) {
      onUpdateEvent({
        ...editingEvent,
        quarter: currentQuarter,
        minute: effectiveMinute,
        teamId: creditedTeamId,
        playerId: scorerId,
        assisterId: finalAssisterId,
        goalType,
      });
      onCancelEdit();
    } else {
      onAddEvent({
        matchId: '',
        quarter: currentQuarter,
        minute: effectiveMinute,
        type: 'goal',
        teamId: creditedTeamId,
        playerId: scorerId,
        assisterId: finalAssisterId,
        goalType,
      });
      // Reset inputs for next entry
      setScorerId('');
      setAssisterId('');
      setIsPenalty(false);
      setIsOwnGoal(false);
    }
  };

  const handleSaveCard = () => {
    if (!cardPlayerId) return;

    const effectiveMinute = Math.min(minute, maxMinute);

    if (editingEvent) {
      onUpdateEvent({
        ...editingEvent,
        quarter: currentQuarter,
        minute: effectiveMinute,
        teamId: selectedTeamId,
        playerId: cardPlayerId,
        cardType,
      });
      onCancelEdit();
    } else {
      onAddEvent({
        matchId: '',
        quarter: currentQuarter,
        minute: effectiveMinute,
        type: 'card',
        teamId: selectedTeamId,
        playerId: cardPlayerId,
        cardType,
      });
      setCardPlayerId('');
    }
  };

  const selectedTeam = selectedTeamId === team1?.id ? team1 : team2;

  const quartersList: Quarter[] = ['q1', 'q2', 'q3', 'q4'];
  if (isExtraTimeActive) {
    quartersList.push('et');
  }

  // Selected card player disciplinary state
  const selectedCardPlayerState = cardPlayerId ? disciplinaryMap.get(cardPlayerId) : null;
  const isSelectedPlayerDismissed =
    selectedCardPlayerState?.isDismissed && (!editingEvent || editingEvent.playerId !== cardPlayerId);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#121212] border-t border-[#262626] rounded-t-3xl shadow-2xl p-4 max-w-md mx-auto font-sans font-normal uppercase">
      {/* Top Bar: Quarter Switcher & Mode Icons */}
      <div className="flex items-center justify-between pb-3 border-b border-[#262626] mb-3">
        {/* Quarter Pills (Bold text) */}
        <div className="flex items-center gap-1.5 bg-[#242424] p-1 rounded-full border border-[#333333]">
          {quartersList.map((q) => {
            const isActive = currentQuarter === q;
            const label = q === 'et' ? 'ET' : q.toUpperCase();
            return (
              <button
                key={q}
                type="button"
                onClick={() => onQuarterChange(q)}
                className={`px-3.5 py-1 text-xs font-bold tracking-wider rounded-full transition-all uppercase ${
                  isActive
                    ? 'bg-white text-black shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Mode Toggles: Soccer Ball & Cards (Centered card icon in top right corner) */}
        <div className="flex items-center gap-1 bg-[#242424] p-1 rounded-full border border-[#333333]">
          {/* Goal Mode: Classical Soccer / Football Ball */}
          <button
            type="button"
            onClick={() => setMode('goal')}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${
              mode === 'goal'
                ? 'bg-white text-black shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="GOAL MODE"
          >
            <svg
              className="w-4 h-4 fill-current"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <polygon points="12,7.2 15.6,9.8 14.2,14.2 9.8,14.2 8.4,9.8" />
              <line x1="12" y1="2.5" x2="12" y2="7.2" stroke="currentColor" strokeWidth="1.5" />
              <line x1="15.6" y1="9.8" x2="21.2" y2="8.2" stroke="currentColor" strokeWidth="1.5" />
              <line x1="14.2" y1="14.2" x2="18.2" y2="19.8" stroke="currentColor" strokeWidth="1.5" />
              <line x1="9.8" y1="14.2" x2="5.8" y2="19.8" stroke="currentColor" strokeWidth="1.5" />
              <line x1="8.4" y1="9.8" x2="2.8" y2="8.2" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>

          {/* Card Mode: Centered card icon */}
          <button
            type="button"
            onClick={() => setMode('card')}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${
              mode === 'card'
                ? 'bg-white text-black shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="CARD MODE"
          >
            <svg
              className="w-4 h-4 fill-current"
              viewBox="0 0 24 24"
            >
              <rect x="7" y="3.5" width="10" height="17" rx="2" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>

      {/* Editing Banner */}
      {editingEvent && (
        <div className="flex items-center justify-between bg-[#007AFF]/20 border border-[#007AFF]/50 rounded-xl px-3 py-1.5 mb-2.5 text-xs text-blue-200 uppercase font-sans">
          <span>EDITING {editingEvent.type === 'goal' ? 'GOAL' : 'CARD'} ({editingEvent.minute}')</span>
          <button
            onClick={onCancelEdit}
            className="flex items-center gap-1 text-neutral-300 hover:text-white text-[11px] font-bold uppercase"
          >
            <X size={14} />
            <span>CANCEL</span>
          </button>
        </div>
      )}

      {/* Mode Body */}
      {mode === 'goal' ? (
        <div className="flex flex-col gap-2.5">
          {/* Row 1: Minute & Goal For */}
          <div className="grid grid-cols-2 gap-3">
            {/* Minute Stepper */}
            <div className="flex flex-col">
              <span className="text-[10px] font-normal tracking-wide text-neutral-400 mb-1 uppercase">
                MINUTE {currentQuarter !== 'et' ? '(1–12\')' : '(ET)'}
              </span>
              <div className="flex items-center justify-between bg-[#242424] border border-[#383838] rounded-xl px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => handleMinuteStep(-1)}
                  disabled={minute <= 1}
                  className={`p-1 transition-colors ${minute <= 1 ? 'text-neutral-600 cursor-not-allowed' : 'text-neutral-400 hover:text-white'}`}
                  title="DECREASE MINUTE"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="font-sans font-normal text-sm text-white">{minute}'</span>
                <button
                  type="button"
                  onClick={() => handleMinuteStep(1)}
                  disabled={minute >= maxMinute}
                  className={`p-1 transition-colors ${minute >= maxMinute ? 'text-neutral-600 cursor-not-allowed' : 'text-neutral-400 hover:text-white'}`}
                  title="INCREASE MINUTE"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Goal For Stepper */}
            <div className="flex flex-col">
              <span className="text-[10px] font-normal tracking-wide text-neutral-400 mb-1 uppercase">
                GOAL FOR
              </span>
              <div
                onClick={toggleTeam}
                className="flex items-center justify-between bg-[#242424] border border-[#383838] rounded-xl px-2 py-1.5 cursor-pointer hover:border-neutral-500 transition-colors"
              >
                <ChevronLeft size={16} className="text-neutral-400" />
                <div className="flex items-center gap-2 truncate">
                  <div className="w-6 h-6 flex items-center justify-center filter drop-shadow-sm flex-shrink-0">
                    {selectedTeam && (
                      <img
                        src={selectedTeam.logoUrl}
                        alt={selectedTeam.name}
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                  <span className="font-sans font-normal text-xs text-white uppercase truncate">
                    {selectedTeam?.name}
                  </span>
                </div>
                <ChevronRight size={16} className="text-neutral-400" />
              </div>
            </div>
          </div>

          {/* Row 2: Scorer Dropdown */}
          <div className="flex flex-col">
            <span className="text-[10px] font-normal tracking-wide text-neutral-400 mb-1 uppercase">
              SCORER {isOwnGoal && '(FROM CONCEDING TEAM)'}
            </span>
            <div className="relative">
              <select
                value={scorerId}
                onChange={(e) => setScorerId(e.target.value)}
                className="w-full appearance-none bg-[#242424] border border-[#383838] rounded-xl pl-3 pr-9 py-2 text-xs font-normal text-white focus:outline-none focus:border-blue-500 uppercase cursor-pointer"
              >
                <option value="" className="bg-[#242424] text-neutral-400 uppercase py-1">
                  SELECT SCORER...
                </option>
                {scorerPlayers.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#242424] text-white uppercase py-1">
                    {p.fullName.toUpperCase()}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 top-2.5 text-neutral-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Row 3: Assister Dropdown */}
          {!isOwnGoal && !isPenalty && (
            <div className="flex flex-col">
              <span className="text-[10px] font-normal tracking-wide text-neutral-400 mb-1 uppercase">
                ASSISTER (OPTIONAL)
              </span>
              <div className="relative">
                <select
                  value={assisterId}
                  onChange={(e) => setAssisterId(e.target.value)}
                  className="w-full appearance-none bg-[#242424] border border-[#383838] rounded-xl pl-3 pr-9 py-2 text-xs font-normal text-white focus:outline-none focus:border-blue-500 uppercase cursor-pointer"
                >
                  <option value="" className="bg-[#242424] text-neutral-400 uppercase py-1">
                    NONE (UNASSISTED)
                  </option>
                  {assisterPlayers.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#242424] text-white uppercase py-1">
                      {p.fullName.toUpperCase()}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3 top-2.5 text-neutral-400 pointer-events-none"
                />
              </div>
            </div>
          )}

          {/* Row 4: Toggles (Penalty & Own Goal) & Add Goal Button */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-4">
              {/* Penalty Toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isPenalty}
                  disabled={isOwnGoal}
                  onChange={(e) => {
                    setIsPenalty(e.target.checked);
                    if (e.target.checked) {
                      setIsOwnGoal(false);
                      setAssisterId('');
                    }
                  }}
                  className="sr-only"
                />
                <div
                  className={`w-8 h-4 rounded-full transition-colors relative ${
                    isPenalty ? 'bg-[#BE2041]' : 'bg-[#383838]'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-[1px] ${
                      isPenalty ? 'left-4' : 'left-0.5'
                    }`}
                  />
                </div>
                <span className="text-[10px] font-normal tracking-wide text-neutral-300 uppercase">
                  PENALTY
                </span>
              </label>

              {/* Own Goal Toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isOwnGoal}
                  disabled={isPenalty}
                  onChange={(e) => {
                    setIsOwnGoal(e.target.checked);
                    if (e.target.checked) {
                      setIsPenalty(false);
                      setAssisterId('');
                    }
                    setScorerId('');
                  }}
                  className="sr-only"
                />
                <div
                  className={`w-8 h-4 rounded-full transition-colors relative ${
                    isOwnGoal ? 'bg-amber-600' : 'bg-[#383838]'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-[1px] ${
                      isOwnGoal ? 'left-4' : 'left-0.5'
                    }`}
                  />
                </div>
                <span className="text-[10px] font-normal tracking-wide text-neutral-300 uppercase">
                  OWN GOAL
                </span>
              </label>
            </div>

            {/* Action Buttons: Bold text on button */}
            <div className="flex items-center gap-2">
              {editingEvent && (
                <button
                  type="button"
                  onClick={() => onDeleteEvent(editingEvent.id)}
                  className="p-2.5 rounded-full bg-rose-900/60 hover:bg-rose-800 text-rose-300 transition-colors uppercase font-bold"
                  title="DELETE EVENT"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveGoal}
                disabled={!scorerId}
                className={`px-5 py-2.5 rounded-full font-bold text-xs tracking-wider uppercase transition-all shadow-md active:scale-95 ${
                  scorerId
                    ? 'bg-white text-black hover:bg-neutral-200'
                    : 'bg-[#2a2a2a] text-neutral-500 cursor-not-allowed'
                }`}
              >
                {editingEvent ? 'SAVE CHANGES' : '+ ADD GOAL'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Card Mode */
        <div className="flex flex-col gap-2.5">
          {/* Row 1: Minute & Card For */}
          <div className="grid grid-cols-2 gap-3">
            {/* Minute */}
            <div className="flex flex-col">
              <span className="text-[10px] font-normal tracking-wide text-neutral-400 mb-1 uppercase">
                MINUTE {currentQuarter !== 'et' ? '(1–12\')' : '(ET)'}
              </span>
              <div className="flex items-center justify-between bg-[#242424] border border-[#383838] rounded-xl px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => handleMinuteStep(-1)}
                  disabled={minute <= 1}
                  className={`p-1 transition-colors ${minute <= 1 ? 'text-neutral-600 cursor-not-allowed' : 'text-neutral-400 hover:text-white'}`}
                  title="DECREASE MINUTE"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="font-sans font-normal text-sm text-white">{minute}'</span>
                <button
                  type="button"
                  onClick={() => handleMinuteStep(1)}
                  disabled={minute >= maxMinute}
                  className={`p-1 transition-colors ${minute >= maxMinute ? 'text-neutral-600 cursor-not-allowed' : 'text-neutral-400 hover:text-white'}`}
                  title="INCREASE MINUTE"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Card For */}
            <div className="flex flex-col">
              <span className="text-[10px] font-normal tracking-wide text-neutral-400 mb-1 uppercase">
                CARD FOR
              </span>
              <div
                onClick={toggleTeam}
                className="flex items-center justify-between bg-[#242424] border border-[#383838] rounded-xl px-2 py-1.5 cursor-pointer hover:border-neutral-500 transition-colors"
              >
                <ChevronLeft size={16} className="text-neutral-400" />
                <div className="flex items-center gap-2 truncate">
                  <div className="w-6 h-6 flex items-center justify-center filter drop-shadow-sm flex-shrink-0">
                    {selectedTeam && (
                      <img
                        src={selectedTeam.logoUrl}
                        alt={selectedTeam.name}
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                  <span className="font-sans font-normal text-xs text-white uppercase truncate">
                    {selectedTeam?.name}
                  </span>
                </div>
                <ChevronRight size={16} className="text-neutral-400" />
              </div>
            </div>
          </div>

          {/* Row 2: Card Type Selector with Yellow & Red Icons */}
          <div className="flex flex-col">
            <span className="text-[10px] font-normal tracking-wide text-neutral-400 mb-1 uppercase">
              CARD TYPE
            </span>
            <div className="grid grid-cols-2 gap-2 bg-[#242424] p-1 rounded-xl border border-[#383838]">
              {/* Yellow Card Button */}
              <button
                type="button"
                onClick={() => setCardType('yellow')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all font-sans font-bold text-xs uppercase ${
                  cardType === 'yellow'
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/60 shadow-xs'
                    : 'text-neutral-400 hover:text-white border border-transparent'
                }`}
              >
                {/* Yellow Card SVG Icon */}
                <svg
                  className="w-3.5 h-[18px] flex-shrink-0 drop-shadow-sm"
                  viewBox="0 0 14 18"
                  fill="none"
                >
                  <rect
                    x="0.75"
                    y="0.75"
                    width="12.5"
                    height="16.5"
                    rx="2"
                    fill="#EAB308"
                    stroke="#FDE047"
                    strokeWidth="1"
                  />
                  <rect x="2" y="2" width="10" height="3" rx="1" fill="#FEF08A" opacity="0.4" />
                </svg>
                <span>YELLOW</span>
              </button>

              {/* Red Card Button */}
              <button
                type="button"
                onClick={() => setCardType('red')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all font-sans font-bold text-xs uppercase ${
                  cardType === 'red'
                    ? 'bg-rose-600/25 text-rose-300 border border-rose-500/60 shadow-xs'
                    : 'text-neutral-400 hover:text-white border border-transparent'
                }`}
              >
                {/* Red Card SVG Icon */}
                <svg
                  className="w-3.5 h-[18px] flex-shrink-0 drop-shadow-sm"
                  viewBox="0 0 14 18"
                  fill="none"
                >
                  <rect
                    x="0.75"
                    y="0.75"
                    width="12.5"
                    height="16.5"
                    rx="2"
                    fill="#DC2626"
                    stroke="#F87171"
                    strokeWidth="1"
                  />
                  <rect x="2" y="2" width="10" height="3" rx="1" fill="#FECDD3" opacity="0.4" />
                </svg>
                <span>RED</span>
              </button>
            </div>
          </div>

          {/* Row 3: Card To (Player Selection Dropdown with Disciplinary Badges) */}
          <div className="flex flex-col">
            <span className="text-[10px] font-normal tracking-wide text-neutral-400 mb-1 uppercase">
              CARD TO
            </span>
            <div className="relative">
              <select
                value={cardPlayerId}
                onChange={(e) => setCardPlayerId(e.target.value)}
                className="w-full appearance-none bg-[#242424] border border-[#383838] rounded-xl pl-3 pr-9 py-2 text-xs font-normal text-white focus:outline-none focus:border-blue-500 uppercase cursor-pointer"
              >
                <option value="" className="bg-[#242424] text-neutral-400 uppercase py-1">
                  SELECT PLAYER...
                </option>
                {cardPlayers.map((p) => {
                  const pState = disciplinaryMap.get(p.id);
                  const yellowCount = pState?.yellowCount || 0;
                  const isDismissed = pState?.isDismissed || false;
                  const isCurrentEditing = editingEvent?.playerId === p.id;

                  let badge = '';
                  if (isDismissed && !isCurrentEditing) {
                    badge = ' · [DISMISSED / RED CARD]';
                  } else if (yellowCount === 1) {
                    badge = ' · [1 YELLOW CARD ⚠️]';
                  }

                  return (
                    <option
                      key={p.id}
                      value={p.id}
                      disabled={isDismissed && !isCurrentEditing}
                      className="bg-[#242424] text-white uppercase py-1"
                    >
                      {p.fullName.toUpperCase()}{badge}
                    </option>
                  );
                })}
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 top-2.5 text-neutral-400 pointer-events-none"
              />
            </div>

            {/* Disciplinary Notice / Warning */}
            {(() => {
              if (selectedCardPlayerState?.yellowCount === 1 && cardType === 'yellow') {
                return (
                  <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-sans font-medium mt-1">
                    <span>⚠️</span>
                    <span>PLAYER HAS 1 YELLOW CARD. THIS WILL TRIGGER AUTOMATIC RED CARD DISMISSAL.</span>
                  </div>
                );
              }
              if (isSelectedPlayerDismissed) {
                return (
                  <div className="flex items-center gap-1.5 text-[10px] text-rose-400 font-sans font-medium mt-1">
                    <span>⛔</span>
                    <span>PLAYER HAS ALREADY BEEN DISMISSED FROM THIS MATCH.</span>
                  </div>
                );
              }
              return null;
            })()}
          </div>

          {/* Row 4: Submit Card Button (Bold text on button) */}
          <div className="flex items-center justify-end gap-2 pt-1">
            {editingEvent && (
              <button
                type="button"
                onClick={() => onDeleteEvent(editingEvent.id)}
                className="p-2.5 rounded-full bg-rose-900/60 hover:bg-rose-800 text-rose-300 transition-colors uppercase font-bold"
                title="DELETE EVENT"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={handleSaveCard}
              disabled={!cardPlayerId || isSelectedPlayerDismissed}
              className={`px-5 py-2.5 rounded-full font-bold text-xs tracking-wider uppercase transition-all shadow-md active:scale-95 ${
                cardPlayerId && !isSelectedPlayerDismissed
                  ? 'bg-white text-black hover:bg-neutral-200'
                  : 'bg-[#2a2a2a] text-neutral-500 cursor-not-allowed'
              }`}
            >
              {editingEvent ? 'SAVE CHANGES' : '+ RECORD CARD'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
