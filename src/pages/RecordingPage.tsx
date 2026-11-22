import React, { useState, useEffect, useMemo } from 'react';
import { Fixture, MatchEvent, Quarter, Team } from '../types';
import { matchStorage } from '../lib/storage';
import { api } from '../lib/api';
import { calculateMatchScore, checkExtraTimeTwoGoalLead } from '../lib/scoring';
import { resolveNewCard } from '../lib/disciplinary';
import { TEAMS } from '../data/teams';
import { MatchHeader } from '../components/recording/MatchHeader';
import { TotalScoreboard } from '../components/recording/TotalScoreboard';
import { QuarterScoreboard } from '../components/recording/QuarterScoreboard';
import { EventTimeline } from '../components/recording/EventTimeline';
import { BottomDock } from '../components/recording/BottomDock';
import { SubmitModal } from '../components/recording/SubmitModal';
import { Lock } from 'lucide-react';

interface RecordingPageProps {
  matchId: string;
  onNavigateBack: () => void;
  onNavigateToResults: (matchId: string) => void;
}

export const RecordingPage: React.FC<RecordingPageProps> = ({
  matchId,
  onNavigateBack,
  onNavigateToResults,
}) => {
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [currentQuarter, setCurrentQuarter] = useState<Quarter>('q1');
  const [editingEvent, setEditingEvent] = useState<MatchEvent | null>(null);

  // Submit modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const sessionId = matchStorage.getOrCreateClientSessionId();

  // Load data
  const loadData = () => {
    const f = matchStorage.getFixtureById(matchId);
    if (!f) return;
    setFixture(f);
    setEvents(matchStorage.getEvents(matchId));
  };

  useEffect(() => {
    loadData();
    const unsub = matchStorage.subscribe(() => {
      loadData();
    });
    return () => unsub();
  }, [matchId]);

  // Periodic sync and lock heartbeat: ping every 15 seconds
  useEffect(() => {
    if (!fixture || fixture.status !== 'in_progress') return;

    const interval = setInterval(async () => {
      matchStorage.sendHeartbeat(matchId, sessionId);
      const ok = await api.sendHeartbeat(matchId, sessionId);
      if (!ok) {
        await matchStorage.syncWithBackend();
      }
    }, 15 * 1000);

    return () => clearInterval(interval);
  }, [matchId, sessionId, fixture?.status]);

  const team1: Team | null = fixture?.team1Id ? TEAMS[fixture.team1Id] : null;
  const team2: Team | null = fixture?.team2Id ? TEAMS[fixture.team2Id] : null;

  // Real-time deterministic score
  const score = useMemo(() => {
    return calculateMatchScore(events, team1, team2);
  }, [events, team1, team2]);

  // Extra time eligibility: tied after Q4 or already has ET goals
  const isExtraTimeActive = score.isExtraTime;

  // Extra time sudden death check (two goal lead)
  const etLead = useMemo(() => {
    if (!isExtraTimeActive) return { clinched: false };
    return checkExtraTimeTwoGoalLead(
      score.team1QuarterScores.et,
      score.team2QuarterScores.et
    );
  }, [isExtraTimeActive, score.team1QuarterScores.et, score.team2QuarterScores.et]);

  // Can submit match: in Q4 or ET
  const canSubmit = currentQuarter === 'q4' || currentQuarter === 'et';

  // Add Event handler
  const handleAddEvent = (eventData: Omit<MatchEvent, 'id' | 'createdAt'>) => {
    if (!fixture) return;

    // Disciplinary second-yellow logic
    if (eventData.type === 'card' && eventData.cardType) {
      const resolution = resolveNewCard(events, eventData.playerId, eventData.cardType);
      matchStorage.addEvent({
        ...eventData,
        matchId: fixture.id,
        cardType: resolution.cardType,
        isSecondYellowRed: resolution.isSecondYellowRed,
      });
    } else {
      matchStorage.addEvent({
        ...eventData,
        matchId: fixture.id,
      });
    }

    loadData();
  };

  // Update Event handler
  const handleUpdateEvent = (updatedEvent: MatchEvent) => {
    // If it's a card, recheck second-yellow
    if (updatedEvent.type === 'card' && updatedEvent.cardType) {
      const otherEvents = events.filter((e) => e.id !== updatedEvent.id);
      const resolution = resolveNewCard(otherEvents, updatedEvent.playerId, updatedEvent.cardType);
      updatedEvent.cardType = resolution.cardType;
      updatedEvent.isSecondYellowRed = resolution.isSecondYellowRed;
    }

    matchStorage.updateEvent(updatedEvent);
    setEditingEvent(null);
    loadData();
  };

  // Delete Event handler
  const handleDeleteEvent = (eventId: string) => {
    matchStorage.deleteEvent(eventId);
    setEditingEvent(null);
    loadData();
  };

  // Submit Match Finalization
  const handleFinalSubmit = (passcode: string) => {
    if (!fixture) return;
    const res = matchStorage.submitMatch(fixture.id, passcode, sessionId);
    if (res.success) {
      setIsSubmitModalOpen(false);
      onNavigateToResults(fixture.id);
    } else {
      setSubmitError(res.error || 'Incorrect passcode. Try again.');
    }
  };

  if (!fixture) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center text-neutral-400 font-sans font-medium text-xs">
        Loading match details...
      </div>
    );
  }

  // Prevent any second device from opening the match while it's being recorded
  const isLockedByOtherDevice =
    (fixture.status === 'in_progress' &&
      Boolean(fixture.activeSessionId) &&
      fixture.activeSessionId !== sessionId) ||
    (fixture.status === 'available' && fixture.activeSessionId !== sessionId);

  if (isLockedByOtherDevice) {
    return (
      <div className="min-h-screen bg-[#121212] text-white flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4 text-amber-400">
          <Lock size={32} />
        </div>
        <h1 className="font-display font-extrabold text-lg text-white mb-2 uppercase tracking-wide">
          MATCH CURRENTLY RECORDING
        </h1>
        <p className="text-xs text-neutral-400 max-w-xs mb-6 font-sans">
          This match is actively being recorded on another device. Simultaneous recording from multiple devices is prevented.
        </p>
        <button
          onClick={onNavigateBack}
          className="px-6 py-2.5 bg-[#242424] hover:bg-[#2e2e2e] border border-[#383838] text-white rounded-full text-xs font-bold uppercase tracking-wider transition-colors font-sans"
        >
          RETURN TO DASHBOARD
        </button>
      </div>
    );
  }

  // Filter events for current quarter
  const quarterEvents = events.filter((e) => e.quarter === currentQuarter);
  const team1QuarterScore = score.team1QuarterScores[currentQuarter] || 0;
  const team2QuarterScore = score.team2QuarterScores[currentQuarter] || 0;

  return (
    <div className="h-screen bg-[#121212] text-white flex flex-col justify-between overflow-hidden">
      {/* Top Header & Scoreboards - Fixed at top */}
      <header className="flex-shrink-0 w-full z-10 bg-[#121212]">
        <MatchHeader
          fixture={fixture}
          onBackClick={onNavigateBack}
        />

        <div className="w-full max-w-md mx-auto px-4 pt-1">
          {/* Extra time banner if two goal lead achieved */}
          {isExtraTimeActive && etLead.clinched && (
            <div className="bg-amber-950/60 border border-amber-600/50 rounded-2xl p-2.5 mb-2 text-center text-xs font-bold text-amber-200 font-sans">
              ★ Two-goal extra time lead reached! Match is ready for final submission.
            </div>
          )}

          {/* Total Match Scoreboard centered directly on top of quarter title */}
          <TotalScoreboard team1={team1} team2={team2} score={score} />

          {/* Quarter indicator, Quarter Scoreboard bar, and Submit button */}
          <QuarterScoreboard
            quarter={currentQuarter}
            team1={team1}
            team2={team2}
            team1QuarterScore={team1QuarterScore}
            team2QuarterScore={team2QuarterScore}
            canSubmit={canSubmit}
            onSubmitClick={() => {
              setSubmitError(null);
              setIsSubmitModalOpen(true);
            }}
          />
        </div>
      </header>

      {/* Main Recording Workspace: Scoresheet Section Independently Scrollable */}
      <main className="flex-1 min-h-0 w-full max-w-md mx-auto px-4 overflow-y-auto py-2">
        <EventTimeline
          events={quarterEvents}
          team1={team1}
          team2={team2}
          selectedEventId={editingEvent?.id}
          onSelectEvent={(ev) => setEditingEvent((prev) => (prev?.id === ev.id ? null : ev))}
          readOnly={false}
        />
      </main>

      {/* Pinned Bottom Input Dock */}
      <footer className="flex-shrink-0 w-full bg-[#121212] z-40">
        <BottomDock
          events={events}
          currentQuarter={currentQuarter}
          onQuarterChange={(q) => {
            setCurrentQuarter(q);
            setEditingEvent(null);
          }}
          team1={team1}
          team2={team2}
          isExtraTimeActive={isExtraTimeActive}
          onAddEvent={handleAddEvent}
          onUpdateEvent={handleUpdateEvent}
          onDeleteEvent={handleDeleteEvent}
          editingEvent={editingEvent}
          onCancelEdit={() => setEditingEvent(null)}
        />
      </footer>

      {/* Match Submission Confirmation Modal */}
      <SubmitModal
        fixture={fixture}
        team1={team1}
        team2={team2}
        score={score}
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSubmit={handleFinalSubmit}
        error={submitError}
      />
    </div>
  );
};
