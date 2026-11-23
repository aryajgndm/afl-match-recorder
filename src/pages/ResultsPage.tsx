import React, { useState, useEffect } from 'react';
import { Fixture, MatchEvent, Quarter, Team } from '../types';
import { matchStorage } from '../lib/storage';
import { TEAMS } from '../data/teams';
import { ResultsTable } from '../components/results/ResultsTable';
import { QuarterScoreboard } from '../components/recording/QuarterScoreboard';
import { EventTimeline } from '../components/recording/EventTimeline';
import { ChevronLeft } from 'lucide-react';

interface ResultsPageProps {
  matchId: string;
  onNavigateBack: () => void;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({ matchId, onNavigateBack }) => {
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [currentQuarter, setCurrentQuarter] = useState<Quarter>('q1');

  useEffect(() => {
    const f = matchStorage.getFixtureById(matchId);
    if (f) {
      setFixture(f);
      setEvents(matchStorage.getEvents(matchId));
    }
  }, [matchId]);

  const isHistoricalPlayoff = ['po1-g1', 'po1-g2', 'po1-g3', 'po2-g1', 'po2-g2', 'po2-g3'].includes(matchId);
  if (!fixture || !fixture.result || fixture.isUnopenable || isHistoricalPlayoff) {
    return (
      <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center p-4 text-center font-sans">
        <p className="text-xs font-bold text-neutral-400 mb-4 tracking-normal">
          This match record is closed and inaccessible.
        </p>
        <button
          onClick={onNavigateBack}
          className="px-5 py-2.5 bg-[#242424] border border-[#333333] text-white rounded-full text-xs font-bold uppercase tracking-wider hover:bg-[#2e2e2e] transition-colors"
        >
          RETURN TO DASHBOARD
        </button>
      </div>
    );
  }

  const team1: Team | null = fixture.team1Id ? TEAMS[fixture.team1Id] : null;
  const team2: Team | null = fixture.team2Id ? TEAMS[fixture.team2Id] : null;
  const score = fixture.result.score;

  // Informational line: Title Case
  const seriesNameFormatted = fixture.seriesId.startsWith('po')
    ? `PLAYOFF ${fixture.seriesId.replace('po', '')}`
    : fixture.seriesId.startsWith('sf')
    ? `Semi-Final ${fixture.seriesId.replace('sf', '')}`
    : 'Finals';

  const quarterEvents = events.filter((e) => e.quarter === currentQuarter);
  const team1QuarterScore = score.team1QuarterScores[currentQuarter] || 0;
  const team2QuarterScore = score.team2QuarterScores[currentQuarter] || 0;

  const quartersList: Quarter[] = ['q1', 'q2', 'q3', 'q4'];
  if (score.isExtraTime) {
    quartersList.push('et');
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col justify-between pb-28 font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#121212]/95 backdrop-blur-md border-b border-[#262626] px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateBack}
              className="p-1 -ml-1 text-neutral-400 hover:text-white rounded-lg transition-colors"
              title="Back to Dashboard"
            >
              <ChevronLeft size={24} />
            </button>
            {/* Informational line: GAME and PLAYOFF capital */}
            <span className="text-xs font-bold text-neutral-400 tracking-wide font-sans">
              GAME {fixture.gameNumber} · {seriesNameFormatted}
            </span>
          </div>

          <div className="text-xs font-medium text-neutral-400 normal-case">
            {fixture.date}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-4">
        {/* Box Score Summary Table */}
        <ResultsTable score={score} team1={team1} team2={team2} />

        {/* Quarter indicator & Quarter Scoreboard */}
        <div className="mt-2">
          <QuarterScoreboard
            quarter={currentQuarter}
            team1={team1}
            team2={team2}
            team1QuarterScore={team1QuarterScore}
            team2QuarterScore={team2QuarterScore}
            isReadOnly={true}
          />
        </div>

        {/* Quarter Events List with zebra striping */}
        <div className="mt-2">
          <EventTimeline
            events={quarterEvents}
            team1={team1}
            team2={team2}
            readOnly={true}
          />
        </div>
      </main>

      {/* Fixed Bottom Quarter Navigation - Fills width of the screen at the bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#121212] border-t border-[#262626] rounded-t-3xl p-4 max-w-md mx-auto">
        <div className="w-full flex items-center justify-between bg-[#242424] p-1 rounded-full border border-[#333333]">
          {quartersList.map((q) => {
            const isActive = currentQuarter === q;
            const label = q === 'et' ? 'ET' : q.toUpperCase();
            return (
              <button
                key={q}
                type="button"
                onClick={() => setCurrentQuarter(q)}
                className={`flex-1 py-2 text-xs font-bold tracking-wider rounded-full transition-all uppercase text-center ${
                  isActive
                    ? 'bg-[#383838] text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
