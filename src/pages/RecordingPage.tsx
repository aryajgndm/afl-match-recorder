import React, { useState, useEffect, useMemo } from 'react';
import { Fixture, MatchEvent, Quarter, Team } from '../types';
import { matchStorage } from '../lib/storage';
import { calculateMatchScore, checkExtraTimeTwoGoalLead } from '../lib/scoring';
import { resolveNewCard } from '../lib/disciplinary';
import { TEAMS } from '../data/teams';
import { MatchHeader } from '../components/recording/MatchHeader';
import { TotalScoreboard } from '../components/recording/TotalScoreboard';
import { QuarterScoreboard } from '../components/recording/QuarterScoreboard';
import { EventTimeline } from '../components/recording/EventTimeline';
import { BottomDock } from '../components/recording/BottomDock';
import { SubmitModal } from '../components/recording/SubmitModal';

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

  // Lock heartbeat: ping every 30 seconds
  useEffect(() => {
    if (!fixture || fixture.status !== 'in_progress') return;

    const interval = setInterval(() => {
      matchStorage.sendHeartbeat(matchId, sessionId);
    }, 30 * 1000);

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
      const newEv = matchStorage.addEvent({
        ...eventData,
        matchId: fixture.id,
        cardType: resolution.cardType,
        isSecondYellowRed: resolution.isSecondYellowRed,
      });
      setEvents((prev) => [...prev, newEv]);
      return;
    }

    const newEv = matchStorage.addEvent({
      ...eventData,
      matchId: fixture.id,
    });
    setEvents((prev) => [...prev, newEv]);
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
    setEvents((prev) => prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e)));
    setEditingEvent(null);
  };

  // Delete Event handler
  const handleDeleteEvent = (eventId: string) => {
    matchStorage.deleteEvent(eventId);
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    setEditingEvent(null);
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
      <div className="min-h-screen bg-[#0c0f14] flex items-center justify-center text-slate-400">
        Loading match details...
      </div>
    );
  }

  // Filter events for current quarter
  const quarterEvents = events.filter((e) => e.quarter === currentQuarter);
  const team1QuarterScore = score.team1QuarterScores[currentQuarter] || 0;
  const team2QuarterScore = score.team2QuarterScores[currentQuarter] || 0;

  return (
    <div className="min-h-screen bg-[#0c0f14] text-slate-100 flex flex-col justify-between pb-64">
      {/* Top Header */}
      <MatchHeader
        fixture={fixture}
        canSubmit={canSubmit}
        onSubmitClick={() => {
          setSubmitError(null);
          setIsSubmitModalOpen(true);
        }}
        onBackClick={onNavigateBack}
      />

      {/* Main Recording Workspace */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-1">
        {/* Extra time banner if two goal lead achieved */}
        {isExtraTimeActive && etLead.clinched && (
          <div className="bg-amber-950/70 border border-amber-600/70 rounded-2xl p-2.5 mb-2 text-center text-xs font-bold text-amber-200 animate-pulse">
            ★ Two-goal extra time lead reached! Match is ready for final submission.
          </div>
        )}

        {/* Total Match Scoreboard (Moved from cramped navbar) */}
        <TotalScoreboard team1={team1} team2={team2} score={score} />

        {/* Quarter indicator & Quarter Scoreboard */}
        <QuarterScoreboard
          quarter={currentQuarter}
          team1={team1}
          team2={team2}
          team1QuarterScore={team1QuarterScore}
          team2QuarterScore={team2QuarterScore}
        />

        {/* Events Timeline */}
        <div className="mt-2">
          <EventTimeline
            events={quarterEvents}
            team1={team1}
            team2={team2}
            selectedEventId={editingEvent?.id}
            onSelectEvent={(ev) => setEditingEvent(ev)}
            readOnly={false}
          />
        </div>
      </main>

      {/* Fixed Bottom Input Dock */}
      <BottomDock
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
