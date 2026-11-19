import React, { useState, useEffect } from 'react';
import { MatchEvent, Quarter, Team, GoalType, CardType } from '../../types';
import { getPlayersByTeam } from '../../data/players';
import { ChevronLeft, ChevronRight, ChevronDown, Trash2, X } from 'lucide-react';

interface BottomDockProps {
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

  // Default team setup
  useEffect(() => {
    if (!selectedTeamId && team1) {
      setSelectedTeamId(team1.id);
    }
  }, [team1, selectedTeamId]);

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

  // Team Toggle
  const toggleTeam = () => {
    if (team1 && team2) {
      setSelectedTeamId((prev) => (prev === team1.id ? team2.id : team1.id));
      setScorerId('');
      setAssisterId('');
      setCardPlayerId('');
    }
  };

  // Card Type Toggle
  const toggleCardType = () => {
    setCardType((prev) => (prev === 'yellow' ? 'red' : 'yellow'));
  };

  // Submissions
  const handleSaveGoal = () => {
    if (!scorerId) return;

    let goalType: GoalType = 'regular';
    if (isPenalty) goalType = 'penalty';
    if (isOwnGoal) goalType = 'own_goal';

    const finalAssisterId = isOwnGoal || isPenalty ? null : assisterId || null;
    const effectiveMinute = Math.min(Math.max(1, minute), maxMinute);

    if (editingEvent) {
      onUpdateEvent({
        ...editingEvent,
        quarter: currentQuarter,
        minute: effectiveMinute,
        teamId: selectedTeamId,
        playerId: scorerId,
        assisterId: finalAssisterId,
        goalType,
        concedingTeamId: isOwnGoal ? opposingTeamId : undefined,
      });
      onCancelEdit();
    } else {
      onAddEvent({
        matchId: '',
        quarter: currentQuarter,
        minute: effectiveMinute,
        type: 'goal',
        teamId: selectedTeamId,
        playerId: scorerId,
        assisterId: finalAssisterId,
        goalType,
        concedingTeamId: isOwnGoal ? opposingTeamId : undefined,
      });
      setScorerId('');
      setAssisterId('');
      setIsPenalty(false);
      setIsOwnGoal(false);
    }
  };

