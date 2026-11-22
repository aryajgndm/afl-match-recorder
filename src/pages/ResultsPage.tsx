import React, { useState, useEffect } from 'react';
import { Fixture, MatchEvent, Quarter, Team } from '../types';
import { matchStorage } from '../lib/storage';
import { TEAMS } from '../data/teams';
import { ResultsTable } from '../components/results/ResultsTable';
import { QuarterScoreboard } from '../components/recording/QuarterScoreboard';
import { EventTimeline } from '../components/recording/EventTimeline';
import { exportMatchScoresheetPdf } from '../lib/pdfExport';
import { PasscodeModal } from '../components/common/PasscodeModal';
import { ChevronLeft, FileDown } from 'lucide-react';

interface ResultsPageProps {
  matchId: string;
  onNavigateBack: () => void;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({ matchId, onNavigateBack }) => {
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [currentQuarter, setCurrentQuarter] = useState<Quarter>('q1');
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem(`afl_unlocked_${matchId}`) === 'true';
  });
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  useEffect(() => {
    const f = matchStorage.getFixtureById(matchId);
    if (f) {
      setFixture(f);
      setEvents(matchStorage.getEvents(matchId));
    }
  }, [matchId]);

  const handleUnlockSubmit = (code: string) => {
    if (matchStorage.validatePasscode(matchId, code)) {
      sessionStorage.setItem(`afl_unlocked_${matchId}`, 'true');
      setIsUnlocked(true);
      setPasscodeError(null);
    } else {
      setPasscodeError('Incorrect passcode. Try again.');
    }
  };

  if (!fixture || !fixture.result) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-4 text-center font-sans">
        <p className="text-xs font-bold text-slate-500 mb-4 tracking-normal">
          No finalized results available for this match yet.
        </p>
        <button
          onClick={onNavigateBack}
          className="px-5 py-2.5 bg-slate-900 text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-md hover:bg-slate-800 transition-colors"
        >
          RETURN TO DASHBOARD
        </button>
      </div>
    );
  }

  // Data Team Passcode Gate
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
        <PasscodeModal
          fixture={fixture}
          isOpen={true}
          onClose={onNavigateBack}
          onSubmit={handleUnlockSubmit}
          error={passcodeError}
          buttonColor="green"
          buttonText="VIEW RESULTS"
          subtitle="Enter the passcode to continue."
        />
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

  const handleExportPdf = () => {
    exportMatchScoresheetPdf(fixture, events, team1, team2);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-900 flex flex-col justify-between pb-28 font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-xs">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateBack}
              className="p-1 -ml-1 text-slate-500 hover:text-black rounded-lg transition-colors"
              title="Back to Dashboard"
            >
              <ChevronLeft size={24} />
            </button>
            {/* Informational line: GAME and PLAYOFF capital */}
            <span className="text-xs font-bold text-slate-500 tracking-wide font-sans">
              GAME {fixture.gameNumber} · {seriesNameFormatted}
            </span>
          </div>

          <div className="text-xs font-medium text-slate-500 normal-case">
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

      {/* Fixed Bottom Quarter Navigation & PDF Export - Colors: #121212 and #242424 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#121212] border-t border-[#262626] rounded-t-3xl p-4 max-w-md mx-auto">
        <div className="flex items-center justify-between gap-3">
          {/* Quarter Pills */}
          <div className="flex items-center gap-1.5 bg-[#242424] p-1 rounded-full border border-[#333333]">
            {quartersList.map((q) => {
              const isActive = currentQuarter === q;
              const label = q === 'et' ? 'ET' : q.toUpperCase();
              return (
                <button
                  key={q}
                  type="button"
                  onClick={() => setCurrentQuarter(q)}
                  className={`px-3.5 py-1.5 text-xs font-bold tracking-wider rounded-full transition-all uppercase ${
                    isActive
                      ? 'bg-white text-black'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Export PDF Button */}
          <button
            onClick={handleExportPdf}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all text-white rounded-full font-bold text-xs tracking-wider flex items-center gap-2 uppercase whitespace-nowrap font-sans"
          >
            <FileDown size={16} />
            <span>EXPORT PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