  const handleSaveCard = () => {
    if (!cardPlayerId) return;

    const effectiveMinute = Math.min(Math.max(1, minute), maxMinute);

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

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#12151c] border-t border-slate-800 rounded-t-3xl shadow-2xl p-4 max-w-md mx-auto font-sans font-normal">
      {/* Top Bar: Quarter Switcher & Mode Icons */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        {/* Quarter Pills */}
        <div className="flex items-center gap-1.5 bg-[#1a1f2c] p-1 rounded-full border border-slate-800">
          {quartersList.map((q) => {
            const isActive = currentQuarter === q;
            const label = q === 'et' ? 'ET' : q.toUpperCase();
            return (
              <button
                key={q}
                type="button"
                onClick={() => onQuarterChange(q)}
                className={`px-3.5 py-1 text-xs font-normal tracking-wider rounded-full transition-all uppercase ${
                  isActive
                    ? 'bg-white text-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Mode Toggles: Soccer Ball & Cards */}
        <div className="flex items-center gap-1 bg-[#1a1f2c] p-1 rounded-full border border-slate-800">
          {/* Goal Mode: Classical Soccer / Football Ball */}
          <button
            type="button"
            onClick={() => setMode('goal')}
            className={`p-2 rounded-full transition-all ${
              mode === 'goal'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="GOAL MODE"
          >
            <svg
              className="w-4 h-4 fill-current"
              viewBox="0 0 24 24"
            >
              {/* Outer circle with seamless pentagonal panels */}
              <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <polygon points="12,7.2 15.6,9.8 14.2,14.2 9.8,14.2 8.4,9.8" />
              <line x1="12" y1="2.5" x2="12" y2="7.2" stroke="currentColor" strokeWidth="1.5" />
              <line x1="15.6" y1="9.8" x2="21.2" y2="8.2" stroke="currentColor" strokeWidth="1.5" />
              <line x1="14.2" y1="14.2" x2="18.2" y2="19.8" stroke="currentColor" strokeWidth="1.5" />
              <line x1="9.8" y1="14.2" x2="5.8" y2="19.8" stroke="currentColor" strokeWidth="1.5" />
              <line x1="8.4" y1="9.8" x2="2.8" y2="8.2" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>

          {/* Card Mode */}
          <button
            type="button"
            onClick={() => setMode('card')}
            className={`p-2 rounded-full transition-all ${
              mode === 'card'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="CARD MODE"
          >
            <div className="relative w-4 h-4 flex items-center justify-center">
              <span className="absolute -top-0.5 -left-0.5 w-2.5 h-3.5 bg-amber-400 rounded-[2px]" />
              <span className="absolute top-0.5 left-1 w-2.5 h-3.5 bg-rose-600 rounded-[2px]" />
            </div>
          </button>
        </div>
      </div>

      {/* Editing Banner */}
      {editingEvent && (
        <div className="flex items-center justify-between bg-[#BE2041]/15 border border-[#BE2041]/40 rounded-xl px-3 py-1.5 mb-2.5 text-xs text-[#fca5a5] uppercase">
          <span>EDITING {editingEvent.type.toUpperCase()} ({editingEvent.minute}')</span>
          <button
            onClick={onCancelEdit}
            className="flex items-center gap-1 text-slate-400 hover:text-white text-[11px] uppercase"
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
              <span className="text-[10px] font-normal tracking-wider text-slate-400 uppercase mb-1">
                MINUTE {currentQuarter !== 'et' ? '(1-12\')' : '(ET)'}
              </span>
              <div className="flex items-center justify-between bg-[#191e2b] border border-slate-700/60 rounded-xl px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => handleMinuteStep(-1)}
                  disabled={minute <= 1}
                  className={`p-1 transition-colors ${minute <= 1 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-white'}`}
                  title="DECREASE MINUTE"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="font-sans font-normal text-sm text-white">{minute}'</span>
                <button
                  type="button"
                  onClick={() => handleMinuteStep(1)}
                  disabled={minute >= maxMinute}
                  className={`p-1 transition-colors ${minute >= maxMinute ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-white'}`}
                  title="INCREASE MINUTE"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Goal For Stepper */}
            <div className="flex flex-col">
              <span className="text-[10px] font-normal tracking-wider text-slate-400 uppercase mb-1">
                GOAL FOR
              </span>
              <div
                onClick={toggleTeam}
                className="flex items-center justify-between bg-[#191e2b] border border-slate-700/60 rounded-xl px-2 py-1.5 cursor-pointer hover:border-slate-600 transition-colors"
              >
                <ChevronLeft size={16} className="text-slate-400" />
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
                <ChevronRight size={16} className="text-slate-400" />
              </div>
            </div>
          </div>

          {/* Row 2: Scorer Dropdown */}
          <div className="flex flex-col">
            <span className="text-[10px] font-normal tracking-wider text-slate-400 uppercase mb-1">
              SCORER {isOwnGoal && '(FROM CONCEDING TEAM)'}
            </span>
            <div className="relative">
              <select
                value={scorerId}
                onChange={(e) => setScorerId(e.target.value)}
                className="w-full appearance-none bg-[#191e2b] border border-slate-700/60 rounded-xl px-3 py-2 text-xs font-normal text-white focus:outline-none focus:border-[#BE2041] uppercase"
              >
                <option value="">SELECT SCORER...</option>
                {scorerPlayers.map((p) => (
                  <option key={p.id} value={p.id} className="uppercase">
                    {p.fullName.toUpperCase()}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 top-2.5 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Row 3: Assister Dropdown */}
          {!isOwnGoal && !isPenalty && (
            <div className="flex flex-col">
              <span className="text-[10px] font-normal tracking-wider text-slate-400 uppercase mb-1">
                ASSISTER (OPTIONAL)
              </span>
              <div className="relative">
                <select
                  value={assisterId}
                  onChange={(e) => setAssisterId(e.target.value)}
                  className="w-full appearance-none bg-[#191e2b] border border-slate-700/60 rounded-xl px-3 py-2 text-xs font-normal text-white focus:outline-none focus:border-[#BE2041] uppercase"
                >
                  <option value="">NONE (UNASSISTED)</option>
                  {assisterPlayers.map((p) => (
                    <option key={p.id} value={p.id} className="uppercase">
                      {p.fullName.toUpperCase()}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3 top-2.5 text-slate-400 pointer-events-none"
                />
              </div>
            </div>
          )}

          {/* Row 4: Toggles (PENALTY & OWN GOAL) & Add Goal Button */}
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
                    isPenalty ? 'bg-[#BE2041]' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-[1px] ${
                      isPenalty ? 'left-4' : 'left-0.5'
                    }`}
                  />
                </div>
                <span className="text-[10px] font-normal tracking-wider text-slate-300 uppercase">
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
                    isOwnGoal ? 'bg-amber-600' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-[1px] ${
                      isOwnGoal ? 'left-4' : 'left-0.5'
                    }`}
                  />
                </div>
                <span className="text-[10px] font-normal tracking-wider text-slate-300 uppercase">
                  OWN GOAL
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {editingEvent && (
                <button
                  type="button"
                  onClick={() => onDeleteEvent(editingEvent.id)}
                  className="p-2.5 rounded-full bg-rose-900/60 hover:bg-rose-800 text-rose-300 transition-colors uppercase"
                  title="DELETE EVENT"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveGoal}
                disabled={!scorerId}
                className={`px-5 py-2.5 rounded-full font-normal text-xs tracking-wider uppercase transition-all shadow-md active:scale-95 ${
                  scorerId
                    ? 'bg-white text-black hover:bg-slate-200'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
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
              <span className="text-[10px] font-normal tracking-wider text-slate-400 uppercase mb-1">
                MINUTE {currentQuarter !== 'et' ? '(1-12\')' : '(ET)'}
              </span>
              <div className="flex items-center justify-between bg-[#191e2b] border border-slate-700/60 rounded-xl px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => handleMinuteStep(-1)}
                  disabled={minute <= 1}
                  className={`p-1 transition-colors ${minute <= 1 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-white'}`}
                  title="DECREASE MINUTE"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="font-sans font-normal text-sm text-white">{minute}'</span>
                <button
                  type="button"
                  onClick={() => handleMinuteStep(1)}
                  disabled={minute >= maxMinute}
                  className={`p-1 transition-colors ${minute >= maxMinute ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:text-white'}`}
                  title="INCREASE MINUTE"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Card For */}
            <div className="flex flex-col">
              <span className="text-[10px] font-normal tracking-wider text-slate-400 uppercase mb-1">
                CARD FOR
              </span>
              <div
                onClick={toggleTeam}
                className="flex items-center justify-between bg-[#191e2b] border border-slate-700/60 rounded-xl px-2 py-1.5 cursor-pointer hover:border-slate-600 transition-colors"
              >
                <ChevronLeft size={16} className="text-slate-400" />
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
                <ChevronRight size={16} className="text-slate-400" />
              </div>
            </div>
          </div>

          {/* Row 2: Card Type Stepper */}
          <div className="flex flex-col">
            <span className="text-[10px] font-normal tracking-wider text-slate-400 uppercase mb-1">
              CARD TYPE
            </span>
            <div
              onClick={toggleCardType}
              className="flex items-center justify-between bg-[#191e2b] border border-slate-700/60 rounded-xl px-3 py-2 cursor-pointer hover:border-slate-600 transition-colors"
            >
              <ChevronLeft size={16} className="text-slate-400" />
              <div className="flex items-center gap-2">
                <span
                  className={`w-3.5 h-4.5 rounded-sm inline-block shadow-sm ${
                    cardType === 'yellow' ? 'bg-amber-400' : 'bg-rose-600'
                  }`}
                />
                <span className="font-sans font-normal text-xs text-white uppercase">
                  {cardType.toUpperCase()}
                </span>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </div>
          </div>

          {/* Row 3: Card To Dropdown */}
          <div className="flex flex-col">
            <span className="text-[10px] font-normal tracking-wider text-slate-400 uppercase mb-1">
              CARD TO
            </span>
            <div className="relative">
              <select
                value={cardPlayerId}
                onChange={(e) => setCardPlayerId(e.target.value)}
                className="w-full appearance-none bg-[#191e2b] border border-slate-700/60 rounded-xl px-3 py-2 text-xs font-normal text-white focus:outline-none focus:border-[#BE2041] uppercase"
              >
                <option value="">SELECT PLAYER...</option>
                {cardPlayers.map((p) => (
                  <option key={p.id} value={p.id} className="uppercase">
                    {p.fullName.toUpperCase()}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 top-2.5 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Row 4: Submit Card Button */}
          <div className="flex items-center justify-end gap-2 pt-1">
            {editingEvent && (
              <button
                type="button"
                onClick={() => onDeleteEvent(editingEvent.id)}
                className="p-2.5 rounded-full bg-rose-900/60 hover:bg-rose-800 text-rose-300 transition-colors uppercase"
                title="DELETE EVENT"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={handleSaveCard}
              disabled={!cardPlayerId}
              className={`px-5 py-2.5 rounded-full font-normal text-xs tracking-wider uppercase transition-all shadow-md active:scale-95 ${
                cardPlayerId
                  ? 'bg-white text-black hover:bg-slate-200'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
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
